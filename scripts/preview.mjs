import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {GET} from '../api/registry.js';
const dist=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost:4173');
    if(url.pathname.replace(/\/$/,'')==='/api/registry') {
      const result=await GET(new Request(url));res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    const path=decodeURIComponent(url.pathname),file=resolve(dist,'.'+(path.endsWith('/')?path+'index.html':path));
    if(!file.startsWith(dist+'/')){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://localhost:4173'));
