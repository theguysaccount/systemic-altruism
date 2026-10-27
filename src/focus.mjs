// Descriptive, source-linked classifications: never an additional scoring bonus.
export const checklistSources={story:'Story',coordination:'Coordination',vision:'Vision',attention:'Attention',status:'Status',gatekeepers:'Gatekeepers'};
export const focusOptions={all:'All assessment profiles',opensource:'Open-source tools · license checked',tooling:'Tools & support for charities',checklist:'Any checklist source match',...Object.fromEntries(Object.entries(checklistSources).map(([k,v])=>['source:'+k,'Checklist: '+v]))};
export const normalizeFocus=value=>Object.hasOwn(focusOptions,value)?value:'all';
// License inspection is separate from maintenance, security and impact validation.
export function hasVerifiedOpenSource(charity){
  const o=charity.openSource;
  const sameRepository=p=>(p.repositoryUrl?.startsWith('https://github.com/')&&p.licenseUrl?.startsWith(p.repositoryUrl+'/blob/'))||(p.repositoryUrl?.startsWith('https://gitlab.torproject.org/')&&p.licenseUrl?.startsWith(p.repositoryUrl+'/-/blob/'));
  // A checked source-visible file is not enough: known noncommercial restrictions
  // cannot receive this badge. This is a narrow guard, not a license/legal classifier.
  const restrictsCommercialUse=p=>/(?:CC[\s-]*BY[\s-]*NC|non[\s-]?commercial)/i.test(p.licenseLabel||'');
  return Boolean(charity.tooling&&o?.status==='license_verified'&&/^\d{4}-\d{2}-\d{2}$/.test(o.reviewedAt)&&Array.isArray(o.projects)&&o.projects.length&&o.projects.every(p=>sameRepository(p)&&p.licenseLabel&&!restrictsCommercialUse(p)&&/^[a-f0-9]{40}$/.test(p.licenseBlobSha)));
}
export function matchesFocus(charity,focus='all'){
  if(focus==='all')return true;
  if(focus==='opensource')return hasVerifiedOpenSource(charity);
  if(focus==='tooling')return Boolean(charity.tooling);
  const mapping=charity.checklistAlignment;
  if(mapping?.basis!=='editorial_mapping'||!mapping.sources?.length)return false;
  return focus==='checklist'||(focus.startsWith('source:')&&mapping.sources.includes(focus.slice(7)));
}
export function focusProfile(charity,esc){
  const t=charity.tooling,a=charity.checklistAlignment;
  if(!t&&!a)return '';
  const open=hasVerifiedOpenSource(charity)?`<h3>Open-source evidence · license checked</h3><ul>${charity.openSource.projects.map(p=>`<li><a href="${esc(p.repositoryUrl)}">${esc(p.name)}</a> — <a href="${esc(p.licenseUrl)}">${esc(p.licenseLabel)} license file</a>. Organization’s role: ${esc(p.role.replaceAll('_',' '))}.<br><small>${esc(p.scope)} License-file snapshot: <code>${esc(p.licenseBlobSha)}</code>.</small></li>`).join('')}</ul><p>License checked ${esc(charity.openSource.reviewedAt)}. This is not a security audit, proof of current support or effectiveness, or a promise of free hosting. A sponsor or steward is not necessarily the sole developer. Unchecked profiles are not evidence of closed code. No extra score points are added.</p>`:'';
  return `<section class="focus-profile"><h2>Who this work enables</h2>${t?`<p><b>Tools &amp; support for charities:</b> ${esc(t.summary)}</p>`:''}${open}${a?`<h3>Humanity’s Checklist source match</h3><p><b>${a.sources.map(s=>esc(checklistSources[s])).join(' · ')}</b> — editorial, partial alignment.</p><p>${esc(a.rationale)}</p><p><b>Explicit checklist adoption: not verified.</b> A mechanism match is not an affiliation, endorsement, evidence of effectiveness or a scoring bonus. <a href="https://humanityschecklist.org/blog/systemic-altruism/">Read the practice</a>.</p>`:''}<p><small>Focus classification: ${esc(t?.reviewedAt||a.mappedAt)}. Based on the organization’s dated official sources below; earlier axis-review dates are unchanged.</small></p></section>`;
}
