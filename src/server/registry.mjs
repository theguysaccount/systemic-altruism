import {readFile,mkdtemp,rename,rm,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createGunzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {Transform,Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {causeLabels,foundationLabels,normalize} from '../registry-labels.mjs';

export class QueryError extends Error {}
export function parseQuery(params,manifest) {
  const q=(params.get('q')||'').trim();
  const state=(params.get('state')||'').toUpperCase(),cause=(params.get('cause')||'').toUpperCase();
  if(q.length>160)throw new QueryError('Please use a search of 160 characters or fewer.');
  if(state && !Object.hasOwn(manifest.states,state))throw new QueryError('Choose a listed state.');
  if(cause && !Object.hasOwn(manifest.causes,cause))throw new QueryError('Choose a listed cause classification.');
  const integer=(name,fallback,max)=>{
    const raw=params.get(name);if(raw===null)return fallback;
    if(!/^\d+$/.test(raw)||Number(raw)>max)throw new QueryError(`Invalid ${name}.`);
    return Number(raw);
  };
  const offset=integer('offset',0,5000),limit=integer('limit',25,50);
  if(!limit)throw new QueryError('Limit must be between 1 and 50.');
  const ein=/^[\d -]+$/.test(q)?q.replace(/[^0-9]/g,''):null;
  const terms=ein?[]:normalize(q).split(' ').filter(Boolean);
  if(q && !(ein?.length>=3) && !terms.some(t=>t.length>=3))throw new QueryError('Enter at least three letters, or three EIN digits.');
  if(ein?.length>9 || terms.length>12)throw new QueryError('Please refine your search.');
  return {q,state,cause,offset,limit,ein,terms};
}
export function publicRecord(row) {
  const {ein,name,alias:alternateName,city,state,ntee,foundation:foundationCode,ruling:rulingDate,status:statusCode}=row;
  return {ein,name,alternateName,city,state,ntee,foundationCode,rulingDate,statusCode,
    category:causeLabels[ntee?.[0]]||causeLabels['?'],
    organizationType:foundationLabels[foundationCode]||'501(c)(3) organization',
    systemicAssessment:'pending',systemicScores:null};
}
let snapshotPromise;
async function openSnapshot(root,manifest) {
  // Only the immutable public snapshot is cached. No visitor data is persisted.
  // Vercel's documented /tmp space is temporary; every cold instance can rebuild it.
  const file=join(tmpdir(),'systemic-altruism-'+manifest.databaseSha256+'.sqlite');
  const existing=await stat(file).catch(()=>null);
  if(existing?.size!==manifest.databaseBytes) {
    const dir=await mkdtemp(join(tmpdir(),'sa-snapshot-'));
    const partial=join(dir,'registry.sqlite');let bytes=0;
    const hash=createHash('sha256');
    const verifier=new Transform({transform(chunk,encoding,done){
      bytes+=chunk.length;
      if(bytes>manifest.databaseBytes||bytes>400_000_000){done(new Error('Snapshot exceeds size bound'));return;}
      hash.update(chunk);done(null,chunk);
    }});
    try {
      const parts=manifest.artifactParts;
      if(!Array.isArray(parts)||!parts.length||parts.length>6||parts.some(p=>!/^registry-[0-9]{2}\.gzpart$/.test(p.name)))throw new Error('Invalid snapshot package');
      const compressed=Readable.from((async function*(){for(const part of parts){for await(const chunk of createReadStream(join(root,part.name)))yield chunk;}})());
      await pipeline(compressed,createGunzip(),verifier,createWriteStream(partial,{flags:'wx'}));
      if(bytes!==manifest.databaseBytes||hash.digest('hex')!==manifest.databaseSha256)throw new Error('Snapshot checksum mismatch');
      await rename(partial,file);
    } finally {await rm(dir,{recursive:true,force:true});}
  }
  const db=new DatabaseSync(file,{readOnly:true});
  db.exec('PRAGMA query_only=ON; PRAGMA cache_size=-16384');
  return db;
}
export function queryRegistry(db,query,manifest) {
  const clauses=[],bindings=[];
  if(query.state){clauses.push('state = ?');bindings.push(query.state);}
  if(query.cause){clauses.push("(CASE WHEN substr(ntee,1,1) BETWEEN 'A' AND 'Z' THEN substr(ntee,1,1) ELSE '?' END) = ?");bindings.push(query.cause);}
  if(query.ein){clauses.push('ein BETWEEN ? AND ?');bindings.push(query.ein.padEnd(9,'0'),query.ein.padEnd(9,'9'));}
  for(const term of query.terms){clauses.push("lower(name || ' ' || alias || ' ' || city) LIKE ?");bindings.push('%'+term+'%');}
  const where=clauses.length?' WHERE '+clauses.join(' AND '):'';
  const {q,state,cause}=query;
  const total=q?db.prepare('SELECT count(*) AS n FROM records'+where).get(...bindings).n:
    !state&&!cause?manifest.recordCount:state&&cause?(manifest.stateCauses[state+':'+cause]||0):state?manifest.states[state]:(manifest.causes[cause]||0);
  const rows=db.prepare('SELECT ein,name,alias,city,state,ntee,foundation,ruling,status FROM records'+where+' ORDER BY name,ein LIMIT ? OFFSET ?').all(...bindings,query.limit,query.offset);
  return {source:manifest.source,sourceUrl:manifest.sourceUrl,sourcePostedAt:manifest.sourcePostedAt,
    registryTotal:manifest.recordCount,total,offset:query.offset,limit:query.limit,
    hasMore:query.offset+rows.length<total && query.offset+query.limit<=5000,
    refineRequired:total>5000 && query.offset+query.limit>5000,
    order:'Name, then EIN. Registry records have no systemic-impact ranking.',results:rows.map(publicRecord)};
}
export async function searchRegistry(params,{root=join(process.cwd(),'data/registry'),manifest,database,signal}={}) {
  manifest ||= JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  const query=parseQuery(params,manifest);
  if(signal?.aborted)throw new Error('Request cancelled');
  if(!database){
    snapshotPromise ||= openSnapshot(root,manifest).catch(error=>{snapshotPromise=null;throw error;});
    database=await snapshotPromise;
  }
  if(signal?.aborted)throw new Error('Request cancelled');
  return queryRegistry(database,query,manifest);
}
