import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {parseQuery,publicRecord,searchRegistry,QueryError} from '../src/server/registry.mjs';
import {GET} from '../api/registry.js';
const fields=['ein','name','alias','city','state','ntee','foundation','ruling','status'];
const row=(ein,name,city,state,ntee='K31',alias='')=>[ein,name,alias,city,state,ntee,'15','200101','01'];
const fixture=[row('012345678','ALPHA FOOD BANK','BROOKLYN','NY'),row('112345678','BETA FOOD BANK','OAKLAND','CA'),row('212345678','GAMMA COMMUNITY CENTER','BUFFALO','NY','S20','LOCAL FOOD NETWORK')];
const manifest={source:'IRS test fixture',sourceUrl:'https://www.irs.gov/',sourcePostedAt:'2026-09-08',recordCount:3,states:{NY:2,CA:1},causes:{K:2,S:1},stateCauses:{'NY:K':1,'NY:S':1,'CA:K':1}};
function database(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE records (ein TEXT,name TEXT,alias TEXT,city TEXT,state TEXT,ntee TEXT,foundation TEXT,ruling TEXT,status TEXT)');for(const r of fixture)db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?,?,?)').run(...r);return db;}
test('invalid and path-like filters are rejected before opening the snapshot',()=>{
  for(const query of ['state=../../private','cause=../','q=aa','q=12','offset=-1','offset=5001','limit=51','limit=0','offset=NaN','q='+('a'.repeat(161))])assert.throws(()=>parseQuery(new URLSearchParams(query),manifest),QueryError);
});
test('all terms search names, aliases and cities; EIN queries preserve leading zeros',async()=>{
  const db=database();try{
    for(const [q,ein] of [['food ban brook','012345678'],['local food','212345678'],['01-2345678','012345678']]){
      const result=await searchRegistry(new URLSearchParams({q}),{database:db,manifest});
      assert.equal(result.total,1);assert.equal(result.results[0].ein,ein);
    }
  }finally{db.close();}
});
test('registry identity never becomes a systemic score or a personal address',()=>{
  const record=publicRecord(Object.fromEntries(fields.map((k,i)=>[k,fixture[0][i]])));
  assert.equal(record.ein,'012345678');assert.equal(record.systemicAssessment,'pending');assert.equal(record.systemicScores,null);
  assert.equal(record.organizationType,'Publicly supported charity');assert.ok(!('street' in record));assert.ok(!('officer' in record));
});
test('SQL parameters keep search content inert and filters exact',async()=>{
  const db=database();try{
    const safe=await searchRegistry(new URLSearchParams({q:"food' OR 1=1 --"}),{database:db,manifest});assert.equal(safe.total,0);
    const filtered=await searchRegistry(new URLSearchParams('q=food&state=NY&cause=K'),{database:db,manifest});assert.equal(filtered.total,1);assert.equal(filtered.results[0].ein,'012345678');
  }finally{db.close();}
});
test('search counts all matches and paginates deterministically without duplication',async()=>{
  const db=database();try{
    const first=await searchRegistry(new URLSearchParams('q=food+bank&limit=1'),{database:db,manifest});
    const second=await searchRegistry(new URLSearchParams('q=food+bank&limit=1&offset=1'),{database:db,manifest});
    assert.equal(first.total,2);assert.equal(first.hasMore,true);assert.equal(second.hasMore,false);
    assert.equal(first.results[0].ein,'012345678');assert.equal(second.results[0].ein,'112345678');
  }finally{db.close();}
});
test('published registry reconciles source, subset, state/cause totals and bounded artifact parts',async()=>{
  const m=JSON.parse(await readFile('data/registry/manifest.json','utf8'));const sum=obj=>Object.values(obj).reduce((a,b)=>a+b,0);
  assert.ok(m.recordCount>1_000_000 && m.recordCount<m.sourceRecordCount);
  assert.equal(sum(m.states),m.recordCount);assert.equal(sum(m.causes),m.recordCount);assert.equal(sum(m.stateCauses),m.recordCount);
  assert.equal(m.regionalSources.length,4);assert.ok(m.compressedBytes<180_000_000);assert.ok(m.databaseBytes<400_000_000);
  assert.equal(m.artifactParts.reduce((sum,p)=>sum+p.bytes,0),m.compressedBytes);
  for(const source of m.regionalSources){assert.match(source.url,/^https:\/\/www\.irs\.gov\/pub\/irs-soi\/eo[1-4]\.csv$/);assert.match(source.sha256,/^[a-f0-9]{64}$/);}
  for(const p of m.artifactParts){assert.ok(p.bytes<=32_000_000);assert.match(p.sha256,/^[a-f0-9]{64}$/);}
});
test('real snapshot is checksummed, read-only and searchable with exact combined filters',async()=>{
  const result=await searchRegistry(new URLSearchParams('q=food+bank&state=NY&cause=K&limit=5'));
  assert.ok(result.total>=3);
  assert.equal(result.results.length,Math.min(result.total,5));
  assert.ok(result.results.some(r=>r.ein==='222816988'));
  for(const r of result.results){assert.match(r.ein,/^\d{9}$/);assert.equal(r.state,'NY');assert.equal(r.ntee[0],'K');assert.equal(r.systemicScores,null);}
  const browse=await searchRegistry(new URLSearchParams('state=CA&cause=C&limit=5'));
  assert.ok(browse.total>0);for(const r of browse.results){assert.equal(r.state,'CA');assert.equal(r.ntee[0],'C');}
});
test('HTTP endpoint gives useful validation errors for unsupported filters',async()=>{
  const response=await GET(new Request('https://example.test/api/registry?state=invalid'));
  assert.equal(response.status,400);assert.match((await response.json()).error,/state/);
});
