import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {method,presets} from '../src/scoring.mjs';
import {hasVerifiedOpenSource} from '../src/focus.mjs';
import {inspectReviewLedger} from '../src/review-ledger.mjs';
import {inspectShareMp4} from '../src/share-motion.mjs';
const routes=JSON.parse(await readFile('dist/routes.json','utf8'));
const seen=new Set(),origin=process.env.CHECK_ORIGIN;
const registry=JSON.parse(await readFile('data/registry/manifest.json','utf8'));
const dataset=JSON.parse(await readFile('data/charities.json','utf8'));
const motionManifest=JSON.parse(await readFile('social-motion/assessment-motion/manifest.json','utf8'));
const motionPages=new Map(motionManifest.pages.map(p=>[p.path,p]));
if(motionManifest.creativeReview?.status!=='representative_user_approved'||motionPages.size!==dataset.charities.length||motionManifest.pages.length!==motionPages.size)throw Error('Missing reviewed assessment motion coverage');
const videoHashes=new Set();let videoCount=0;
const ledger=JSON.parse(await readFile('dist/api/v1/review-ledger.json','utf8'));
const ledgerSummary=inspectReviewLedger(ledger,dataset);
if(JSON.stringify(ledger.summary)!==JSON.stringify(ledgerSummary))throw new Error('Stale public review-ledger summary');
const openDataHtml=await readFile('dist/data/index.html','utf8');
if(!openDataHtml.includes('/api/v1/review-ledger.json')||!openDataHtml.includes(`${ledgerSummary.included} of ${ledgerSummary.target}`))throw new Error('Missing public goal progress and review ledger');
for(const item of ledger.progressChecklist)if(!openDataHtml.includes(`data-goal-check="${item.id}"`))throw Error('Missing visible tracker checklist item: '+item.id);
for(const [count,noun] of [[ledgerSummary.deferred,'deferred candidate'],[ledgerSummary.excluded,'duplicate-project exclusion']]){
  if(!openDataHtml.includes(`${count} ${noun}${count===1?'':'s'}`))throw new Error('Stale progress count label');
}
const homeHtml=await readFile('dist/index.html','utf8');
if(!homeHtml.includes('id="focus-filter"')||!homeHtml.includes('not verified adoption'))throw new Error('Missing focused exploration or alignment limits');
if(!homeHtml.includes('<option value="opensource">Open-source tools · license checked</option>')||!homeHtml.includes('not a security or impact audit'))throw new Error('Missing open-source view or verification limits');
if(routes.filter(r=>r.path.startsWith('/charities/')).length!==dataset.charities.length)throw new Error('Assessment route/count mismatch');
const methodHtml=await readFile('dist/methodology/index.html','utf8');
if(!methodHtml.includes(method.source.url)||!methodHtml.includes('not a numerical charity-rating formula'))throw new Error('Missing practice provenance/interpretation');
for(const path of ['/','/funders/']){
  const html=await readFile(`dist${path}index.html`,'utf8');
  if(!html.includes('<option value="systemic">Systemic Altruism practice (default)</option>')||!html.includes('<option value="balanced">Original balanced (v0.1)</option>'))throw new Error(`Missing default or legacy lens: ${path}`);
}
for(const c of dataset.charities){
  const html=await readFile(`dist/charities/${c.id}/index.html`,'utf8');
  if(!html.includes(`Axis review: ${c.lastReviewed}`))throw new Error(`Profile review date mismatch: ${c.id}`);
  if(c.tooling&&!html.includes('Tools &amp; support for charities'))throw new Error(`Missing tooling rationale: ${c.id}`);
  if(c.checklistAlignment&&!html.includes('Explicit checklist adoption: not verified'))throw new Error(`Missing mapping limits: ${c.id}`);
  if(hasVerifiedOpenSource(c))for(const p of c.openSource.projects){
    if(!html.includes(p.licenseBlobSha)||!html.includes(p.licenseUrl)||!html.includes(p.repositoryUrl)||!html.includes('not a security audit'))throw new Error(`Missing scoped open-source evidence: ${c.id}`);
  }
  for(const s of c.sources)if(!html.includes(`checked ${s.accessedAt}`))throw new Error(`Source review date mismatch: ${c.id}`);
}
for(const path of ['/','/directory/','/data/']){
  const html=await readFile(`dist${path}index.html`,'utf8');
  if(!html.includes(String(dataset.charities.length)))throw new Error(`Stale assessment count: ${path}`);
}
if(!routes.some(r=>r.path==='/directory/'))throw new Error('Missing public charity directory');
for(const path of ['/funders/','/toolkit/'])if(!routes.some(r=>r.path===path))throw new Error(`Missing decision tool: ${path}`);
if(registry.recordCount<1_000_000)throw new Error('Incomplete charity registry');
for(const r of routes){
  const html=await readFile(`dist${r.path}index.html`,'utf8');
  for(const key of ['canonical','og:title','og:url','og:image','og:image:type','og:image:width','og:image:height','og:image:alt','twitter:card','twitter:image','twitter:image:alt'])if(!html.includes(key))throw new Error(`Missing ${key}: ${r.path}`);
  const img=await readFile(`dist/share/${r.card}.png`),hash=createHash('sha256').update(img).digest('hex');
  if(seen.has(hash))throw new Error(`Duplicate share card: ${r.path}`);seen.add(hash);
  if(img.readUInt32BE(16)!==1200||img.readUInt32BE(20)!==630||img.length>1_000_000)throw new Error(`Invalid share card dimensions/size: ${r.path}`);
  const imageUrl=html.match(/property="og:image" content="([^"]+)"/)?.[1];
  if(!imageUrl?.startsWith('https://')||!imageUrl.endsWith(`/share/${r.card}.png`))throw new Error(`Invalid image URL: ${r.path}`);
  if(!html.includes(`name="twitter:image" content="${imageUrl}"`))throw new Error(`OG/Twitter mismatch: ${r.path}`);
  let videoUrl,videoBytes,videoHash;
  if(r.path.startsWith('/charities/')){
    const p=motionPages.get(r.path);
    if(!p||p.still!==`public/share/${r.card}.png`||p.stillSha256!==hash||p.file!==`charities-${r.path.split('/')[2]}-connections-v1.mp4`)throw Error('Stale still/video pairing: '+r.path);
    videoUrl=new URL('/assets/assessment-motion/'+p.file,new URL(imageUrl).origin).href;
    videoBytes=await readFile('dist/assets/assessment-motion/'+p.file);videoHash=createHash('sha256').update(videoBytes).digest('hex');
    const info=inspectShareMp4(videoBytes);
    if(videoHash!==p.videoSha256||videoHashes.has(videoHash)||videoBytes.length!==p.bytes||videoBytes.length>2_000_000||info.width!==1200||info.height!==630||info.duration!==6||info.fps!==24||info.frames!==144||p.pixelFormat!=='yuv420p')throw Error('Invalid or duplicate assessment video: '+r.path);
    for(const [key,value] of [['og:video',videoUrl],['og:video:secure_url',videoUrl],['og:video:type','video/mp4'],['og:video:width','1200'],['og:video:height','630']])if(!html.includes(`property="${key}" content="${value}"`))throw Error('Missing video metadata: '+r.path);
    if(!html.includes(`name="twitter:player:stream" content="${videoUrl}"`))throw Error('Missing direct stream: '+r.path);
    videoHashes.add(videoHash);videoCount++;
  }
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)){
    let p=match[1];if(p==='')continue;if(p.endsWith('/'))p+='index.html';
    await access(`dist${p}`).catch(()=>{throw new Error(`Broken internal link ${p} in ${r.path}`)});
  }
  if(origin){
    const response=await fetch(origin+r.path);if(!response.ok)throw new Error(`Live page ${r.path}: ${response.status}`);
    const body=await response.text();if(!body.includes(`<title>${r.title.replaceAll('&','&amp;')}`))throw new Error(`Wrong live page: ${r.path}`);
    if(!body.includes(`property="og:image" content="${imageUrl}"`)||!body.includes(`name="twitter:image" content="${imageUrl}"`))throw Error('Wrong live image metadata: '+r.path);
    if(videoUrl){
      for(const [key,value] of [['og:video',videoUrl],['og:video:secure_url',videoUrl],['og:video:type','video/mp4'],['og:video:width','1200'],['og:video:height','630']])if(!body.includes(`property="${key}" content="${value}"`))throw Error('Wrong live video metadata: '+r.path);
      if(!body.includes(`name="twitter:player:stream" content="${videoUrl}"`))throw Error('Wrong live stream metadata: '+r.path);
      const mediaPath=new URL(videoUrl).pathname,media=await fetch(origin+mediaPath);
      if(!media.ok||!media.headers.get('content-type')?.includes('video/mp4')||media.headers.get('content-disposition')?.includes('attachment'))throw Error('Video is not publicly playable: '+r.path);
      const liveVideo=Buffer.from(await media.arrayBuffer());
      if(createHash('sha256').update(liveVideo).digest('hex')!==videoHash)throw Error('Wrong live video bytes: '+r.path);
      const range=await fetch(origin+mediaPath,{headers:{Range:'bytes=0-63'}}),rangeBytes=Buffer.from(await range.arrayBuffer());
      if(range.status!==206||range.headers.get('content-range')!==`bytes 0-63/${videoBytes.length}`||!rangeBytes.equals(videoBytes.subarray(0,64)))throw Error('Invalid video byte-range response: '+r.path);
    }
    const liveImg=await fetch(origin+`/share/${r.card}.png`);if(!liveImg.ok||!liveImg.headers.get('content-type')?.includes('image/png'))throw new Error(`Live image: ${r.path}`);
    const bytes=Buffer.from(await liveImg.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error(`Live card content mismatch: ${r.path}`);
  }
}
if(origin){
  for(const file of ['app.mjs','scoring.mjs','assessment-data.mjs','focus.mjs','funders.mjs','toolkit.mjs','decision-tools.mjs','workbenches.css','api/v1/charities.json','api/v1/review-ledger.json']){
    const response=await fetch(origin+'/'+file);
    if(!response.ok)throw new Error(`Live tool asset missing: ${file}`);
    const local=await readFile('dist/'+file),live=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(local).digest('hex')!==createHash('sha256').update(live).digest('hex'))throw new Error(`Live tool asset mismatch: ${file}`);
  }
  const liveData=await (await fetch(origin+'/api/v1/charities.json')).json();
  if(liveData.charities.length!==dataset.charities.length||JSON.stringify(liveData.weightingMethod.weights)!==JSON.stringify(presets[method.defaultPreset]))throw new Error('Live assessment/default weights mismatch');
  const response=await fetch(origin+'/api/registry?q=food+bank&state=NY&cause=K&limit=3');
  if(!response.ok)throw new Error(`Live registry: ${response.status}`);
  const result=await response.json();
  if(result.registryTotal!==registry.recordCount||result.results.length!==3||result.total<3)throw new Error('Live registry count/search mismatch');
  for(const row of result.results)if(row.state!=='NY'||row.ntee[0]!=='K'||row.systemicScores!==null)throw new Error('Live registry filter/assessment mismatch');
}
console.log(`${routes.length} pages: internal links, metadata and unique share images; ${videoCount} paired assessment videos verified${origin?' live at '+origin:''}.`);
