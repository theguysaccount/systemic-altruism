import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {GET} from '../api/registry.js';
const dist=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost:4173');
    if(url.pathname.replace(/\/$/,'')==='/api/registry') {
      const result=await GET(new Request(url));res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    const path=decodeURIComponent(url.pathname),file=resolve(dist,'.'+(path.endsWith('/')?path+'index.html':path));
    if(!file.startsWith(dist+'/')){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file),headers={'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':bytes.length};
    if(extname(file)==='.mp4'){
      headers['Accept-Ranges']='bytes';
      if(req.headers.range){
        const range=req.headers.range.match(/^bytes=(\d+)-(\d*)$/),start=range?Number(range[1]):-1,end=range?Math.min(bytes.length-1,range[2]?Number(range[2]):bytes.length-1):-1;
        if(!range||start<0||start>=bytes.length||end<start){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});res.end();return;}
        res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${bytes.length}`});res.end(bytes.subarray(start,end+1));return;
      }
    }
    res.writeHead(200,headers);res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://localhost:4173'));
