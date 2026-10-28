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
  const checked=data.charities.filter(hasVerifiedOpenSource);assert.equal(checked.length,60);
  for(const c of checked){
    assert.equal(c.openSource.reviewedAt,'2026-10-27');
    for(const p of c.openSource.projects){
      assert.ok(['maintainer','steward','fiscal_sponsor'].includes(p.role));assert.ok(['not_archived','archive_status_unverified'].includes(p.repositoryStatus));
      assert.ok(p.scope.length>70);assert.ok(p.name);assert.ok(c.sources.some(s=>s.url===p.repositoryUrl));assert.ok(c.sources.some(s=>s.url===p.licenseUrl));
      assert.match(focusProfile(c,s=>s),new RegExp(p.licenseBlobSha));
    }
  }
  assert.ok(checked.some(c=>c.openSource.projects.some(p=>p.role==='fiscal_sponsor')));
});
test('fifth goal batch scopes mixed licenses, mirrors, transfers and non-code tools',()=>{
  const get=id=>data.charities.find(c=>c.id===id);
  assert.equal(data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-05'&&hasVerifiedOpenSource(c)).length,7);
  assert.equal(get('ruby-central').openSource.projects[0].repositoryUrl,'https://github.com/ruby/rubygems');
  assert.match(get('perl-and-raku-foundation').openSource.projects[0].licenseLabel,/GPL-1.0-or-later/);
  assert.match(get('r-foundation').openSource.projects[0].scope,/mirrors R/);assert.match(get('r-foundation').limitations,/GPL version 2 or 3/);
  assert.match(get('xiph-org-foundation').limitations,/patent clearance/);assert.equal(get('one-army').openSource.projects[0].licenseLabel,'MIT');
  assert.match(get('climate-interactive').limitations,/not automatically En-ROADS/);
  for(const id of ['open-source-hardware-association','open-source-ecology','climate-outreach','climate-advocacy-lab','multisolving-institute','center-for-economic-democracy']){assert.equal(hasVerifiedOpenSource(get(id)),false);assert.equal(matchesFocus(get(id),'tooling'),true);}
  assert.match(get('open-source-hardware-association').limitations,/does not guarantee safety/);
});
test('sixth goal batch separates restricted mirrors, health-data retention and software/data permissions',()=>{
  const get=id=>data.charities.find(c=>c.id===id);
  assert.equal(data.charities.filter(c=>c.reviewBatch==='2026-10-27-goal-batch-06'&&hasVerifiedOpenSource(c)).length,4);
  const restricted=get('msupply-foundation');assert.equal(hasVerifiedOpenSource(restricted),false);assert.equal(matchesFocus(restricted,'tooling'),true);
  assert.match(restricted.limitations,/b9f7c0713d63c10c4e3c53195f4560d74edbee85/);assert.match(restricted.limitations,/October 28, 2026/);assert.match(restricted.limitations,/read-only mirror/);
  assert.match(get('jembi-health-systems').limitations,/retained indefinitely by default/);
  assert.match(get('wikimedia-deutschland').openSource.projects[0].scope,/not a uniform license/);
  assert.match(get('responsible-ai-collaborative').limitations,/CC BY-SA/);assert.match(get('responsible-ai-collaborative').limitations,/allegations/);
  assert.equal(hasVerifiedOpenSource(get('full-fact')),false);assert.equal(hasVerifiedOpenSource(get('taproot-foundation')),false);
});
test('canonical Tor GitLab license evidence is supported without accepting unrelated hosts or files',()=>{
  const c=data.charities.find(c=>c.id==='tor-project');assert.equal(hasVerifiedOpenSource(c),true);
  const clone=structuredClone(c);clone.openSource.projects[0].licenseUrl='https://gitlab.torproject.org.evil.example/LICENSE';assert.equal(hasVerifiedOpenSource(clone),false);
  const map=data.charities.find(c=>c.id==='mapaction');assert.equal(hasVerifiedOpenSource(map),false);
  assert.match(c.openSource.projects[0].scope,/optional LGPL/);
});
test('focus metadata never changes an assessment or asserts checklist affiliation',()=>{
  const c=data.charities.find(c=>c.checklistAlignment);
  assert.deepEqual(assess(c.scores),assess({...c,checklistAlignment:undefined,tooling:undefined}.scores));
  assert.match(focusProfile(c,s=>s),/Explicit checklist adoption: not verified/);
  assert.equal(focusProfile({},s=>s),'');
});
test('source-visible noncommercial tools and historical platform roles cannot receive open-source badges',()=>{
  const c=data.charities.find(c=>c.openSource);
  for(const label of ['CC BY-NC 2.0','CC-BY-NC-4.0','Noncommercial source license','mSupply Open Source License','LOW INCOME AND MIDDLE INCOME ECONOMIES','Field-of-use restricted grant']){
    const clone=structuredClone(c);clone.openSource.projects[0].licenseLabel=label;assert.equal(hasVerifiedOpenSource(clone),false);
  }
  for(const id of ['radicalxchange-foundation','villagereach','cadasta-foundation','open-culture-foundation','free-software-foundation','wordpress-foundation']){
    const c=data.charities.find(c=>c.id===id);assert.equal(matchesFocus(c,'tooling'),true);assert.equal(matchesFocus(c,'opensource'),false);
  }
  assert.match(data.charities.find(c=>c.id==='gnome-foundation').openSource.projects[0].licenseLabel,/LGPL-2.0-or-later/);
  assert.match(data.charities.find(c=>c.id==='free-software-foundation-europe').openSource.projects[0].scope,/Codeberg/);
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
test('fourth batch describes support roles without converting nonprofit or service labels into license evidence',()=>{
  for(const id of ['linux-foundation','open-source-collective','netbsd-foundation','internews']){
    const c=data.charities.find(c=>c.id===id);assert.equal(matchesFocus(c,'tooling'),true);assert.equal(hasVerifiedOpenSource(c),false);
  }
  for(const id of ['rust-foundation','linux-foundation','open-source-collective'])assert.match(data.charities.find(c=>c.id===id).limitations,/501\(c\)\(6\)/);
  assert.equal(matchesFocus(data.charities.find(c=>c.id==='center-for-open-science'),'source:status'),true);
  const blender=data.charities.find(c=>c.id==='blender-foundation');assert.equal(hasVerifiedOpenSource(blender),true);assert.match(blender.openSource.projects[0].scope,/GPL-3.0-or-later binaries/);
  assert.match(data.charities.find(c=>c.id==='freebsd-foundation').openSource.projects[0].scope,/advertising-clause addendum/);
});
