import {axes, assess, presets, method} from './scoring.mjs';
import {peersFor, comparePotential, fitChecks, fitStatus, funderBrief, copyText} from './decision-tools.mjs';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query = new URLSearchParams(location.search);
$('#funding-brief > div:last-child').insertAdjacentHTML('beforeend','<details class="brief-preview"><summary>Read or copy the complete brief</summary><button class="small-button" id="copy-brief">Copy brief text</button><pre id="brief-preview"></pre></details>');
let dataset;
try {
  const response = await fetch('/api/v1/charities.json');
  if (!response.ok) throw new Error('Unavailable');
  dataset = await response.json();
} catch {
  $('#peer-results').innerHTML = '<p class="empty">The assessment dataset could not load. Please refresh or browse the <a href="/data/">open data page</a>.</p>';
}
if (dataset) {
  const records = dataset.charities;
  let baseline = records.find(c => c.id === query.get('baseline')) || records[0];
  let lens = Object.hasOwn(presets, query.get('lens')) ? query.get('lens') : method.defaultPreset;
  let selected = new Set((query.get('alternatives') || '').split(',').filter(id =>
    records.some(c => c.id === id && c.id !== baseline.id && c.category === baseline.category)).slice(0,2));
  const checks = {};
  $('#baseline').innerHTML = [...records].sort((a,b) => a.name.localeCompare(b.name)).map(c =>
    `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#baseline').value = baseline.id;
  $('#funder-lens').value = lens;
  const scoreLabel = a => `${Math.round(a.lower)}–${Math.round(a.upper)}/100`;
  const buildBrief = () => funderBrief({baseline,candidates:records.filter(c=>selected.has(c.id)),weights:presets[lens],
    mission:$('#mission').value,notes:$('#funder-notes').value,checks,reviewedAt:dataset.reviewedAt,origin:location.origin});
  function updateBrief() {$('#brief-preview').textContent=selected.size ? buildBrief() : 'Choose at least one alternative to build a brief.';}
  function render() {
    const weights = presets[lens], score = assess(baseline.scores,weights);
    $('#baseline-summary').innerHTML = `<article class="baseline-card"><div class="eyebrow">Your current starting point</div><h2>${esc(baseline.name)}</h2><p>${esc(baseline.summary)}</p><div class="baseline-meta"><span class="status">${esc(baseline.category)}</span><b>${scoreLabel(score)} <small>systemic potential</small></b><a href="/charities/${baseline.id}/">Inspect assessment →</a></div></article>`;
    const peers = peersFor(records,baseline,weights,$('#higher-only').checked);
    const visible = peers.filter(c => !selected.has(c.id));
    const chosen = records.filter(c => selected.has(c.id));
    const candidates = [...chosen,...visible];
    $('#peer-count').textContent = `${peers.length} alternatives match the cause and score filter · ${selected.size} selected`;
    $('#peer-results').innerHTML = candidates.length ? candidates.map(c => {
      const comparison = comparePotential(baseline,c,weights), a = comparison.candidate;
      const delta = `${comparison.delta >= 0 ? '+' : ''}${comparison.delta.toFixed(1)}`;
      return `<article class="peer-card ${selected.has(c.id) ? 'shortlisted' : ''}"><div class="peer-head"><div><span class="tag">${esc(c.category)}</span><h3><a href="/charities/${c.id}/">${esc(c.name)} ↗</a></h3></div><div class="peer-score"><b>${scoreLabel(a)}</b><span>${delta} lower-bound points</span></div></div><p>${esc(c.summary)}</p><p class="tool-note">${comparison.overlaps ? 'Ranges overlap. Scores alone do not separate these charities.' : 'Missing-data ranges do not overlap. Scored judgments and causal impact remain uncertain.'} ${Math.round(a.coverage)}% weighted coverage.</p><details><summary>Inspect mechanism & evidence</summary><p><b>${esc(c.mechanism)}</b> · ${esc(c.evidenceLevel)}</p><p>${esc(c.evaluationScope)}</p><ul>${Object.entries(axes).map(([key,axis]) => `<li><b>${axis.label}: ${c.scores[key] === null ? 'Unreviewed' : c.scores[key]+'/4'}</b> · ${esc(c.rationales[key])}</li>`).join('')}</ul><p>${esc(Array.isArray(c.limitations) ? c.limitations.join(' ') : c.limitations)}</p><a class="text-link" href="/charities/${c.id}/#sources">Inspect ${c.sources.length} source links →</a></details><button class="small-button shortlist-button" data-shortlist="${c.id}" aria-pressed="${selected.has(c.id)}">${selected.has(c.id) ? '✓ Remove from brief' : '+ Add to funding brief'}</button>${selected.has(c.id) ? `<fieldset class="fit-checks"><legend>Is this a suitable replacement for your purpose?</legend>${Object.entries(fitChecks).map(([key,label]) => `<label>${label}<select data-fit="${key}" data-charity="${c.id}" aria-label="${esc(c.name)}: ${label}">${[['unknown','Not checked'],['yes','Yes · checked by me'],['no','No · concern']].map(([value,text]) => `<option value="${value}" ${checks[c.id]?.[key] === value ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`).join('')}<p id="fit-${c.id}" class="tool-note">${fitStatus(checks[c.id])}</p></fieldset>` : ''}</article>`;
    }).join('') : '<p class="empty">No alternatives match this score filter. Clear “higher lower-bound scores only” to inspect the full cause cohort. A higher score is not required to be worth investigating.</p>';
    $('#shortlist-status').textContent = chosen.length ? `${baseline.name} compared with ${chosen.map(c => c.name).join(' and ')}.` : 'Add up to two alternatives to build a comparison.';
    $('#download-brief').disabled = !chosen.length;
    $('#share-shortlist').disabled = !chosen.length;
    updateBrief();
  }
  $('#baseline').addEventListener('change',e => {
    baseline = records.find(c => c.id === e.target.value);
    selected.clear(); Object.keys(checks).forEach(key => delete checks[key]);
    history.replaceState(null,'',location.pathname);
    $('#funder-status').textContent = 'Starting charity changed. Shortlist and fit checks reset.';
    render();
  });
  $('#funder-lens').addEventListener('change',e => {lens=e.target.value;render();});
  $('#higher-only').addEventListener('change',render);
  $('#peer-results').addEventListener('click',e => {
    const button = e.target.closest('[data-shortlist]'); if (!button) return;
    const id=button.dataset.shortlist;
    if (selected.has(id)) selected.delete(id);
    else if (selected.size<2) selected.add(id);
    else {$('#funder-status').textContent='Choose up to two alternatives. Remove one to add another.';return;}
    render();
    $(`[data-shortlist="${id}"]`)?.focus({preventScroll:true});
  });
  $('#peer-results').addEventListener('change',e => {
    const {fit,charity}=e.target.dataset; if (!fit) return;
    checks[charity] ||= {}; checks[charity][fit]=e.target.value;
    $(`#fit-${charity}`).textContent=fitStatus(checks[charity]);
    updateBrief();
  });
  $('#mission').addEventListener('input',updateBrief);
  $('#funder-notes').addEventListener('input',updateBrief);
  $('#download-brief').addEventListener('click',() => {
    const brief=buildBrief();
    const blob=new Blob([brief],{type:'text/markdown;charset=utf-8'}), url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=`funding-brief-${baseline.id}.md`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#funder-status').textContent='Download requested. You can also read or copy the complete brief below.';
  });
  $('#copy-brief').addEventListener('click',async()=>{
    try{await copyText(buildBrief());$('#funder-status').textContent='Complete brief copied. Review its sources and open questions before using it.';}
    catch{$('#brief-preview').parentElement.open=true;$('#funder-status').textContent='Select and copy the brief shown below.';}
  });
  $('#share-shortlist').addEventListener('click',async() => {
    const params=new URLSearchParams({baseline:baseline.id,lens,alternatives:[...selected].join(',')});
    const url=location.origin+location.pathname+'?'+params;
    history.replaceState(null,'',url);
    try {await copyText(url);$('#funder-status').textContent='Comparison link copied. Mission, notes and fit checks are excluded.';}
    catch {$('#funder-status').textContent='The comparison is in your address bar. Copy that URL to share; notes are excluded.';}
  });
  render();
}
