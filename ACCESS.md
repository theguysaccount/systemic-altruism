# Tracker deployment access

Verified tracker: https://charities.systemicaltruism.com/
Repository: https://github.com/theguysaccount/systemic-altruism

The tracker is hosted on Vercel, not in the apex site's WordPress files.
The existing systemicaltruism.com movement site remains on SiteGround; its
file access, hosting root, DNS/account actions and billing are separate.

Vercel project: `systemic-altruism`, `prj_TBuACdMcmz3ka0whmDAZxgoEWSO6`.
Linked scope: `jacksonjezio-7345s-projects`, `team_7w7ZYLNvQsncp5BCqsKzeIpk`.
Use the already authenticated Vercel CLI or documented connector. Never
extract browser credentials or place secrets in this repository.

Production Git integration builds main. Before pushing a release:

```sh
npm run build
npm test
npm run check
git diff --check
```

For a staged production release through the linked CLI, deploy the tested
commit with `vercel deploy --prod --skip-domain`, inspect it, verify the
registry endpoint and unique social cards, then promote that deployment.
Verify the actual project and team before any mutation. Git integration may
also build the same commit; reconcile deployment state before promoting.

After publication:

```sh
CHECK_ORIGIN=https://charities.systemicaltruism.com npm run check
```

The script verifies all public routes, metadata, exact card bytes and an
actual filtered registry response. Check desktop and mobile layouts through
the browser tool and close task-created tabs when finished. Prior immutable
Vercel deployments and Git commits provide the rollback path. A rollback
can alter automatic promotion; inspect the provider state before the next
release. No DNS, apex replacement, purchase or billing change is needed for
routine tracker maintenance.
