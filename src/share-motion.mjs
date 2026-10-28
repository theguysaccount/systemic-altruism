// Structural delivery checks, not a substitute for watching the creative treatment.
export function injectShareVideo(html,url,width=1200,height=630){
  if(new URL(url).protocol!=='https:'||!url.endsWith('.mp4'))throw Error('Share video needs a direct HTTPS MP4');
  if(!html.includes('</head>'))throw Error('Page has no head');
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const values=[['property','og:video',url],['property','og:video:secure_url',url],['property','og:video:type','video/mp4'],['property','og:video:width',width],['property','og:video:height',height],['name','twitter:player:stream',url],['name','twitter:player:stream:content_type','video/mp4']];
  const clean=html.replace(/<meta\b(?=[^>]*(?:property|name)="(?:og:video(?::[^"]*)?|twitter:player:stream(?::[^"]*)?)")[^>]*>/gi,'');
  return clean.replace('</head>',values.map(([attribute,key,value])=>`<meta ${attribute}="${key}" content="${esc(value)}">`).join('')+'</head>');
}

// Bounded parser for this encoder's MP4 boxes. Unsupported containers fail closed.
export function inspectShareMp4(bytes){
  const fail=()=>{throw Error('Invalid or unsupported assessment MP4')};
  const boxes=(start,end)=>{
    const out=[];let offset=start;
    while(offset<end){
      if(offset+8>end)fail();const size=bytes.readUInt32BE(offset);
      if(size<8||offset+size>end)fail();
      out.push({type:bytes.toString('ascii',offset+4,offset+8),start:offset,payload:offset+8,end:offset+size});offset+=size;
    }return out;
  };
  const one=(list,type)=>{const found=list.filter(b=>b.type===type);if(found.length!==1)fail();return found[0]};
  const top=boxes(0,bytes.length),moov=one(top,'moov'),mdat=one(top,'mdat');one(top,'ftyp');
  if(moov.start>mdat.start)fail();
  const tracks=boxes(moov.payload,moov.end).filter(b=>b.type==='trak');if(tracks.length!==1)fail();
  const track=boxes(tracks[0].payload,tracks[0].end),tkhd=one(track,'tkhd'),mdia=one(track,'mdia');
  if(tkhd.end-tkhd.payload<8)fail();
  const width=bytes.readUInt32BE(tkhd.end-8)/65536,height=bytes.readUInt32BE(tkhd.end-4)/65536;
  const media=boxes(mdia.payload,mdia.end),hdlr=one(media,'hdlr'),mdhd=one(media,'mdhd');
  if(hdlr.end-hdlr.payload<12||bytes.toString('ascii',hdlr.payload+8,hdlr.payload+12)!=='vide')fail();
  if(mdhd.end-mdhd.payload<20||bytes[mdhd.payload]!==0)fail();
  const timescale=bytes.readUInt32BE(mdhd.payload+12),duration=bytes.readUInt32BE(mdhd.payload+16)/timescale;
  const minf=one(media,'minf'),stbl=one(boxes(minf.payload,minf.end),'stbl'),samples=boxes(stbl.payload,stbl.end);
  const stsd=one(samples,'stsd'),stts=one(samples,'stts');
  if(stsd.end-stsd.payload<16||bytes.readUInt32BE(stsd.payload+4)!==1)fail();
  const codec=bytes.toString('ascii',stsd.payload+12,stsd.payload+16);
  if(codec!=='avc1'||stts.end-stts.payload!==16||bytes.readUInt32BE(stts.payload+4)!==1)fail();
  const frames=bytes.readUInt32BE(stts.payload+8),delta=bytes.readUInt32BE(stts.payload+12),fps=timescale/delta;
  if(!timescale||!delta||!Number.isFinite(duration))fail();
  return {width,height,duration,fps,frames,codec,audioTracks:0,fastStart:true};
}
