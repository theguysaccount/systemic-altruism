import test from 'node:test';
import assert from 'node:assert/strict';
import {peersFor,comparePotential,fitStatus,scenario,funderBrief} from '../src/decision-tools.mjs';
const scores=depth=>({depth,reach:3,durability:2,scalability:3,additionality:null,agency:null});
const a={id:'a',name:'Starting charity',category:'Health',scores:scores(2),sources:[]};
const b={id:'b',name:'Candidate',category:'Health',scores:scores(3),sources:[]};
const c={id:'c',name:'Other cause',category:'Climate',scores:scores(4),sources:[]};
test('funder alternatives never infer mission equivalence or include another cause',()=>{
  assert.deepEqual(peersFor([a,b,c],a).map(c=>c.id),['b']);
  assert.deepEqual(peersFor([a,b,c],b,undefined,true),[]);
  const comparison=comparePotential(a,b);
  assert.equal(comparison.delta,8.75);
  assert.equal(comparison.overlaps,true);
  assert.equal(comparison.candidate.coverage,90);
});
test('fit stays incomplete until every question is checked; one concern takes precedence',()=>{
  assert.equal(fitStatus({outcome:'yes'}),'Mission fit needs review');
  assert.equal(fitStatus({outcome:'yes',population:'yes',restrictions:'yes',capacity:'no'}),'Fit concern');
  assert.match(fitStatus({outcome:'yes',population:'yes',restrictions:'yes',capacity:'yes'}),/evidence review needed/);
});
test('scenario uses incremental outcomes and rejects missing, invalid and zero-cost inputs',()=>{
  assert.deepEqual(scenario({people:100,baseline:40,target:60,cost:10000}),{additional:20,costPerAdditional:500});
  assert.equal(scenario({people:100,baseline:'',target:60,cost:10000}),null);
  assert.equal(scenario({people:100,baseline:40,target:101,cost:10000}),null);
  assert.equal(scenario({people:100,baseline:40,target:60,cost:0}),null);
  assert.deepEqual(scenario({people:100,baseline:40,target:30,cost:10000}),{additional:-10,costPerAdditional:null});
});
test('funding brief carries scope, unresolved checks, sources and score uncertainty',()=>{
  const brief=funderBrief({baseline:a,candidates:[{...b,sources:[{title:'Program source',url:'https://example.org/source'}]}],weights:{depth:30,reach:20,durability:20,scalability:15,additionality:10,agency:5},mission:'Preserve malaria prevention',checks:{},reviewedAt:'2026-10-06',origin:'https://example.org'});
  assert.match(brief,/Same intended outcome: unknown/);
  assert.match(brief,/ranges overlap/);
  assert.match(brief,/https:\/\/example.org\/source/);
  assert.match(brief,/does not establish greater effectiveness/);
});
