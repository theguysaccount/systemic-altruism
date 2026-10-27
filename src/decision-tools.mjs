import {axes, assess, ordered, presets, method} from './scoring.mjs';

export async function copyText(text) {
  let timer;
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Clipboard unavailable')),1500);})
    ]);
  } finally {clearTimeout(timer);}
}

export const fitChecks = {
  outcome: 'Same intended outcome',
  population: 'Relevant people and geography',
  restrictions: 'Compatible grant restrictions',
  capacity: 'Current funding need and delivery capacity'
};

export function peersFor(records, baseline, weights = presets[method.defaultPreset], higherOnly = false) {
  if (!baseline) return [];
  const lower = assess(baseline.scores, weights).lower;
  return ordered(records.filter(c => c.id !== baseline.id && c.category === baseline.category &&
    (!higherOnly || assess(c.scores, weights).lower > lower)), weights);
}

export function comparePotential(baseline, candidate, weights = presets[method.defaultPreset]) {
  const a = assess(baseline.scores, weights), b = assess(candidate.scores, weights);
  return {baseline: a, candidate: b, delta: b.lower - a.lower,
    overlaps: Math.max(a.lower, b.lower) <= Math.min(a.upper, b.upper)};
}

export function fitStatus(checks = {}) {
  const values = Object.keys(fitChecks).map(key => checks[key] || 'unknown');
  if (values.includes('no')) return 'Fit concern';
  return values.every(value => value === 'yes') ? 'Fit marked by you · evidence review needed' : 'Mission fit needs review';
}

export function scenario({people, baseline, target, cost}) {
  if ([people, baseline, target, cost].some(v => v === '' || v === null || v === undefined)) return null;
  const n = Number(people), b = Number(baseline), t = Number(target), c = Number(cost);
  if (![n,b,t,c].every(Number.isFinite) || n <= 0 || c <= 0 || b < 0 || b > 100 || t < 0 || t > 100) return null;
  const additional = n * (t - b) / 100;
  return {additional, costPerAdditional: additional > 0 ? c / additional : null};
}

export function funderBrief({baseline, candidates, weights, mission, notes, checks, reviewedAt, origin}) {
  const lines = ['# Funding comparison brief', '', `Prepared: ${new Intl.DateTimeFormat('en-CA').format(new Date())}`,
    `Dataset updated: ${reviewedAt}`, `Weighting method: v${method.version}; explicit weights below`,
    `Practice source: ${method.source.url}`, `Mission to preserve: ${mission || 'Not specified'}`, '',
    'These are preliminary editorial mechanism assessments. A higher systemic-potential score does not establish greater effectiveness or justify replacing an existing grant.',
    'Candidates share a broad cause category. Same mission, beneficiaries, geography, restrictions and marginal funding need require separate verification.', '',
    '## Priority weights', Object.entries(weights).map(([k,v]) => `${axes[k]?.label || k}: ${v}`).join(' · '), '',
    `## Current charity: ${baseline.name}`, baseline.summary || '',
    `Potential: ${Math.round(assess(baseline.scores,weights).lower)}–${Math.round(assess(baseline.scores,weights).upper)}/100.`,
    `Scope: ${baseline.evaluationScope || 'Not specified'}`,
    `Profile reviewed: ${baseline.lastReviewed || 'Not specified'}`,
    `Limits: ${Array.isArray(baseline.limitations) ? baseline.limitations.join(' ') : baseline.limitations || 'Not specified'}`, '',
    'Sources:', ...baseline.sources.map(s=>`- ${s.title}: ${s.url}`), `Profile: ${origin}/charities/${baseline.id}/`, ''];
  for (const c of candidates) {
    const result = comparePotential(baseline, c, weights);
    lines.push(`## Alternative to investigate: ${c.name}`, `Fit: ${fitStatus(checks[c.id])}`,
      ...Object.entries(fitChecks).map(([key,label]) => `- ${label}: ${checks[c.id]?.[key] || 'unknown'}`),
      '', `Potential: ${Math.round(result.candidate.lower)}–${Math.round(result.candidate.upper)}/100; ${Math.round(result.candidate.coverage)}% weighted coverage.`,
      `Lower-bound difference: ${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(1)} points. ${result.overlaps ? 'Missing-data ranges overlap; the scores do not separate the candidates.' : 'Missing-data ranges do not overlap; qualitative scoring and causal uncertainty remain.'}`,
      `Mechanism: ${c.mechanism}`, `Scope: ${c.evaluationScope}`, `Profile reviewed: ${c.lastReviewed || 'Not specified'}`,
      `Limits: ${Array.isArray(c.limitations) ? c.limitations.join(' ') : c.limitations}`,
      `Next evidence question: ${c.falsifiableClaim}`, '', 'Sources:',
      ...c.sources.map(s => `- ${s.title}: ${s.url}`), `Profile: ${origin}/charities/${c.id}/`, '');
  }
  lines.push('## Reviewer notes', notes || 'Not added', '', '## Before a funding change',
    'Verify current program outcomes, costs, counterfactual, funding gap, community accountability and any disruption to existing beneficiaries. Obtain independent review and record the decision.',
    '', 'This document is a draft prepared by its user. No charity or funder has been contacted.');
  return lines.join('\n');
}

export function outcomePlan(values) {
  const labels = {
    organization:'Organization or project', problem:'Recurring problem', population:'People and setting',
    mechanism:'What changes in the system', outcome:'Observable outcome', evidence:'Evidence and comparison plan',
    agency:'How affected people influence decisions', risk:'Main risk and stop rule',
    owner:'Owner or reviewer', reviewDate:'Review date', people:'People in the scenario',
    baseline:'Baseline outcome rate (%)', target:'Target outcome rate (%)', cost:'Full program cost (USD)'
  };
  const lines = ['# Outcome and evidence plan', '', 'Draft planning document · not a measured result', ''];
  for (const [key,label] of Object.entries(labels)) lines.push(`## ${label}`, String(values[key] || 'Not specified'), '');
  const s = scenario(values);
  if (s) lines.push('## Planning scenario',
    `Additional successes if assumptions hold: ${s.additional.toLocaleString('en-US', {maximumFractionDigits:2})}.`,
    s.costPerAdditional === null ? 'No positive additional outcome in this scenario; no cost-per-additional-outcome estimate.' :
      `Full cost per additional success: $${s.costPerAdditional.toLocaleString('en-US', {maximumFractionDigits:2})}.`,
    'This arithmetic assumes comparable baseline and target populations, consistent measurement and the stated full cost. It does not establish attribution or forecast impact.', '');
  lines.push('## Review record', 'Record what happened, compare against the baseline, invite affected-community feedback, publish limits, and decide whether to adapt, stop or expand.');
  return lines.join('\n');
}
