# Deployment Notes

## GitHub Push From Local Terminal

Cloudflare deployment is triggered by pushing `main` to GitHub. If `git push origin main` fails with an error like `Error in the HTTP2 framing layer`, the local terminal is usually not using the same proxy path as the browser or desktop app.

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

The production deployment job is defined in `.github/workflows/deploy.yml`. It runs on pushes to `main` when `CLOUDFLARE_DEPLOY_FROM_GITHUB` is set to `true` in GitHub repository variables.
