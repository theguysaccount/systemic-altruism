# Systemic Altruism

[Live tracker](https://charities.systemicaltruism.com/) · [Method](https://charities.systemicaltruism.com/methodology/) · [Open dataset](https://charities.systemicaltruism.com/api/v1/charities.json)

A beta charity tracker with a broad searchable IRS registry and an evidence-linked assessment cohort. It makes the proposed pathway to structural change visible: rules, incentives, institutions, knowledge and community power.

**This is a working beta, not a validated effectiveness ranking.** The 200 profiles contain AI-assisted qualitative mechanism sketches with sources and uncertainty, without independent human validation yet. Scores are editorial hypotheses, not demonstrated impact, cost-effectiveness estimates or donation recommendations. One hundred and forty-eight assessments were added in nine batches on 27 October. Across the cohort, 63 profiles have named repository/license checks; earlier profiles retain their own review dates. Meeting the source-snapshot target does not itself complete publication or the final goal audit.

## What works

- [Funder brief builder](https://charities.systemicaltruism.com/funders/): select a current charity, compare up to two alternatives in its broad cause, check mission fit, and copy or download a source-linked draft. Share links include selections and a priority lens, excluding mission text, notes and fit checks. No funder outreach is automated.
- [Charity outcome planner](https://charities.systemicaltruism.com/toolkit/): define a systemic mechanism, observable outcome, evidence plan, community role, stop rule and reviewer; export Markdown or JSON, or copy the plan. Drafts stay in browser-local storage. Optional full-cost scenarios are arithmetic assumptions, not measured or forecast impact.
- Search more than a million IRS-listed 501(c)(3) organizations by name, city or EIN, with filing-address location and NTEE cause filters.
- Inspect public identity and classification records; registry-only organizations have no systemic scores.
- Search and filter 200 assessment profiles across five cause areas, with focused views for license-checked open-source projects, enabling tools and partial checklist-source matches. License checks apply only to named repositories, not whole organizations, security, outcomes or free hosted services. These descriptive tags do not change scores or establish explicit adoption of the checklist. Known noncommercial and field-of-use restrictions cannot receive the open-source badge; source-visible tools can still appear in the broader tooling view.
- Default to Systemic Altruism practice weights (35/25/15/15/5/5), with linked provenance and an explicit numeric interpretation; the original balanced lens remains available unchanged.
- Adjust six priority weights and share a reproducible view URL.
- Compare up to three profiles side by side, including evidence gaps.
- Save a watchlist in browser-local storage.
- Export the current view as CSV; download the complete JSON dataset.
- Read crawlable profiles with source links, rationales, limitations and a testable next question.
- Inspect the method, selection coverage and licensing record.

The external-selection subset covers four GiveWell top programs, five Giving Green recommendations and ten ACE recommendations checked October 6, 2026; those labels were not re-audited during this expansion. Three other profiles have historical program reviews; 178 are illustrative inclusions. Absence from this cohort implies nothing about another organization's value. Giving Green and ACE already analyze systemic mechanisms; this project builds on their legwork.

## First-edition goal and review decisions

The active milestone is 200 distinct source-backed preliminary assessments, not every charity in the IRS registry. The [public review ledger](https://charities.systemicaltruism.com/api/v1/review-ledger.json) records included profiles, unverified queued leads, deferred evidence gaps, duplicate-project exclusions and the remaining goal checklist. The [data page](https://charities.systemicaltruism.com/data/#review-progress) displays source-snapshot progress; production publication is verified separately. `src/review-ledger.mjs` and regression tests reject orphan/duplicate profile references, stale review dates, scored candidates and premature completion. Candidate names do not establish nonprofit status or effectiveness. Independent human/affected-community review of this tracker's editorial scores remains pending; separately linked external program evaluations keep their own scope.

## Local development

Requires Node.js 24; no production JavaScript dependencies or API keys. The read-only registry endpoint queries a bundled compressed, read-only SQLite snapshot and never calls a paid model or third-party ratings API.

```sh
npm run build
npm test
npm run check
npm run preview
```

Visit http://localhost:4173. `PUBLIC_ORIGIN=https://your-domain.example npm run build` sets canonical and social URLs. The build outputs `dist/` for public pages and assets; `api/registry.js` serves the bundled read-only registry on Vercel. The included Node preview server runs both locally. A static-only host can serve the assessment cohort but needs an equivalent registry endpoint for directory search. Vercel runs build, tests and the release checker before every publication. An optional GitHub Actions template is in `docs/github-actions-check.yml`; it is not installed because the current GitHub authorization does not include workflow-write scope. The public read-only data endpoint is `/api/v1/charities.json`.

Public pages each have a distinct, checked 1200×630 share image. Cards are committed in `public/share/` to keep hosting builds dependency-free. To intentionally regenerate them after a route/title change, install Pillow from its normal package registry, run `SKIP_SHARE_CARDS=1 npm run build`, then `python3 scripts/share-cards.py` and build again. New artwork uses versioned image filenames to refresh social previews. `CHECK_ORIGIN=https://your-live-origin npm run check` verifies all deployed pages and card bytes.

Use `python3 scripts/share-cards.py --only /funders/ /toolkit/` to generate selected new cards while preserving reviewed artwork elsewhere. The homepage's animated Open Graph asset is added by `node social-motion/build.mjs`, which remains part of the Vercel build command.

## Scoring and uncertainty

The six dimensions are structural depth, institutional reach, durability, scalability, funding additionality and community agency. Default practice weights are 35/25/15/15/5/5; the original balanced 30/20/20/15/10/5 lens is retained. Each dimension is 0–4 or `null`. Unknown stays unknown.

The displayed lower bound sums reviewed weighted values. The upper bound allows all unreviewed dimensions to be 4. These are mathematical missing-data envelopes, **not statistical confidence intervals**. The default conservative display order uses the lower bound; overlapping ranges do not establish a winner. Scored dimensions also remain uncertain. Full method: [`src/scoring.mjs`](src/scoring.mjs), website `/methodology/` and [`docs/research.md`](docs/research.md).

## Evidence tooling and AI support

`scripts/registry-lookup.mjs` does a bounded live ProPublica identity lookup locally; it never publishes raw responses or treats registration as impact evidence. The website registry now comes directly from a dated IRS Business Master File extract, not ProPublica data. `npm run import:registry` discovers the current official four regional CSV files, verifies their combined count against the posting page, selects subsection 03 and status 01/02, deduplicates by EIN, and rebuilds the compressed read-only database. Raw CSVs, temporary import files and officer/address fields stay out of the repository. The compressed public identity database is versioned with its manifest. Server instances unpack this fixed snapshot into documented temporary space, verify its checksum and open it read-only; no visitor data is written into it. Python 3 with its standard library is sufficient for imports. The manifest records the snapshot date, source hashes, exact coverage, counts and selection. A new snapshot needs review, tests and a deployment before becoming public.

`scripts/extract-evidence.mjs` is a zero-network source-packet builder and local response validator. It reads a titled public text excerpt, prepares a provider-neutral extraction instruction, checks exact quotations and source URLs in an optional local model response, and writes an **unapproved** local review draft. It cannot change the public dataset or scores, and a citation match does not prove the claim is accurate. No model API integration, key, or paid model request is part of this release. Registry search is a separate first-party read-only HTTP endpoint. Future grant-supported work can add provider adapters and measured model evaluations after maintainer authorization.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). New organizations and score changes require public sources, an intervention scope, axis-specific rationale, limits and reviewer sign-off. Include a counterfactual and outcome test before proposing an effectiveness claim. No private beneficiary information. Model output must be checked before publication.

## License and funding

Software: [MIT](LICENSE). Original data annotations: [CC BY 4.0](data/LICENSE.md). Linked third-party sources retain their own rights; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No copied restricted API ratings or evaluator prose is included.

Compute support is being sought. No grant award, provider partnership, nonprofit eligibility, broad adoption or independently verified systemic outcome is claimed. No donation processing or affiliate fees are present.
