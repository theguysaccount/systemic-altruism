import {axes,presets,assess,ordered} from './scoring.mjs';
const data=await fetch('/api/v1/charities.json').then(r=>{if(!r.ok)throw new Error('Dataset unavailable');return r.json()});
const records=data.charities;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search);
let weights={...presets.balanced},category=query.get('cause')||'all',search=query.get('q')||'',savedOnly=false;
try{if(query.has('weights')){const v=JSON.parse(query.get('weights'));for(const k of Object.keys(axes))if(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=100)weights[k]=v[k];}}catch{}
let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('sa-watchlist')||'[]'));}catch{}
let selected=new Set((query.get('compare')||'').split(',').filter(id=>records.some(c=>c.id===id)).slice(0,3));
const pct=x=>Math.round(x);
function updateTray(){ $('#compare-tray').hidden=!selected.size;$('#compare-count').textContent=`${selected.size} of 3 selected`;$('#compare-open').disabled=selected.size<2;}
function render(){
  const text=search.toLowerCase();
  const filtered=ordered(records.filter(c=>(category==='all'||c.category===category)&&(!savedOnly||saved.has(c.id))&&[c.name,c.category,c.mechanism,c.summary].join(' ').toLowerCase().includes(text)),weights);
  $('#result-count').textContent=`${filtered.length} of ${records.length} organizations · sorted by documented lower bound`;
  $('#results').innerHTML=filtered.length?filtered.map((c,i)=>{
    const a=assess(c.scores,weights);
    return `<article class="charity-row"><span class="rank">${String(i+1).padStart(2,'0')}</span><div><a class="charity-name" href="/charities/${esc(c.id)}/">${esc(c.name)} ↗</a><p class="charity-desc">${esc(c.summary)}</p><div class="tags"><span class="tag">${esc(c.category)}</span>${c.externalEvaluator?`<span class="tag evaluator">${esc(c.evaluatorLabel)}</span>`:'<span class="tag">Illustrative inclusion</span>'}</div></div><div class="score"><b>${pct(a.lower)}–${pct(a.upper)}</b><span> /100</span><div class="score-line" aria-hidden="true"><div class="possible" style="width:${a.upper}%"></div><div class="supported" style="width:${a.lower}%"></div></div><small>${pct(a.coverage)}% of weighted axes reviewed</small></div><div class="actions"><button class="icon-button ${saved.has(c.id)?'selected':''}" data-save="${esc(c.id)}" aria-pressed="${saved.has(c.id)}" aria-label="${saved.has(c.id)?'Remove':'Save'} ${esc(c.name)} to watchlist">${saved.has(c.id)?'★':'☆'}</button><button class="icon-button ${selected.has(c.id)?'selected':''}" data-compare="${esc(c.id)}" aria-pressed="${selected.has(c.id)}" aria-label="${selected.has(c.id)?'Remove':'Add'} ${esc(c.name)} ${selected.has(c.id)?'from':'to'} comparison">${selected.has(c.id)?'✓':'+'}</button><a href="/charities/${esc(c.id)}/">Review evidence →</a></div></article>`;
  }).join(''):'<p class="empty">No organizations match. Try a different cause or search.</p>';
  updateTray();
}
const categories=[...new Set(records.map(c=>c.category))].sort();
$('#cause-filter').innerHTML='<option value="all">All cause areas</option>'+categories.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
if(!categories.includes(category))category='all';$('#cause-filter').value=category;$('#search').value=search;
$('#weights').innerHTML=Object.entries(axes).map(([k,a])=>`<div class="weight"><label for="weight-${k}">${a.label}<output id="value-${k}">${weights[k]}</output></label><input id="weight-${k}" data-axis="${k}" type="range" min="0" max="100" value="${weights[k]}" aria-label="${a.label} weight"></div>`).join('');
$('#weights').addEventListener('input',e=>{const k=e.target.dataset.axis;if(!k)return;weights[k]=+e.target.value;$(`#value-${k}`).value=weights[k];$('#preset').value='custom';render();});
function setPreset(name){weights={...presets[name]};for(const k of Object.keys(axes)){$(`#weight-${k}`).value=weights[k];$(`#value-${k}`).value=weights[k];}$('#preset').value=name;render();}
$('#preset').addEventListener('change',e=>{if(presets[e.target.value])setPreset(e.target.value)});
$('#reset-weights').addEventListener('click',()=>setPreset('balanced'));
$('#search').addEventListener('input',e=>{search=e.target.value;render();});
$('#cause-filter').addEventListener('change',e=>{category=e.target.value;render();});
$('#saved-filter').addEventListener('click',e=>{savedOnly=!savedOnly;e.currentTarget.classList.toggle('active',savedOnly);e.currentTarget.setAttribute('aria-pressed',savedOnly);render();});
$('#all-filter').addEventListener('click',()=>{savedOnly=false;category='all';search='';$('#saved-filter').classList.remove('active');$('#saved-filter').setAttribute('aria-pressed','false');$('#cause-filter').value='all';$('#search').value='';render();});
$('#results').addEventListener('click',e=>{
  const save=e.target.closest('[data-save]'),compare=e.target.closest('[data-compare]');
  if(save){const id=save.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('sa-watchlist',JSON.stringify([...saved]));}catch{$('#status-message').textContent='Watchlist available for this visit; browser storage is blocked.'}render();}
  if(compare){const id=compare.dataset.compare;if(selected.has(id))selected.delete(id);else if(selected.size<3)selected.add(id);else{$('#status-message').textContent='Compare up to 3 organizations. Remove one to add another.';return;}render();}
});
$('#compare-clear').addEventListener('click',()=>{selected.clear();render();});
$('#compare-close').addEventListener('click',()=>$('#comparison').close());
$('#compare-open').addEventListener('click',()=>{
  const chosen=records.filter(c=>selected.has(c.id));
  $('#comparison-table').innerHTML=`<thead><tr><th>Review dimension</th>${chosen.map(c=>`<th><a href="/charities/${esc(c.id)}/">${esc(c.name)}</a></th>`).join('')}</tr></thead><tbody><tr><th>Potential range</th>${chosen.map(c=>{const a=assess(c.scores,weights);return `<td><b>${pct(a.lower)}–${pct(a.upper)}/100</b><small>${pct(a.coverage)}% weighted coverage. Editorial hypothesis.</small></td>`}).join('')}</tr>${Object.entries(axes).map(([k,a])=>`<tr><th>${a.label}</th>${chosen.map(c=>`<td><b>${c.scores[k]===null?'Unreviewed':`${c.scores[k]}/4`}</b><small>${esc(c.rationales[k])}</small></td>`).join('')}</tr>`).join('')}<tr><th>Evidence & limits</th>${chosen.map(c=>`<td>${esc(c.evidenceLevel)}<small>${esc(Array.isArray(c.limitations)?c.limitations.join(' '):c.limitations)}</small><a href="/charities/${esc(c.id)}/#sources">${c.sources.length} source links →</a></td>`).join('')}</tr></tbody>`;
  $('#comparison').showModal();
});
$('#share-view').addEventListener('click',async()=>{
  const q=new URLSearchParams();if(category!=='all')q.set('cause',category);if(search)q.set('q',search);q.set('weights',JSON.stringify(weights));if(selected.size)q.set('compare',[...selected].join(','));
  const url=location.origin+'/?'+q;
  history.replaceState(null,'',url+'#explore');
  try{await navigator.clipboard.writeText(url);$('#status-message').textContent='View link copied. It includes your weights, search and comparison.';}catch{$('#status-message').textContent='Your view is in the address bar. Copy that URL to share.';}
});
$('#export-csv').addEventListener('click',()=>{
  const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
  const rows=[['name','category','lower_bound','upper_bound','weighted_coverage','status','sources'],...ordered(records.filter(c=>(category==='all'||c.category===category)&&(!savedOnly||saved.has(c.id))&&[c.name,c.category,c.mechanism,c.summary].join(' ').toLowerCase().includes(search.toLowerCase())),weights).map(c=>{const a=assess(c.scores,weights);return [c.name,c.category,a.lower.toFixed(2),a.upper.toFixed(2),a.coverage.toFixed(2),'Preliminary editorial hypothesis',c.sources.map(s=>s.url).join(' | ')];})];
  const blob=new Blob([rows.map(r=>r.map(quote).join(',')).join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='systemic-altruism-reviewed-cohort.csv';link.click();URL.revokeObjectURL(url);
});
render();
