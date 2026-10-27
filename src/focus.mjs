// Descriptive, source-linked classifications: never an additional scoring bonus.
export const checklistSources={story:'Story',coordination:'Coordination',vision:'Vision',attention:'Attention',status:'Status',gatekeepers:'Gatekeepers'};
export const focusOptions={all:'All assessment profiles',tooling:'Tools & support for charities',checklist:'Any checklist source match',...Object.fromEntries(Object.entries(checklistSources).map(([k,v])=>['source:'+k,'Checklist: '+v]))};
export const normalizeFocus=value=>Object.hasOwn(focusOptions,value)?value:'all';
export function matchesFocus(charity,focus='all'){
  if(focus==='all')return true;
  if(focus==='tooling')return Boolean(charity.tooling);
  const mapping=charity.checklistAlignment;
  if(mapping?.basis!=='editorial_mapping'||!mapping.sources?.length)return false;
  return focus==='checklist'||(focus.startsWith('source:')&&mapping.sources.includes(focus.slice(7)));
}
export function focusProfile(charity,esc){
  const t=charity.tooling,a=charity.checklistAlignment;
  if(!t&&!a)return '';
  return `<section class="focus-profile"><h2>Who this work enables</h2>${t?`<p><b>Tools &amp; support for charities:</b> ${esc(t.summary)}</p>`:''}${a?`<h3>Humanity’s Checklist source match</h3><p><b>${a.sources.map(s=>esc(checklistSources[s])).join(' · ')}</b> — editorial, partial alignment.</p><p>${esc(a.rationale)}</p><p><b>Explicit checklist adoption: not verified.</b> A mechanism match is not an affiliation, endorsement, evidence of effectiveness or a scoring bonus. <a href="https://humanityschecklist.org/blog/systemic-altruism/">Read the practice</a>.</p>`:''}<p><small>Focus classification: ${esc(t?.reviewedAt||a.mappedAt)}. Based on the organization’s dated official sources below; earlier axis-review dates are unchanged.</small></p></section>`;
}
