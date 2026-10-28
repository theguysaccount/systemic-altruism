import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectReviewLedger} from '../src/review-ledger.mjs';
const data=JSON.parse(readFileSync(new URL('../data/charities.json',import.meta.url)));
const ledger=JSON.parse(readFileSync(new URL('../data/review-ledger.json',import.meta.url)));
test('review decisions cover the cohort exactly and never count queued/deferred/excluded leads',()=>{
  assert.deepEqual(inspectReviewLedger(ledger,data),{included:200,queued:5,deferred:18,excluded:2,target:200,remaining:0});
  assert.equal(ledger.goal.status,'in_progress');
  assert.equal(ledger.entries.filter(e=>e.status==='included').length,data.charities.length);
});
test('ledger rejects duplicate, orphaned or stale assessment references',()=>{
  for(const mutation of [l=>l.entries.push(l.entries[0]),l=>l.entries[0].id='missing-assessment',l=>l.entries[0].decisionAt='2026-10-27',l=>l.entries.pop()&&l.entries.splice(0,1)]){
    const l=structuredClone(ledger);mutation(l);assert.throws(()=>inspectReviewLedger(l,data),/Review ledger/);
  }
});
test('unscored candidates, required evidence gaps and honest completion are enforced',()=>{
  const l=structuredClone(ledger);l.entries.find(e=>e.status==='queued').scores={depth:4};assert.throws(()=>inspectReviewLedger(l,data),/counted as assessment/);
  const d=structuredClone(ledger);d.entries.find(e=>e.status==='deferred').evidenceGaps=[];assert.throws(()=>inspectReviewLedger(d,data),/next evidence/);
  const c=structuredClone(ledger);c.goal.status='complete';assert.throws(()=>inspectReviewLedger(c,data),/premature completion/);
  const h=structuredClone(ledger);h.entries.find(e=>e.status==='included').independentHumanReview='complete';assert.throws(()=>inspectReviewLedger(h,data),/unsupported human/);
});
test('unresolved operating identities and sponsored examples cannot pad the profile count',()=>{
  for(const id of ['code-for-all','shareable','public-lab','ehealth-africa','democratic-society','open-bioinformatics-foundation','beautiful-trouble','center-for-workplace-democracy','baobab-health-trust','jacaranda-health','digital-public-goods-alliance','software-heritage']){const e=ledger.entries.find(e=>e.id===id);assert.equal(e.status,'deferred');assert.ok(e.evidenceGaps.length);assert.equal(data.charities.some(c=>c.id===id),false);}
  const example=ledger.entries.find(e=>e.id==='openrefine-as-independent-charity');assert.equal(example.status,'excluded');assert.equal(example.relatedProfileId,'code-for-science-and-society');
});
test('reaching 200 does not silently complete release or review requirements',()=>{
  assert.equal(ledger.goal.status,'in_progress');
  for(const id of ['review-ledger','expand-cohort','open-source-review','checklist-breadth','preserve-method'])assert.equal(ledger.progressChecklist.find(c=>c.id===id).status,'complete');
  for(const id of ['release-validation','completion-audit'])assert.notEqual(ledger.progressChecklist.find(c=>c.id===id).status,'complete');
  for(const id of ['algorithmic-justice-league','distributed-ai-research-institute','software-freedom-law-center','africa-check','chequeado']){
    const e=ledger.entries.find(e=>e.id===id);assert.equal(e.status,'deferred');assert.equal(e.decisionAt,'2026-10-27');assert.ok(e.evidenceGaps.length);
  }
});
