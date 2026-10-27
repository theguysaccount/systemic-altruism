import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectReviewLedger} from '../src/review-ledger.mjs';
const data=JSON.parse(readFileSync(new URL('../data/charities.json',import.meta.url)));
const ledger=JSON.parse(readFileSync(new URL('../data/review-ledger.json',import.meta.url)));
test('review decisions cover the cohort exactly and never count queued/deferred/excluded leads',()=>{
  assert.deepEqual(inspectReviewLedger(ledger,data),{included:100,queued:31,deferred:1,excluded:1,target:200,remaining:100});
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
