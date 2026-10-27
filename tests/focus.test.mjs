import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checklistSources,normalizeFocus,matchesFocus,focusProfile,hasVerifiedOpenSource} from '../src/focus.mjs';
import {assess} from '../src/scoring.mjs';
const data=JSON.parse(readFileSync(new URL('../data/charities.json',import.meta.url)));
test('focus filters separate evidence-backed tooling, partial source matches and unclassified records',()=>{
  const tool={tooling:{kind:'software'}},match={checklistAlignment:{basis:'editorial_mapping',sources:['story']}},unknown={};
  assert.equal(matchesFocus(tool,'tooling'),true);assert.equal(matchesFocus(match,'tooling'),false);
  assert.equal(matchesFocus(match,'source:story'),true);assert.equal(matchesFocus(match,'source:vision'),false);
  assert.equal(matchesFocus(unknown,'all'),true);assert.equal(matchesFocus(unknown,'checklist'),false);
  assert.equal(normalizeFocus('invalid'),'all');assert.equal(normalizeFocus('source:vision'),'source:vision');
});
test('open-source filter requires inspected project licenses, not a generic tooling claim',()=>{
  const c=data.charities.find(c=>c.openSource);
  assert.equal(matchesFocus(c,'opensource'),true);assert.equal(normalizeFocus('opensource'),'opensource');
  assert.equal(matchesFocus({tooling:{kind:'software'}},'opensource'),false);
  assert.equal(hasVerifiedOpenSource({...c,openSource:{...c.openSource,status:'source_visible'}}),false);
  assert.equal(hasVerifiedOpenSource({...c,openSource:{...c.openSource,projects:[]}}),false);
  assert.equal(hasVerifiedOpenSource({...c,openSource:{...c.openSource,projects:[{...c.openSource.projects[0],licenseBlobSha:''}]}}),false);
  assert.equal(hasVerifiedOpenSource({...c,openSource:{...c.openSource,projects:[{...c.openSource.projects[0],licenseUrl:'https://example.org/marketing'}]}}),false);
  assert.deepEqual(assess(c.scores),assess({...c,openSource:undefined}.scores));
  assert.match(focusProfile(c,s=>s),/not a security audit/);
});
test('all inspected open-source projects have scoped roles, dated license snapshots and source links',()=>{
  const checked=data.charities.filter(hasVerifiedOpenSource);assert.equal(checked.length,12);
  for(const c of checked){
    assert.equal(c.openSource.reviewedAt,'2026-10-27');
    for(const p of c.openSource.projects){
      assert.ok(['maintainer','steward','fiscal_sponsor'].includes(p.role));assert.equal(p.repositoryStatus,'not_archived');
      assert.ok(p.scope.length>70);assert.ok(p.name);assert.ok(c.sources.some(s=>s.url===p.repositoryUrl));assert.ok(c.sources.some(s=>s.url===p.licenseUrl));
      assert.match(focusProfile(c,s=>s),new RegExp(p.licenseBlobSha));
    }
  }
  assert.ok(checked.some(c=>c.openSource.projects.some(p=>p.role==='fiscal_sponsor')));
});
test('focus metadata never changes an assessment or asserts checklist affiliation',()=>{
  const c=data.charities.find(c=>c.checklistAlignment);
  assert.deepEqual(assess(c.scores),assess({...c,checklistAlignment:undefined,tooling:undefined}.scores));
  assert.match(focusProfile(c,s=>s),/Explicit checklist adoption: not verified/);
  assert.equal(focusProfile({},s=>s),'');
});
test('every focus claim is dated and linked to that profile’s actual sources',()=>{
  const kinds=['software','capacity','shared_infrastructure'];
  for(const c of data.charities){
    const urls=c.sources.map(s=>s.url);
    if(c.tooling){assert.ok(kinds.includes(c.tooling.kind));assert.ok(c.tooling.summary);assert.ok(c.tooling.sourceUrls.length);for(const u of c.tooling.sourceUrls)assert.ok(urls.includes(u));}
    if(c.checklistAlignment){
      const a=c.checklistAlignment;assert.equal(a.basis,'editorial_mapping');assert.equal(a.adoption,'not_verified');assert.match(a.mappedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(a.rationale.length>40);
      assert.ok(a.sources.length);for(const s of a.sources)assert.ok(s in checklistSources);
      assert.ok(a.sourceUrls.length);for(const u of a.sourceUrls)assert.ok(urls.includes(u));
    }
  }
  for(const source of Object.keys(checklistSources))assert.ok(data.charities.some(c=>matchesFocus(c,'source:'+source)),`Missing source coverage: ${source}`);
});
