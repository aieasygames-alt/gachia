# NTE Worker Preview Runbook

This first migration stage does not attach `gachia-router` to `gachia.com` and does not alter the existing `gachia` Worker.

## Guardrails

- `apps/router/wrangler.jsonc` sets `NTE_ENABLED` to `false` in every environment.
- The Router always falls back to `MAIN_SITE` while that value is false.
- `apps/game-nte` is preview-only and sends `noindex, nofollow`; its robots route disallows crawling.
- Do not change `NTE_ENABLED` to `true` or add a `gachia.com/*` route until the acceptance checklist below passes.

## Before enabling routing

1. Replace the NTE preview placeholder with NTE-only pages and data imports. Do not reuse the current generic `[game]` tree, because it imports every game's branches.
2. Deploy and test the game Worker through a protected preview URL.
3. Compare representative existing NTE URLs against preview output for status, title, description, canonical, hreflang, JSON-LD, primary content, and all JS/CSS/RSC/image responses.
4. Configure a staging Router -> staging Main/NTE binding chain and repeat tests under the real path structure.
5. Establish Search Console and Cloudflare error-rate baselines, prepare a Router rollback target, then perform an approved production cutover.

The repository workflow `.github/workflows/nte-preview.yml` runs the non-deploying checks on NTE changes. A deployed preview can be smoke-tested with `NTE_PREVIEW_ORIGIN=https://<protected-preview-host> pnpm --filter @gachia/game-nte smoke`; the script refuses to run without an explicit origin.

## Current staging deployment

- The former dedicated NTE staging Worker has been retired. Use a temporary protected preview origin when parity testing is required.
- Router Worker: `gachia-router-staging`
- Router staging was temporarily enabled for manual validation on 2026-09-08. Restore `NTE_ENABLED` to `false` after validation; production remains disabled.

## Latest deployment

- NTE staging Worker version: `b53047fa-aa2e-46fd-a9c4-e0860603906e`
- Router staging version: `fc1c3f66-1228-44c0-9fcb-f054d516e1c9`
- Router staging is currently disabled (`NTE_ENABLED=false`).
- Automated workers.dev smoke checks from the deployment terminal are blocked by an upstream TLS `ECONNRESET`; browser validation remains required before any cutover.

## Recorded migration baseline

On 2026-09-08, the existing production NTE home pages in Chinese, English, and Japanese, plus Chinese character, guide, and disk-set pages, returned HTTP `200` with their canonical URLs on `https://gachia.com`. Preserve the titles and canonical URLs captured by the migration validation run before any cutover.
