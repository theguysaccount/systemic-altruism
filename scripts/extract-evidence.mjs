// Zero-network preparation and citation checks; does not call a model API.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {reviewPacket,validateDraft} from '../src/evidence.mjs';
const [sourcePath,responsePath]=process.argv.slice(2);
if(!sourcePath)throw new Error('Usage: node scripts/extract-evidence.mjs PUBLIC_SOURCE.json [LOCAL_MODEL_RESPONSE.json]');
const source=JSON.parse(await readFile(sourcePath,'utf8'));
const output=responsePath?validateDraft(source,JSON.parse(await readFile(responsePath,'utf8'))):reviewPacket(source);
await mkdir('review-queue',{recursive:true});
const path=`review-queue/${output.source.sha256.slice(0,16)}-${responsePath?'draft':'packet'}.json`;
await writeFile(path,JSON.stringify(output,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({path,status:output.status,networkRequests:0,publicDatasetModified:false}));
