import {scenario, outcomePlan, copyText} from './decision-tools.mjs';
const $=s=>document.querySelector(s), form=$('#outcome-form'), storageKey='sa-outcome-plan-v1';
const fields=[...form.elements].filter(element=>element.name);
const required=['organization','problem','population','mechanism','outcome','evidence','agency','risk','owner','reviewDate'];
$('#download-plan-json').insertAdjacentHTML('afterend','<button class="button secondary" id="copy-plan">Copy plan text</button>');
const values=()=>Object.fromEntries(fields.map(element=>[element.name,element.value]));
let storageAvailable=true;
try {
  const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
  for (const field of fields) if (typeof saved[field.name]==='string') field.value=saved[field.name];
} catch {storageAvailable=false;}
function update(save=true) {
  const v=values();$('#plan-output').textContent=outcomePlan(v);
  const count=required.filter(key=>v[key].trim()).length;
  $('#plan-progress').textContent=`${count} of ${required.length} planning sections filled · completion does not validate the claims`;
  const s=scenario(v);
  $('#scenario-result').textContent=!s ? 'Enter a positive population and cost, and rates between 0 and 100.' :
    `${s.additional.toLocaleString('en-US',{maximumFractionDigits:2})} additional successes if assumptions hold. `+
    (s.costPerAdditional===null ? 'No positive additional outcome; cost per additional success is undefined.' :
      `$${s.costPerAdditional.toLocaleString('en-US',{maximumFractionDigits:2})} per additional success. `)+
    'Scenario arithmetic only; attribution and comparability need evidence.';
  if (save) {
    try {localStorage.setItem(storageKey,JSON.stringify(v));storageAvailable=true;} catch {storageAvailable=false;}
    $('#plan-status').textContent=storageAvailable ? 'Draft saved on this browser.' : 'Browser storage unavailable. Download your plan before leaving.';
  }
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',()=>update());
const example={organization:'Fictional community access pilot',problem:'Partner organizations repeatedly ask households for the same eligibility documents.',population:'100 consenting households using three partner services in one town.',mechanism:'Partners agree on a reusable application and a consented document checklist; households can correct records and use an offline route.',outcome:'The share of eligible households completing an application within 30 days increases from 40% to a target of 60%.',evidence:'Compare baseline and pilot cohorts with the same eligibility rules and follow-up window. Record completion, staff time, full costs, dropouts and errors. A before/after comparison alone cannot establish attribution.',agency:'A paid participant panel approves the form and reviews complaints. Participation is voluntary and a paper process remains available.',risk:'Pause reuse if a consent error exposes information or applicants lose access. The service lead must investigate and report the remedy.',owner:'Pilot lead and participant review panel',reviewDate:'',people:'100',baseline:'40',target:'60',cost:'10000'};
$('#load-example').addEventListener('click',()=>{
  if(fields.some(field=>field.value.trim())&&!confirm('Replace the current browser draft with the fictional example? Download it first if you want to keep it.'))return;
  for(const field of fields)field.value=example[field.name]||'';
  update();$('#plan-status').textContent='Fictional example loaded and saved on this browser. Replace assumptions with your own evidence.';
});
function download(content,type,filename) {
  const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('#download-plan').addEventListener('click',()=>download(outcomePlan(values()),'text/markdown;charset=utf-8','outcome-and-evidence-plan.md'));
$('#download-plan-json').addEventListener('click',()=>download(JSON.stringify({version:1,status:'draft',...values()},null,2),'application/json','outcome-and-evidence-plan.json'));
$('#copy-plan').addEventListener('click',async()=>{
  try{await copyText(outcomePlan(values()));$('#plan-status').textContent='Complete plan copied.';}
  catch{$('#plan-status').textContent='Select and copy the plan shown above.';}
});
$('#clear-plan').addEventListener('click',()=>{
  if(!confirm('Clear the outcome plan stored in this browser? Download a copy first if you want to keep it.'))return;
  fields.forEach(field=>field.value='');
  try{localStorage.removeItem(storageKey);}catch{}
  update(false);$('#plan-status').textContent='Browser draft cleared.';
});
update(false);
if(!storageAvailable)$('#plan-status').textContent='Browser storage unavailable. Download your plan before leaving.';
