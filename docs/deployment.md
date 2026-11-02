# Deployment Notes

## Current Release Policy (2026-11-02, R20)

Content publication is initiated only from the installed local Payload publisher. Both repository variables, `CLOUDFLARE_DEPLOY_FROM_GITHUB` and `CLOUDFLARE_DEPLOY_STAGING_FROM_GITHUB`, are currently `false`; the separate Genshin preview workflow is disabled. **A normal source push, including a push to main, is not the current content deployment path.** The Payload verification workflow only tests the exact maintenance branch and has no deployment credentials or deployment steps.

Genshin/Main and NTE/Main controlled publication, renewal and compatible recovery are installed, but a real edited candidate's cloud preview/promotion/recovery has not yet been accepted. Ordinary production deploy/promote/rollback commands fail closed. The project has ten deployed Workers; the publisher's protected snapshot covers seven, not all staging deployments/settings. R20 adds read-only ten-Worker observation and pinned asset/local-recovery preparation commands; the new inventory and Router gates passed actual GitHub CI. This does not authorize staging deployment or prove real editorial cloud publication. See the [project/Worker map](payload-project-worker-map.md), [release entrypoints](production-release-entrypoints.md) and [current operator runbook](payload-operator-runbook.md).

## GitHub Push From Local Terminal

The commands in this section are transport troubleshooting examples, not instructions to push or authorize a release. Historically a push to `main` could trigger Cloudflare deployment; the current deployment variables disable that path. If an explicitly intended `git push origin main` fails with an error like `Error in the HTTP2 framing layer`, the local terminal may not be using the same proxy path as the browser or desktop app.

Use this one-off push command first:

```bash
HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890 ALL_PROXY=socks5://127.0.0.1:7890 git -c http.version=HTTP/1.1 push origin main
```

If the local proxy port is different, replace `7890` with the active local proxy port.

To make the HTTP/1.1 fallback persistent for this repo:

```bash
git config http.version HTTP/1.1
```

Then push with proxy variables:

```bash
HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890 ALL_PROXY=socks5://127.0.0.1:7890 git push origin main
```

## Cloudflare Verification Before Push

Before pushing deployment-sensitive changes, run:

```bash
pnpm --filter web exec opennextjs-cloudflare build
pnpm --filter web exec wrangler versions upload --dry-run --env ""
```

Keep the dry-run gzip size below the Cloudflare Workers Free limit. Recent known-good value after SEO and payload cleanup:

```text
Total Upload: 16667.48 KiB / gzip: 2880.09 KiB
```

## GitHub Actions Trigger

The historical production deployment job is defined in `.github/workflows/deploy.yml`. Its deployment gate requires `CLOUDFLARE_DEPLOY_FROM_GITHUB=true`; this variable is currently `false`. Do not re-enable it to bypass local-only content publication. Running source verification is not evidence of a production deployment.
