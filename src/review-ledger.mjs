// The source ledger tracks review decisions, not verified effectiveness or deployment.
export const reviewStatuses=['included','queued','deferred','excluded'];
export function inspectReviewLedger(ledger,dataset){
  const fail=message=>{throw new Error('Review ledger: '+message)};
  const dated=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
  if(ledger.goal?.targetProfiles!==200||ledger.goal?.baselineProfiles!==82)fail('goal scope changed');
  if(!['in_progress','complete'].includes(ledger.goal.status))fail('invalid goal status');
  if(!dated(ledger.updatedAt)||!ledger.countingRule||!ledger.evidencePolicy)fail('missing date or evidence policy');
  if(!Array.isArray(ledger.entries)||!Array.isArray(ledger.progressChecklist))fail('missing decision/checklist arrays');
  const profiles=new Map(dataset.charities.map(c=>[c.id,c])),seen=new Set(),included=new Set();
  const summary=Object.fromEntries(reviewStatuses.map(s=>[s,0]));
  for(const e of ledger.entries){
    if(!e.id||seen.has(e.id))fail('duplicate or missing entry ID: '+e.id);seen.add(e.id);
    if(!reviewStatuses.includes(e.status)||!e.name||!e.reason||e.reason.length<30)fail('missing decision context: '+e.id);
    summary[e.status]++;
    if(e.status==='included'){
      const c=profiles.get(e.id);if(!c)fail('included entry has no assessment: '+e.id);
      if(e.name!==c.name||e.profilePath!=='/charities/'+c.id+'/'||e.decisionAt!==c.lastReviewed||e.reviewBatch!==(c.reviewBatch||'2026-10-06-seed'))fail('stale profile reference: '+e.id);
      if(e.independentHumanReview!=='pending'||e.affectedCommunityReview!=='pending')fail('unsupported human/community review claim; add an audited evidence schema before changing status: '+e.id);
      included.add(e.id);
    }else{
      if(profiles.has(e.id)||e.scores!==undefined||e.profilePath!==undefined)fail('unreviewed/excluded lead counted as assessment: '+e.id);
      if(!Array.isArray(e.sourceUrls)||!Array.isArray(e.evidenceGaps))fail('missing candidate provenance/gaps: '+e.id);
      if(e.status!=='queued'&&(!dated(e.decisionAt)||!e.sourceUrls.length))fail('undated or unsourced decision: '+e.id);
      if(e.status==='deferred'&&!e.evidenceGaps.length)fail('deferred entry needs next evidence: '+e.id);
      if(e.relatedProfileId&&!profiles.has(e.relatedProfileId))fail('invalid related profile: '+e.id);
      for(const url of e.sourceUrls)if(new URL(url).protocol!=='https:')fail('non-HTTPS source: '+e.id);
    }
  }
  if(included.size!==profiles.size)fail('assessment coverage mismatch');
  const checkIds=new Set();for(const item of ledger.progressChecklist){
    if(!item.id||checkIds.has(item.id)||!item.requirement||!['pending','in_progress','complete'].includes(item.status))fail('invalid progress item');checkIds.add(item.id);
  }
  for(const id of ['review-ledger','expand-cohort','open-source-review','checklist-breadth','preserve-method','release-validation','completion-audit'])if(!checkIds.has(id))fail('missing goal requirement: '+id);
  if(ledger.goal.status==='complete'&&(included.size<ledger.goal.targetProfiles||ledger.progressChecklist.some(i=>i.status!=='complete')))fail('premature completion');
  if(ledger.goal.status==='complete'){
    const audit=ledger.completionAudit,exportCheck=audit?.ownerExportCheck;
    if(!audit||!dated(audit.completedAt)||audit.profileCount!==ledger.goal.targetProfiles||audit.profileCount>included.size||audit.baselineCommit!==ledger.goal.baselineCommit||!audit.scope||audit.evidenceReport!=='docs/research.md'||!audit.publicationPolicy)fail('missing bounded completion audit');
    if(exportCheck?.confirmed!==true||!dated(exportCheck.confirmedAt)||!exportCheck.method||!exportCheck.statement||exportCheck.expectedProject!=='Fictional community access pilot')fail('missing owner export confirmation');
    if(audit.independentScoreValidation!=='pending'||audit.affectedCommunityValidation!=='pending')fail('unsupported independent validation claim');
  }
  return {...summary,target:ledger.goal.targetProfiles,remaining:Math.max(0,ledger.goal.targetProfiles-included.size)};
}
