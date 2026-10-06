import {searchRegistry,QueryError} from '../src/server/registry.mjs';

export async function GET(request) {
  try {
    const result=await searchRegistry(new URL(request.url).searchParams,{signal:request.signal});
    return Response.json(result,{headers:{'Cache-Control':'public, max-age=300, s-maxage=86400, stale-while-revalidate=3600','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'}});
  } catch(error) {
    if(error instanceof QueryError)return Response.json({error:error.message},{status:400});
    console.error('Registry lookup failed',error.name);
    return Response.json({error:'The registry is temporarily unavailable. Please try again.'},{status:503});
  }
}
