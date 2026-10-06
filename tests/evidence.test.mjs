import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPacket,validateDraft} from '../src/evidence.mjs';
const source={url:'https://example.org/report',title:'Synthetic evaluation fixture',text:'The council adopted a procurement policy. Implementation has not been measured.'};
const observation={claim:'A policy adoption is reported.',quote:'The council adopted a procurement policy.',sourceUrl:source.url,stage:'adoption',limitation:'This does not establish implementation or causal impact.'};
test('citation checks retain unapproved status and do not certify causal accuracy',()=>{
  assert.equal(reviewPacket(source).status,'unapproved_source_packet');
  const out=validateDraft(source,{observations:[observation]});assert.equal(out.status,'needs_human_review');assert.equal(out.causalAccuracyVerified,false);
});
test('fabricated citations and source substitution fail',()=>{
  assert.throws(()=>validateDraft(source,{observations:[{...observation,quote:'The policy eliminated poverty.'}]}));
  assert.throws(()=>validateDraft(source,{observations:[{...observation,sourceUrl:'https://other.example/report'}]}));
});
test('model scores and observations without limits fail',()=>{
  assert.throws(()=>validateDraft(source,{observations:[observation],scores:{depth:4}}));
  assert.throws(()=>validateDraft(source,{observations:[{...observation,limitation:''}]}));
});
