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
  assert.equal(data.charities.length,187);assert.equal(new Set(data.charities.map(c=>c.id)).size,187);
  for(const c of data.charities){
    assert.match(c.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.equal(c.scoreStatus,'editorial_hypothesis');assert.ok(c.limitations);assert.ok(c.evaluationScope);assert.ok(c.sources.length);
    for(const s of c.sources){assert.ok(s.title);assert.ok(['official','evaluation','research'].includes(s.type));assert.equal(new URL(s.url).protocol,'https:');assert.match(s.accessedAt,/^\d{4}-\d{2}-\d{2}$/);}
    for(const key of Object.keys(axes)){assert.ok(key in c.scores);assert.ok(c.rationales[key]?.length>10);const v=c.scores[key];assert.ok(v===null||(Number.isInteger(v)&&v>=0&&v<=4));}
    for(const weights of Object.values(presets)){const a=assess(c.scores,weights);assert.ok(a.lower>=0&&a.lower<=a.upper&&a.upper<=100);}
  }
});
test('fifth goal batch keeps eighteen identities and current program scopes distinct',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-05');assert.equal(batch.length,18);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.evaluatorStatus,'not_verified');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);assert.ok(c.evaluationScope.length>70);assert.ok(c.falsifiableClaim.length>70);
    assert.ok(c.sources.every(s=>s.type==='official'&&s.accessedAt==='2026-10-27'));assert.equal(c.checklistAlignment.adoption,'not_verified');
    for(const k of Object.keys(axes))assert.ok(c.rationales[k].length>70);
  }
  const get=id=>batch.find(c=>c.id===id);
  for(const id of ['climate-interactive','multisolving-institute']){assert.match(get(id).evaluationScope,/NVF-sponsored/);assert.match(get(id).limitations,/not.*independent/);}
  assert.match(get('climate-advocacy-lab').evaluationScope,/Partnership Project-sponsored/);assert.match(get('climate-advocacy-lab').limitations,/government employees/);
  assert.match(get('ruby-central').limitations,/final RailsConf in July 2025/);assert.match(get('open-robotics').limitations,/acquired by Intrinsic/);
  assert.match(get('project-equity').limitations,/could not be retrieved/);assert.match(get('common-future').limitations,/dated filing/);
  assert.match(get('democracy-at-work-institute').evaluationScope,/separately incorporated/);assert.match(get('open-source-ecology').limitations,/privately owned land/);
});
test('sixth goal batch adds fourteen scoped assessments with clinical and corporate boundaries',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-06');assert.equal(batch.length,14);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.evaluatorStatus,'not_verified');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);assert.ok(c.evaluationScope.length>70);assert.ok(c.falsifiableClaim.length>70);
    assert.ok(c.sources.every(s=>s.type==='official'&&s.accessedAt==='2026-10-27'));assert.equal(c.checklistAlignment.adoption,'not_verified');
    for(const k of Object.keys(axes))assert.ok(c.rationales[k].length>70);
  }
  const get=id=>batch.find(c=>c.id===id);
  assert.match(get('muso').evaluationScope,/not Malawi/);assert.match(get('foundation-for-public-code').limitations,/Dutch parent association/);
  assert.match(get('5rights-foundation').limitations,/Belgian/);assert.match(get('responsible-ai-collaborative').limitations,/private operating foundation/);
  assert.match(get('full-fact').limitations,/paid licence/);assert.match(get('nlnet-labs').limitations,/distinct from the NLnet Foundation/);
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
test('second October 27 batch scopes 12 open-source assessments without filling funding or agency gaps',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-open-source');
  assert.equal(batch.length,12);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.every(s=>s.type==='official'&&s.accessedAt==='2026-10-27'));
    assert.equal(c.openSource.status,'license_verified');assert.ok(c.tooling);assert.ok(c.falsifiableClaim.length>70);
  }
  assert.match(batch.find(c=>c.id==='open-ownership').evaluationScope,/fiscally sponsored/);
  assert.match(batch.find(c=>c.id==='numfocus').limitations,/applications are paused/);
  assert.match(batch.find(c=>c.id==='sahana-software-foundation').limitations,/May 2025/);
});
test('first goal batch adds 18 scoped assessments without promoting unsupported evidence',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-01');assert.equal(batch.length,18);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.every(s=>s.type==='official'&&s.accessedAt==='2026-10-27'));
    assert.equal(c.checklistAlignment.adoption,'not_verified');
  }
  assert.match(batch.find(c=>c.id==='sortition-foundation').evaluationScope,/not-for-profit/);
  assert.match(batch.find(c=>c.id==='mapaction').limitations,/no license file/);
  assert.equal(batch.find(c=>c.id==='long-now-foundation').tooling,undefined);
  assert.match(batch.find(c=>c.id==='people-powered').rationales.agency,/member-governance/);
});
test('second goal batch separates named code, support models and unresolved causal claims',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-02');assert.equal(batch.length,18);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.some(s=>s.type==='official'));assert.ok(c.sources.every(s=>s.accessedAt==='2026-10-27'));
    assert.ok(c.falsifiableClaim.length>70);assert.equal(c.checklistAlignment.adoption,'not_verified');
  }
  assert.equal(batch.filter(c=>c.openSource?.status==='license_verified').length,5);
  assert.match(batch.find(c=>c.id==='code-for-science-and-society').evaluationScope,/not a second independently counted charity/);
  assert.match(batch.find(c=>c.id==='python-software-foundation').openSource.projects[0].licenseLabel,/PSF-2.0/);
  assert.match(batch.find(c=>c.id==='drupal-association').openSource.projects[0].scope,/Canonical development/);
  assert.match(batch.find(c=>c.id==='resource-generation').evaluationScope,/501\(c\)\(4\)/);
  assert.match(batch.find(c=>c.id==='new-economy-coalition').rationales.agency,/member-elected/);
  assert.match(batch.find(c=>c.id==='interactivity-foundation').limitations,/direct HTTP returned 403/);
  assert.equal(batch.find(c=>c.id==='tactical-tech').openSource,undefined);
});
test('third goal batch preserves current ownership, restrictive-license and mixed-rights boundaries',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-03');assert.equal(batch.length,19);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.some(s=>s.type==='official'));assert.ok(c.sources.every(s=>s.accessedAt==='2026-10-27'));
    assert.ok(c.falsifiableClaim.length>70);assert.equal(c.checklistAlignment.adoption,'not_verified');
    assert.ok(c.evaluationScope.length>70);assert.ok(c.limitations.length>180);
  }
  assert.equal(batch.filter(c=>c.openSource?.status==='license_verified').length,10);
  assert.match(batch.find(c=>c.id==='villagereach').limitations,/transitioned to Vitalliance/);
  assert.match(batch.find(c=>c.id==='cadasta-foundation').limitations,/Esri ArcGIS/);
  assert.match(batch.find(c=>c.id==='cadasta-foundation').evaluationScope,/Corus International/);
  assert.match(batch.find(c=>c.id==='radicalxchange-foundation').limitations,/CC BY-NC 2.0/);
  assert.match(batch.find(c=>c.id==='document-foundation').limitations,/GPL, LGPL and third-party/);
  assert.match(batch.find(c=>c.id==='open-food-facts').limitations,/ODbL/);
  assert.match(batch.find(c=>c.id==='center-for-democracy-and-technology').limitations,/direct HTTP returned 403/);
});
test('fourth goal batch retains legal boundaries, changed services and mixed license evidence',()=>{
  const batch=data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-04');assert.equal(batch.length,18);
  for(const c of batch){
    assert.equal(c.lastReviewed,'2026-10-27');assert.equal(c.selectionType,'illustrative');assert.equal(c.externalEvaluator,null);
    assert.equal(c.scores.additionality,null);assert.equal(c.scores.agency,null);
    assert.ok(c.sources.some(s=>s.type==='official'));assert.ok(c.sources.every(s=>s.accessedAt==='2026-10-27'));
    assert.ok(c.falsifiableClaim.length>70);assert.ok(c.evaluationScope.length>70);assert.ok(c.limitations.length>180);
    assert.equal(c.checklistAlignment.adoption,'not_verified');
  }
  assert.equal(batch.filter(c=>c.openSource?.status==='license_verified').length,14);
  assert.match(batch.find(c=>c.id==='center-for-open-science').limitations,/phasing out OSF Projects/);
  assert.match(batch.find(c=>c.id==='intrahealth-international').evaluationScope,/Global Communities subsidiary/);
  assert.match(batch.find(c=>c.id==='intrahealth-international').limitations,/LGPL-3.0.*GPL v3/);
  assert.match(batch.find(c=>c.id==='development-gateway').evaluationScope,/distinct from IREX/);
  assert.match(batch.find(c=>c.id==='hack-foundation').limitations,/7% revenue fee/);
  assert.match(batch.find(c=>c.id==='qgis-association').limitations,/Swiss association, distinct from OSGeo/);
  assert.match(batch.find(c=>c.id==='blender-foundation').limitations,/not an officially recognized charity/);
});
