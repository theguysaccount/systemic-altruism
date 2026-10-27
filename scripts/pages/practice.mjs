import {axes,method,presetLabels,presets} from '../../src/scoring.mjs';

export const priorityOptions = () => Object.entries(presetLabels)
  .map(([key,label])=>`<option value="${key}">${label}</option>`).join('');

const reasons = {
  depth:'Find shared upstream causes and change the rules, incentives or paradigms producing recurring need. This gets the largest share because leverage is the practice’s central question.',
  reach:'Look for a lever shared across problems and institutions: one change could enable other improvements. This measures potential institutional scope, not an audience count or a causal multiplier.',
  durability:'Prefer a beachhead whose incentives and institutional adoption could sustain change beyond repeated delivery. Persistence must still be tested; ambition alone earns no durability bonus.',
  scalability:'Prefer a focused starting point that can compound and is open for others to build on. Reusable tools, standards and knowledge can enable other charities; software is not automatically effective or free to implement.',
  additionality:'Ask whether new resources unlock a real bottleneck, including redirection of existing flows. This remains a mandatory funding diligence question even though it has a smaller share in a design-potential index.',
  agency:'Ask who gets to decide and whether participation comes with consequential rights. This is an explicit accountability safeguard, not a claim that the source prescribes a five-percent agency score.'
};

export function practiceSection(esc){
  return `<section id="default-weights"><h2>The default: Systemic Altruism practice</h2>
  <p>Based on <a href="${method.source.url}">${esc(method.source.title)}</a>, published and checked ${method.source.accessedAt}. The source describes a practice, <b>not a numerical charity-rating formula</b>. The percentages below are this project’s proposed interpretation, not empirically calibrated multipliers or independent validation.</p>
  <div class="callout"><b>60% upstream leverage · 30% persistence and replication · 10% funding and accountability.</b><br>We preserve the six existing axes so earlier profile judgments and explicit-weight links remain inspectable. The checklist’s six sources—story, coordination, vision, attention, status and gatekeepers—are not these six scoring axes. Sharing its vocabulary is not evidence of impact.</div>
  ${Object.entries(axes).map(([key,axis])=>`<h3>${esc(axis.label)} · ${presets[method.defaultPreset][key]}%</h3><p>${esc(reasons[key])}</p>`).join('')}
  <h3>How the practice becomes a review</h3><ol>
  <li><b>Map symptoms:</b> define the recurring problem, affected people and observable baseline.</li>
  <li><b>Find shared sources:</b> state the proposed upstream cause and how it reaches otherwise distinct problems. Check whether it can be redirected and whether a small team can test an intervention.</li>
  <li><b>Rank leverage:</b> distinguish changing a paradigm, goal, rule or routine from changing a quantity. Our depth and reach axes are approximations, not a validated implementation of a leverage hierarchy.</li>
  <li><b>Find the flip:</b> explain what redirects existing incentives or resources and what could go wrong.</li>
  <li><b>Choose a beachhead:</b> specify a small buildable project, reuse route, sustainment mechanism and scope.</li>
  <li><b>Measure early signals:</b> precommit an adoption or behavior indicator, counterfactual, review date and stop rule; trace it separately to downstream outcomes.</li>
  <li><b>Iterate openly:</b> publish reasoning, evidence, limits and corrections. Use the <a href="/toolkit/">outcome planner</a> to draft this record.</li></ol>
  <p><b>Evidence is not a popularity bonus.</b> Early indicators and open reporting are review requirements, not extra points for an ambitious story. A software download is not adoption, an introduction is not collaboration, and adoption is not improved welfare. A high structural score cannot waive independent outcome, cost, funding-gap, community-rights or harm review.</p>
  <h3>What changed in version ${method.version}</h3>
  <p>The previous balanced weights were 30 / 20 / 20 / 15 / 10 / 5 in the axis order above. They remain selectable as “Original balanced (v0.1)”; existing funder links with <code>lens=balanced</code> and complete explicit-weight tracker links keep those weights. Fresh visits, resets and profile summaries now use 35 / 25 / 15 / 15 / 5 / 5. Existing axis values were not upgraded by changing the lens.</p>
  <p>For profiles missing additionality and agency, reviewed-weight coverage becomes 90% instead of 85% solely because those axes now total 10% rather than 15%. <b>No new evidence is implied by that increase.</b> Changing weights can reorder profiles; inspect the original lens and the community-power lens to see sensitivity. The range still does not capture all uncertainty in the assessed axes.</p>
  <p><b>Affiliation:</b> Humanity’s Checklist and this tracker share a maintainer. This is an openly stated normative foundation, not an independent evaluator endorsement. The source’s wider claims about resolving world problems are hypotheses; the scoring method does not certify them.</p></section>`;
}
