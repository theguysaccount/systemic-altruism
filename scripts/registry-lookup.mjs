// A local, attributed lookup. Raw provider data is never added to public profiles.
const ein=process.argv[2];
if(!/^\d{9}$/.test(ein||''))throw new Error('Usage: node scripts/registry-lookup.mjs NINE_DIGIT_EIN');
const url=`https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`;
const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'SystemicAltruism/0.1 (local identity lookup)'}});
if(!response.ok)throw new Error(`Registry lookup returned ${response.status}`);
const record=await response.json();
console.log(JSON.stringify({provider:'ProPublica Nonprofit Explorer',retrievedAt:new Date().toISOString(),ein,name:record.organization?.name,city:record.organization?.city,state:record.organization?.state,source:`https://projects.propublica.org/nonprofits/organizations/${ein}`,notice:'Registration and filings do not establish impact. Local lookup only; do not redistribute raw API responses.'},null,2));
