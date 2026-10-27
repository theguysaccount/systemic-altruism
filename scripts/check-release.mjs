import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {method,presets} from '../src/scoring.mjs';
const routes=JSON.parse(await readFile('dist/routes.json','utf8'));
const seen=new Set(),origin=process.env.CHECK_ORIGIN;
const registry=JSON.parse(await readFile('data/registry/manifest.json','utf8'));
const dataset=JSON.parse(await readFile('data/charities.json','utf8'));
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
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)){
    let p=match[1];if(p==='')continue;if(p.endsWith('/'))p+='index.html';
    await access(`dist${p}`).catch(()=>{throw new Error(`Broken internal link ${p} in ${r.path}`)});
  }
  if(origin){
    const response=await fetch(origin+r.path);if(!response.ok)throw new Error(`Live page ${r.path}: ${response.status}`);
    const body=await response.text();if(!body.includes(`<title>${r.title.replaceAll('&','&amp;')}`))throw new Error(`Wrong live page: ${r.path}`);
    const liveImg=await fetch(origin+`/share/${r.card}.png`);if(!liveImg.ok||!liveImg.headers.get('content-type')?.includes('image/png'))throw new Error(`Live image: ${r.path}`);
    const bytes=Buffer.from(await liveImg.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error(`Live card content mismatch: ${r.path}`);
  }
}
if(origin){
  for(const file of ['app.mjs','scoring.mjs','funders.mjs','toolkit.mjs','decision-tools.mjs','workbenches.css','api/v1/charities.json']){
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
console.log(`${routes.length} pages: internal links, metadata and unique share images verified${origin?' live at '+origin:''}.`);
