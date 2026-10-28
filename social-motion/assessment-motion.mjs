// Reproduce the human-reviewed representative. No camera/text/logo animation.
// Generate locally; hosting builds only copy committed, checked assets.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {inspectShareMp4} from '../src/share-motion.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const routes=JSON.parse(readFileSync('dist/routes.json','utf8')).filter(r=>r.path.startsWith('/charities/'));
const output='social-motion/assessment-motion';mkdirSync(output,{recursive:true});
const append=process.argv.includes('--append'),manifestPath=output+'/manifest.json';
const previous=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
if(previous&&!append)throw Error('Existing motion release: use --append to preserve reviewed assets and generate only new routes.');
if(append&&(!previous||previous.treatment!=='assessment-connections-v1'||previous.creativeReview?.status!=='representative_user_approved'))throw Error('Append requires the existing approved treatment manifest.');
const previousPages=new Map((previous?.pages||[]).map(p=>[p.path,p]));
if(previousPages.size!==(previous?.pages.length||0)||[...previousPages.keys()].some(path=>!routes.some(r=>r.path===path)))throw Error('Existing motion routes are duplicated or removed; review separately.');
const pages=[];
for(const [index,route] of routes.entries()){
  const id=route.path.split('/')[2],still='public/share/'+route.card+'.png',seed=createHash('sha256').update(route.path).digest();
  const file='charities-'+id+'-connections-v1.mp4',destination=output+'/'+file;
  const existing=previousPages.get(route.path);
  if(existing){
    if(existing.file!==file||existing.still!==still||hash(readFileSync(still))!==existing.stillSha256)throw Error('Existing artwork changed; append cannot replace a reviewed pairing: '+id);
    const bytes=readFileSync(destination),technical=inspectShareMp4(bytes);
    if(hash(bytes)!==existing.videoSha256||bytes.length!==existing.bytes||Object.entries(technical).some(([k,v])=>existing[k]!==v))throw Error('Existing motion changed: '+id);
    pages.push(existing);continue;
  }
  const filters=["[1:v]format=rgba,geq=r=213:g=237:b=116:a='if(lte(hypot(X-5.5,Y-5.5),5),180,0)',split=4[d0][d1][d2][d3]"];
  const nodes=[[902,224],[1100,217],[900,396],[1111,393]];
  for(let i=0;i<4;i++){
    const [x,baseY]=nodes[i],y=baseY+seed[i]%17-8,travel=`(0.45+0.55*pow(sin(PI*(t/6+${i}/4)),2))`;
    filters.push(`[${i?'v'+i:'0:v'}][d${i}]overlay=x='994+(${x}-1000)*${travel}':y='304+(${y}-310)*${travel}':eval=frame:shortest=1[v${i+1}]`);
  }
  if(existsSync(destination))throw Error('Refusing to overwrite an existing motion release: '+destination);
  const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-framerate','24','-i',still,'-f','lavfi','-i','color=c=0xd5ed74:s=12x12:r=24','-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[v4]','-t','6','-an','-c:v','libx264','-preset','slow','-crf','19','-pix_fmt','yuv420p','-r','24','-movflags','+faststart',destination],{stdio:'inherit'});
  if(result.status!==0)throw Error('Motion encoding failed: '+id);
  const bytes=readFileSync(destination),technical=inspectShareMp4(bytes);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_name,pix_fmt,r_frame_rate','-of','json',destination],{encoding:'utf8'});
  if(probe.status!==0)throw Error('Codec inspection failed: '+id);
  const streams=JSON.parse(probe.stdout).streams;
  if(streams.length!==1||streams[0].codec_name!=='h264'||streams[0].pix_fmt!=='yuv420p'||streams[0].r_frame_rate!=='24/1')throw Error('Unexpected codec: '+id);
  pages.push({path:route.path,still,stillSha256:hash(readFileSync(still)),file,videoSha256:hash(bytes),bytes:bytes.length,pixelFormat:'yuv420p',...technical});
  if((index+1)%20===0||index===routes.length-1)console.log(`Encoded and inspected ${index+1}/${routes.length} assessment previews`);
}
writeFileSync(manifestPath,JSON.stringify({...previous,schemaVersion:'1.0.0',createdAt:previous?.createdAt||'2026-10-27',updatedAt:JSON.parse(readFileSync('data/charities.json','utf8')).reviewedAt,treatment:'assessment-connections-v1',creativeReview:previous?.creativeReview||{status:'representative_user_approved',sampleProfileId:'medic',reviewedAt:'2026-10-27',reviewScope:'Representative encoded treatment; two loops at full and small preview sizes. Not a claim that every page was separately watched.',userStatement:'Reviewed both sizes: use this motion'},targetAppPlayback:'not_verified',pages},null,2)+'\n');
