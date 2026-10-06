# Systemic Altruism

[Live tracker](https://charities.systemicaltruism.com/) · [Method](https://charities.systemicaltruism.com/methodology/) · [Open dataset](https://charities.systemicaltruism.com/api/v1/charities.json)

An open-source charity tracker that makes the proposed pathway to structural change visible: rules, incentives, institutions, knowledge and community power.

**This is a working first release, not a validated effectiveness ranking.** The 40 starting profiles contain AI-assisted qualitative mechanism sketches with sources and uncertainty, without independent human validation yet. Scores are editorial hypotheses, not demonstrated impact, cost-effectiveness estimates or donation recommendations.

## What works

- Search and filter 40 profiles across five cause areas.
- Adjust six priority weights and share a reproducible view URL.
- Compare up to three profiles side by side, including evidence gaps.
- Save a watchlist in browser-local storage.
- Export the current view as CSV; download the complete JSON dataset.
- Read crawlable profiles with source links, rationales, limitations and a testable next question.
- Inspect the method, selection coverage and licensing record.

The current external-selection subset covers four GiveWell top programs, five Giving Green recommendations and ten ACE recommendations checked October 6, 2026. Three other profiles have historical program reviews; 18 are illustrative inclusions. Absence from this cohort implies nothing about another organization's value. Giving Green and ACE already analyze systemic mechanisms; this project builds on their legwork.

## Run locally

Requires Node.js 20+; no production JavaScript dependencies or API keys.

```sh
npm run build
npm test
npm run check
npm run preview
```

Visit http://localhost:4173. `PUBLIC_ORIGIN=https://your-domain.example npm run build` sets canonical and social URLs. The build outputs a portable static `dist/` directory. Vercel runs build, tests and the release checker before every publication. An optional GitHub Actions template is in `docs/github-actions-check.yml`; it is not installed because the current GitHub authorization does not include workflow-write scope. The public read-only data endpoint is `/api/v1/charities.json`.

Public pages each have a distinct, checked 1200×630 share image. Cards are committed in `public/share/` to keep hosting builds dependency-free. To intentionally regenerate them after a route/title change, install Pillow from its normal package registry, run a build, then `python3 scripts/share-cards.py` and build again. `CHECK_ORIGIN=https://your-live-origin npm run check` verifies all deployed pages and card bytes.

## Scoring and uncertainty

The six dimensions are structural depth, institutional reach, durability, scalability, funding additionality and community agency. Default weights are 30/20/20/15/10/5. Each dimension is 0–4 or `null`. Unknown stays unknown.

The displayed lower bound sums reviewed weighted values. The upper bound allows all unreviewed dimensions to be 4. These are mathematical missing-data envelopes, **not statistical confidence intervals**. The default conservative display order uses the lower bound; overlapping ranges do not establish a winner. Scored dimensions also remain uncertain. Full method: [`src/scoring.mjs`](src/scoring.mjs), website `/methodology/` and [`docs/research.md`](docs/research.md).

## Evidence tooling and AI support

`scripts/registry-lookup.mjs` does a bounded live ProPublica identity lookup locally; it never publishes raw responses or treats registration as impact evidence. The direct IRS sources listed in `THIRD_PARTY_NOTICES.md` are the preferred foundation for a future redistributable registry.

`scripts/extract-evidence.mjs` is a zero-network source-packet builder and local response validator. It reads a titled public text excerpt, prepares a provider-neutral extraction instruction, checks exact quotations and source URLs in an optional local model response, and writes an **unapproved** local review draft. It cannot change the public dataset or scores, and a citation match does not prove the claim is accurate. No model API integration, key, or paid request is part of this release. Future grant-supported work can add provider adapters and measured model evaluations after maintainer authorization.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). New organizations and score changes require public sources, an intervention scope, axis-specific rationale, limits and reviewer sign-off. Include a counterfactual and outcome test before proposing an effectiveness claim. No private beneficiary information. Model output must be checked before publication.

## License and funding

Software: [MIT](LICENSE). Original data annotations: [CC BY 4.0](data/LICENSE.md). Linked third-party sources retain their own rights; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No copied restricted API ratings or evaluator prose is included.

Compute support is being sought. No grant award, provider partnership, nonprofit eligibility, broad adoption or independently verified systemic outcome is claimed. No donation processing or affiliate fees are present.
