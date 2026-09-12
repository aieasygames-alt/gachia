# Azur Promilia Staging And Canary Runbook

Azur Promilia is currently a `live` independent Worker. Production Router routing is enabled, while each data record still requires explicit source status and review.

## Guardrails

- Production `AZUR_PROMILIA_ENABLED` is `true`; staging remains disabled and canary-gated.
- `GAME_DEPLOYMENTS['azur-promilia'].status` is `live`, so public navigation and sitemap inclusion are intentional.
- Use `AZUR_PROMILIA_DEPLOYMENT_MODE=preview` for any new staging Worker; preview must emit `noindex,nofollow` and disallow crawling.
- Router uses Service Bindings. Do not proxy to a public Worker URL.

## Staging Verification

1. Deploy `gachia-game-azur-promilia-staging` only.

From the repository root, the exact command is:

```bash
pnpm --filter @gachia/game-azur-promilia deploy:staging
```

The command uses the `staging` Wrangler environment and does not modify the production router.
2. Run the protected Worker smoke check:

```bash
AZUR_PROMILIA_PREVIEW_ORIGIN=https://<preview-origin> pnpm --filter @gachia/game-azur-promilia smoke
```

Equivalent package script:

```bash
AZUR_PROMILIA_PREVIEW_ORIGIN=https://<preview-origin> pnpm --filter @gachia/game-azur-promilia smoke:staging
```

3. Run the staging SEO check:

```bash
AZUR_PROMILIA_STAGING_ORIGIN=https://<preview-origin> pnpm --filter @gachia/game-azur-promilia seo:parity
```

4. Confirm each route responds with 200, has a `gachia.com` canonical and complete `zh-Hans`/`en`/`ja`/`x-default` hreflang, emits JSON-LD, and requests namespaced assets under `/_games/azur-promilia/_next/`.
5. Inspect responsive layout and 404 behavior manually in a browser.

## Approved Production Canary

Only after content review and staging acceptance:

1. Production routing is already enabled. For a future canary, set `AZUR_PROMILIA_CANARY_COOKIE=enabled` before exposing the change.
2. Deploy only `gachia-router`.
3. Verify a request with `Cookie: gachia_azur_promilia_canary=enabled` reaches the game Worker; a request without that cookie must continue to reach `MAIN_SITE`.
4. Monitor Worker 5xx, asset 404, latency, D1/R2 errors, and browser-visible rendering before wider routing.

## Rollback

Set production `AZUR_PROMILIA_ENABLED` to `false` and redeploy `gachia-router`. The same URLs immediately fall back to `MAIN_SITE`, without redirects. Changing `AZUR_PROMILIA_CANARY_COOKIE` also invalidates existing canary cookies.

## Public Launch

After the canary remains healthy and the first official-content package is approved:

1. Set `GAME_DEPLOYMENTS['azur-promilia'].status` to `live`.
2. Enable the production Router route after the canary is expanded.
3. Confirm the root sitemap includes the game routes and submit the sitemap in Search Console.
