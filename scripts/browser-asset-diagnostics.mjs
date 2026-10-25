import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Persist failures immediately: an assertion can prevent the final observations from returning.
export function observeBrowserAssets(page, origin, failedAssets, directory, width) {
  let navigation = null;
  const pending = new Map();
  const record = event => {
    if (directory) appendFileSync(resolve(directory, `browser-assets-${width}.jsonl`), JSON.stringify({
      at: new Date().toISOString(), page: page.url(), navigation, ...event,
    }) + '\n', { mode: 0o600 });
  };
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      navigation = request.url();
      record({ kind: 'navigation' });
    }
    pending.set(request, { url: request.url(), type: request.resourceType(), navigation, startedAt: Date.now() });
  });
  page.on('requestfinished', request => pending.delete(request));
  const tracked = request => new URL(request.url()).origin === origin && ['script', 'stylesheet'].includes(request.resourceType());
  page.on('response', response => {
    const request = response.request();
    const active = pending.get(request);
    if (active) active.status = response.status();
    if (['script', 'stylesheet'].includes(request.resourceType()) && response.status() >= 400) {
      failedAssets.push(response.url());
      record({ kind: 'http-error', url: response.url(), status: response.status(), type: request.resourceType() });
    }
  });
  page.on('requestfailed', request => {
    pending.delete(request);
    if (tracked(request)) {
      failedAssets.push(request.url());
      record({ kind: 'request-failed', url: request.url(), type: request.resourceType(), reason: request.failure()?.errorText ?? 'unavailable' });
    }
  });
  page.on('pageerror', error => record({ kind: 'page-error', message: error.message }));
  return {
    snapshot() {
      const now = Date.now();
      const requests = [...pending.values()].map(({ startedAt, ...request }) => ({ ...request, elapsedMs: now - startedAt }));
      record({ kind: 'pending-requests', requests });
      return requests;
    },
  };
}
