import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {axes,assess,ordered,presets,method,presetLabels} from '../src/scoring.mjs';
const data=JSON.parse(readFileSync(new URL('../data/charities.json',import.meta.url)));
test('missing evidence is an envelope and never a measured zero',()=>{
  assert.deepEqual(assess({}),{lower:0,upper:100,coverage:0,known:0,total:100});
  const a=assess({depth:4});assert.equal(a.lower,35);assert.equal(a.upper,100);assert.equal(a.coverage,35);
});
test('fully reviewed endpoints and zero-weight view remain valid',()=>{
  const all=Object.fromEntries(Object.keys(axes).map(k=>[k,4]));
  assert.equal(assess(all).lower,100);assert.equal(assess(all).upper,100);assert.equal(assess(all).coverage,100);
  assert.deepEqual(assess(all,{}),{lower:0,upper:100,coverage:0,known:0,total:0});
});
test('unknown weights do not silently change the denominator',()=>{
  const a=assess({depth:2},{depth:1,agency:1,unrecognized:500});assert.equal(a.lower,25);assert.equal(a.upper,75);assert.equal(a.coverage,50);
  assert.throws(()=>assess({depth:5}));assert.throws(()=>assess({depth:NaN}));
});
test('score order is deterministic and responds to priorities',()=>{
  const a={id:'a',name:'Alpha',scores:{depth:4,agency:0}},b={id:'b',name:'Beta',scores:{depth:0,agency:4}};
  assert.equal(ordered([b,a],{depth:3,agency:1})[0].id,'a');assert.equal(ordered([a,b],{depth:1,agency:3})[0].id,'b');
});
test('every public annotation has provenance, scope, uncertainty and six rationales',()=>{
  assert.equal(data.charities.length,70);assert.equal(new Set(data.charities.map(c=>c.id)).size,70);
  for(const c of data.charities){
    assert.match(c.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.equal(c.scoreStatus,'editorial_hypothesis');assert.ok(c.limitations);assert.ok(c.evaluationScope);assert.ok(c.sources.length);
    for(const s of c.sources){assert.ok(s.title);assert.ok(['official','evaluation','research'].includes(s.type));assert.equal(new URL(s.url).protocol,'https:');assert.match(s.accessedAt,/^\d{4}-\d{2}-\d{2}$/);}
    for(const key of Object.keys(axes)){assert.ok(key in c.scores);assert.ok(c.rationales[key]?.length>10);const v=c.scores[key];assert.ok(v===null||(Number.isInteger(v)&&v>=0&&v<=4));}
    for(const weights of Object.values(presets)){const a=assess(c.scores,weights);assert.ok(a.lower>=0&&a.lower<=a.upper&&a.upper<=100);}
  }
});
test('practice default is explicit, totals 100 and preserves the original lens',()=>{
  assert.equal(method.defaultPreset,'systemic');
  assert.deepEqual(presets.systemic,{depth:35,reach:25,durability:15,scalability:15,additionality:5,agency:5});
  assert.deepEqual(presets.balanced,{depth:30,reach:20,durability:20,scalability:15,additionality:10,agency:5});
  assert.equal(data.weightingMethod.version,method.version);
  assert.equal(data.weightingMethod.sourceUrl,method.source.url);
  assert.equal(data.weightingMethod.defaultPreset,method.defaultPreset);
  assert.deepEqual(data.weightingMethod.weights,presets.systemic);
  for(const [name,weights] of Object.entries(presets)){
    assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),100);
    assert.ok(presetLabels[name]);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(axes).map(([k,a])=>[k,a.weight])),presets.systemic);
  assert.equal(assess({depth:4},presets.balanced).lower,30);
  assert.equal(assess({depth:4,reach:4,durability:4,scalability:4}).coverage,90);
  assert.equal(assess({depth:4,reach:4,durability:4,scalability:4},presets.balanced).coverage,85);
});
test('added assessments have dated primary sources without inventing funding or governance scores',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-26-infrastructure');
  assert.equal(batch.length,12);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-26');assert.equal(c.selectionType,'illustrative');
    assert.equal(c.externalEvaluator,null);assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.every(s=>s.type==='official'&&s.accessedAt==='2026-10-26'));
  }
  assert.equal(data.charities.filter(c=>c.lastReviewed==='2026-10-06').length,40);
  assert.ok(data.charities.slice(0,40).every(c=>c.sources.every(s=>s.accessedAt==='2026-10-06')));
});
test('October 27 batch adds 18 scoped assessments without changing the agreed weighting method',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-tools-and-checklist');
  assert.equal(batch.length,18);assert.equal(data.charities.filter(c=>c.lastReviewed==='2026-10-26').length,12);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.every(s=>s.type==='official'&&s.accessedAt==='2026-10-27'));
  }
  assert.equal(data.weightingMethod.version,'0.2');
  assert.deepEqual(data.weightingMethod.weights,{depth:35,reach:25,durability:15,scalability:15,additionality:5,agency:5});
});
