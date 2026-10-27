import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAssessments} from '../src/assessment-data.mjs';

test('returning visitors load current assessment data instead of a fresh-but-old browser cache entry',async()=>{
  const expected={charities:[{id:'new-profile'}]};
  let request;
  const data=await loadAssessments(async(url,options)=>{
    request={url,options};return {ok:true,json:async()=>expected};
  });
  assert.deepEqual(request,{url:'/api/v1/charities.json',options:{cache:'no-store'}});
  assert.equal(data,expected);
});
test('a failed data request cannot be rendered as a valid empty cohort',async()=>{
  await assert.rejects(loadAssessments(async()=>({ok:false})),/Assessment dataset unavailable/);
});
