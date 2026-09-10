# NTE Canary Cutover Runbook

This runbook is for an explicitly approved production canary. Until approval, keep both `NTE_ENABLED` values false.

## Current Status

The independent NTE Worker has an audited shared shell, language switcher, breadcrumbs, footer, map route, structured data, and the full 504-page route set. The 2026-09-09 local full audit, content audit, and site audit all pass with zero findings; the site audit also reports a complete 504-entry sitemap. Router tests pass 6/6.

The Worker remains preview-only: its pages are `noindex,nofollow`, its `robots.txt` disallows crawling, and both production and staging Router `NTE_ENABLED` values remain `false`. Content parity is a controlled migration contract rather than a promise to reproduce authenticated or interactive main-site features in the independent Worker. Any production canary still requires the human baselines below.

The Router must remain disabled until a production-to-staging parity audit confirms that each production NTE URL planned for forwarding retains its status, primary content, title, description, canonical, hreflang, internal-link floor, structured-data floor, breadcrumb, shared-site navigation, and shared footer. The Router allowlist includes `/[lang]/nte/map`.

## Preconditions

- NTE Worker bundle verification, Router tests, and the production web test suite pass.
- `NTE_PREVIEW_ONLY=true node scripts/nte-seo-parity.mjs` produces a current report with no staging-side failures; any production-unavailable samples are retried from a network that can reach `gachia.com` and the Worker host.
- Staging pages have been checked for layout, assets, status, metadata, canonical, hreflang, structured data, shared navigation/footer, breadcrumbs, and noindex.
- Production Search Console and Cloudflare error-rate baselines are recorded.
- A rollback command is ready and the on-call owner is available.

## Cutover

1. Change only the production `NTE_ENABLED` value in `apps/router/wrangler.jsonc` to `true`; keep `NTE_CANARY_COOKIE=enabled`.
2. Deploy the Router with `npx wrangler deploy --config apps/router/wrangler.jsonc`.
3. Verify the approved NTE URL sample with `Cookie: gachia_nte_canary=enabled`; control requests without that cookie must remain on `MAIN_SITE`.
4. Monitor 5xx rate, latency, cache errors, and Search Console signals before expanding traffic.

## Rollback

Set production `NTE_ENABLED` back to `false` and redeploy the same Router config. The Router then sends every request to `MAIN_SITE`. Alternatively, changing `NTE_CANARY_COOKIE` invalidates the canary cookie immediately.

Never attach a new production route or modify `apps/web` as part of this canary.
