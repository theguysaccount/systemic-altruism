import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {injectShareVideo,inspectShareMp4} from '../src/share-motion.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('../social-motion/assessment-motion/manifest.json',import.meta.url)));
const data=JSON.parse(readFileSync(new URL('../data/charities.json',import.meta.url)));
test('motion metadata is idempotent and retains the still fallback',()=>{
  const input='<head><meta property="og:image" content="https://example.org/card.png"><meta name="twitter:card" content="summary_large_image"></head>';
  const url='https://example.org/card.mp4',one=injectShareVideo(input,url),two=injectShareVideo(one,url);
  assert.equal(one,two);assert.ok(one.includes('og:image'));assert.ok(one.includes('summary_large_image'));
  assert.equal((one.match(/property="og:video"/g)||[]).length,1);assert.ok(one.includes('twitter:player:stream'));
  assert.throws(()=>injectShareVideo(input,'http://example.org/card.mp4'));assert.throws(()=>injectShareVideo('<main/>',url));
});
test('encoded representative is six-second silent fast-start H264, not a manifest assertion',()=>{
  const p=manifest.pages.find(p=>p.path==='/charities/medic/'),bytes=readFileSync(new URL('../social-motion/assessment-motion/'+p.file,import.meta.url));
  assert.deepEqual(inspectShareMp4(bytes),{width:1200,height:630,duration:6,fps:24,frames:144,codec:'avc1',audioTracks:0,fastStart:true});
  assert.throws(()=>inspectShareMp4(Buffer.from('not video')));assert.throws(()=>inspectShareMp4(bytes.subarray(0,bytes.length-9)));
});
test('every assessment has its own motion asset paired to the unchanged page-specific still',()=>{
  assert.equal(manifest.pages.length,data.charities.length);assert.equal(new Set(manifest.pages.map(p=>p.path)).size,data.charities.length);
  assert.equal(manifest.creativeReview.status,'representative_user_approved');assert.equal(manifest.creativeReview.sampleProfileId,'medic');
  assert.equal(manifest.creativeReview.userStatement,'Reviewed both sizes: use this motion');assert.equal(manifest.targetAppPlayback,'not_verified');
  const seen=new Set();
  for(const c of data.charities){
    const p=manifest.pages.find(p=>p.path===`/charities/${c.id}/`);assert.ok(p);
    assert.equal(p.still,`public/share/charities-${c.id}-v2.png`);assert.equal(p.file,`charities-${c.id}-connections-v1.mp4`);
    const image=readFileSync(new URL('../'+p.still,import.meta.url)),bytes=readFileSync(new URL('../social-motion/assessment-motion/'+p.file,import.meta.url));
    assert.equal(hash(image),p.stillSha256);assert.equal(hash(bytes),p.videoSha256);assert.ok(!seen.has(p.videoSha256));seen.add(p.videoSha256);
    assert.deepEqual(inspectShareMp4(bytes),{width:1200,height:630,duration:6,fps:24,frames:144,codec:'avc1',audioTracks:0,fastStart:true});assert.equal(p.pixelFormat,'yuv420p');assert.ok(bytes.length<2_000_000);
  }
});
