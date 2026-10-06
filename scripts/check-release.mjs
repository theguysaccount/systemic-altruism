import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const routes=JSON.parse(await readFile('dist/routes.json','utf8'));
const seen=new Set(),origin=process.env.CHECK_ORIGIN;
for(const r of routes){
  const html=await readFile(`dist${r.path}index.html`,'utf8');
  for(const key of ['canonical','og:title','og:url','og:image','og:image:width','og:image:height','og:image:alt','twitter:card','twitter:image','twitter:image:alt'])if(!html.includes(key))throw new Error(`Missing ${key}: ${r.path}`);
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
console.log(`${routes.length} pages: internal links, metadata and unique share images verified${origin?' live at '+origin:''}.`);
