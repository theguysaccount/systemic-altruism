import {causeLabels,stateLabels} from './registry-labels.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toLocaleString('en-US');
const params=new URLSearchParams(location.search);
$('#registry-search').value=params.get('q')||'';
if([...$('#registry-state').options].some(o=>o.value===params.get('state')))$('#registry-state').value=params.get('state');
if([...$('#registry-cause').options].some(o=>o.value===params.get('cause')))$('#registry-cause').value=params.get('cause');
let offset=0,active,sequence=0,lastResult,debounce;
function currentParams(){
  const p=new URLSearchParams();for(const [key,id] of [['q','registry-search'],['state','registry-state'],['cause','registry-cause']]){const value=$('#'+id).value.trim();if(value)p.set(key,value);}
  return p;
}
function showDetail(ein){
  const r=lastResult?.results.find(r=>r.ein===ein);if(!r)return;
  const formatted=r.ein.slice(0,2)+'-'+r.ein.slice(2);
  const ruling=/^\d{6}$/.test(r.rulingDate)&&r.rulingDate!=='000000'?r.rulingDate.slice(0,4)+'-'+r.rulingDate.slice(4):'Not supplied';
  $('#registry-detail-title').textContent=r.name;
  $('#registry-detail-content').innerHTML=`<p class="lead">${esc(r.city)}, ${esc(stateLabels[r.state]||r.state)}</p><dl class="registry-facts"><div><dt>EIN</dt><dd>${formatted}</dd></div><div><dt>Cause classification</dt><dd>${esc(r.category)} · ${esc(r.ntee||'NTEE unavailable')}</dd></div><div><dt>Organization type</dt><dd>${esc(r.organizationType)}</dd></div><div><dt>IRS ruling month</dt><dd>${ruling}</dd></div><div><dt>Snapshot status</dt><dd>${r.statusCode==='02'?'Conditional exemption':'Unconditional exemption'} · ${esc(lastResult.sourcePostedAt)}</dd></div>${r.alternateName?`<div><dt>Secondary name in IRS record</dt><dd>${esc(r.alternateName)}</dd></div>`:''}</dl><div class="callout"><b>Systemic-change assessment pending</b><p>This record establishes registry identity and classification. Its mechanisms, outcomes, funding gaps and community accountability have not yet been assessed here.</p></div><div class="registry-detail-links"><a class="button" href="https://projects.propublica.org/nonprofits/organizations/${r.ein}" target="_blank" rel="noopener">Check public filings ↗</a><a class="button secondary" href="${esc(lastResult.sourceUrl)}" target="_blank" rel="noopener">IRS source & definitions ↗</a><a class="button secondary" href="https://github.com/theguysaccount/systemic-altruism/issues/new?title=${encodeURIComponent('Evidence proposal: '+r.name+' ('+formatted+')')}&body=${encodeURIComponent('Organization: '+r.name+'\nEIN: '+formatted+'\n\nPublic source URL:\nProposed pathway to systemic change:\nEvidence and limitations:\n')}" target="_blank" rel="noopener">Propose an assessment ↗</a></div><p class="registry-note">A filing-address location may differ from where an organization operates. Check current tax status through <a href="https://apps.irs.gov/app/eos/" target="_blank" rel="noopener">IRS Tax Exempt Organization Search</a>.</p>`;
  $('#registry-detail').showModal();
}
async function load(){
  const p=currentParams(),q=p.get('q')||'';
  active?.abort();const request=++sequence;
  const digits=/^[\d -]+$/.test(q)?q.replace(/[^0-9]/g,''):'';
  if(q && !/[a-zA-Z]{3}/.test(q) && digits.length<3){
    $('#registry-status').textContent='Enter at least three letters or three EIN digits.';
    $('#registry-results').innerHTML='';$('#registry-pages').hidden=true;return;
  }
  p.set('offset',offset);p.set('limit','25');
  active=new AbortController();
  $('#registry-results').setAttribute('aria-busy','true');
  $('#registry-status').textContent='Searching the charity registry…';
  $('#registry-pages').hidden=true;
  try {
    const response=await fetch('/api/registry?'+p,{signal:active.signal});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'The registry is temporarily unavailable.');
    if(request!==sequence)return;
    lastResult=result;
    const shared=currentParams();history.replaceState(null,'','/directory/'+(shared.size?'?'+shared:''));
    $('#registry-status').textContent=result.total?`${number(result.total)} matching organizations · showing ${number(offset+1)}–${number(offset+result.results.length)} · alphabetical order`:'No organizations match this search. Try a different name, location or cause.';
    $('#registry-results').innerHTML=result.results.map(r=>`<article class="registry-row"><div><button class="registry-name" data-detail="${r.ein}">${esc(r.name)} <span>↗</span></button><p>${esc(r.city)}, ${esc(stateLabels[r.state]||r.state)} <span class="registry-ein">EIN ${r.ein.slice(0,2)}-${r.ein.slice(2)}</span></p><div class="tags"><span class="tag">${esc(r.category)}</span><span class="tag">${esc(r.organizationType)}</span></div></div><div class="registry-row-state"><span class="status">Assessment pending</span><button class="small-button" data-detail="${r.ein}">Inspect record →</button></div></article>`).join('')||'<div class="empty">Try a word from the organization’s official name, its city, or its EIN. The registry covers IRS-recognized 501(c)(3) entities; the assessment cohort also includes international organizations.</div>';
    $('#registry-pages').hidden=!result.total;
    $('#registry-prev').disabled=!offset;$('#registry-next').disabled=!result.hasMore;
    $('#registry-page-label').textContent=result.refineRequired?'Refine your search to explore more matches.':`Page ${number(offset/25+1)}`;
  } catch(error){
    if(error.name==='AbortError'||request!==sequence)return;
    $('#registry-status').textContent=error.message;
    $('#registry-results').innerHTML='<div class="empty"><p>Search could not finish. Your filters are preserved.</p><button class="small-button" data-retry>Try again</button></div>';
  } finally {if(request===sequence)$('#registry-results').setAttribute('aria-busy','false');}
}
$('#registry-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(debounce);offset=0;load();});
$('#registry-search').addEventListener('input',()=>{clearTimeout(debounce);offset=0;debounce=setTimeout(load,350);});
for(const id of ['registry-state','registry-cause'])$('#'+id).addEventListener('change',()=>{clearTimeout(debounce);offset=0;load();});
$('#registry-clear').addEventListener('click',()=>{clearTimeout(debounce);$('#registry-search').value='';$('#registry-state').value='';$('#registry-cause').value='';offset=0;load();});
$('#registry-prev').addEventListener('click',()=>{offset=Math.max(0,offset-25);load();$('#registry-form').scrollIntoView({block:'start'});});
$('#registry-next').addEventListener('click',()=>{offset+=25;load();$('#registry-form').scrollIntoView({block:'start'});});
$('#registry-results').addEventListener('click',e=>{const detail=e.target.closest('[data-detail]');if(detail)showDetail(detail.dataset.detail);if(e.target.closest('[data-retry]'))load();});
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{$('#registry-search').value=button.dataset.example;offset=0;clearTimeout(debounce);load();}));
$('#registry-detail-close').addEventListener('click',()=>$('#registry-detail').close());
load();
