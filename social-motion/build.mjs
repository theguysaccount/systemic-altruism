import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {injectShareVideo,inspectShareMp4} from '../src/share-motion.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const output='dist',home=path.join(output,'index.html');
const writeVideoMeta=(file,asset)=>{
  const html=fs.readFileSync(file,'utf8'),pageUrl=html.match(/property="og:url" content="([^"]+)"/)?.[1];
  if(!pageUrl)throw Error('Missing page identity: '+file);
  fs.writeFileSync(file,injectShareVideo(html,new URL(asset,new URL(pageUrl).origin).href));
};
// Preserve the existing homepage artwork and encoded video.
fs.mkdirSync(path.join(output,'assets'),{recursive:true});
fs.copyFileSync('social-motion/home-motion-20261024.mp4',path.join(output,'assets/home-motion-20261024.mp4'));
writeVideoMeta(home,'/assets/home-motion-20261024.mp4');
const manifest=JSON.parse(fs.readFileSync('social-motion/assessment-motion/manifest.json','utf8'));
const routes=JSON.parse(fs.readFileSync('dist/routes.json','utf8')).filter(r=>r.path.startsWith('/charities/'));
if(manifest.creativeReview?.status!=='representative_user_approved'||manifest.pages.length!==routes.length)throw Error('Unreviewed or incomplete assessment motion manifest');
const seen=new Set(),outdir=path.join(output,'assets/assessment-motion');fs.mkdirSync(outdir,{recursive:true});
for(const route of routes){
  const p=manifest.pages.find(p=>p.path===route.path);
  if(!p||seen.has(p.path)||p.still!=='public/share/'+route.card+'.png'||p.file!=='charities-'+route.path.split('/')[2]+'-connections-v1.mp4')throw Error('Missing or mismatched motion route: '+route.path);
  seen.add(p.path);
  const bytes=fs.readFileSync('social-motion/assessment-motion/'+p.file),actual=inspectShareMp4(bytes);
  if(hash(bytes)!==p.videoSha256||hash(fs.readFileSync(p.still))!==p.stillSha256||JSON.stringify(actual)!==JSON.stringify(Object.fromEntries(Object.keys(actual).map(k=>[k,p[k]]))))throw Error('Stale motion/artwork pairing: '+route.path);
  fs.copyFileSync('social-motion/assessment-motion/'+p.file,path.join(outdir,p.file));
  writeVideoMeta(path.join(output,route.path,'index.html'),'/assets/assessment-motion/'+p.file);
}
console.log('Added page-specific video metadata and checked assets for '+routes.length+' assessment pages; still fallbacks preserved.');
