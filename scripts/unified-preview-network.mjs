import assert from 'node:assert/strict';
import { request as playwright } from '@playwright/test';

export function unifiedPreviewProxy(value) {
  assert(typeof value === 'string', 'Explicit preview proxy required');
  const url = new URL(value);
  assert(['http:', 'socks5:'].includes(url.protocol) && url.hostname === '127.0.0.1' && url.port
    && !url.username && !url.password && url.pathname === (url.protocol === 'http:' ? '/' : '') && !url.search && !url.hash,
  'Preview proxy must be an explicit credential-free loopback HTTP or SOCKS5 endpoint');
  return url.origin === 'null' ? `${url.protocol}//127.0.0.1:${url.port}` : url.origin;
}

function assertOwnedPreviewRead(input, options, host) {
  const url = new URL(input instanceof Request ? input.url : input);
  assert(url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.search && !url.hash
    && host.test(url.hostname),
  'Only exact owned Worker previews may use this reader');
  assert.equal(options?.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
  const headers = new Headers(options.headers);
  assert([...headers.keys()].every(key => ['accept-language', 'connection'].includes(key)), 'Preview reader cannot send authentication or arbitrary headers');
  return { url: url.href, headers };
}
export const assertUnifiedPreviewRead = (input, options) => assertOwnedPreviewRead(input, options,
  /^[a-f0-9]{8}-(?:gachia|gachia-game-(?:azur-promilia|genshin|lvmeng|nte))\.aieasygames\.workers\.dev$/);
export const assertGenshinMigrationPreviewRead = (input, options) => assertOwnedPreviewRead(input, options,
  /^[a-f0-9]{8}-(?:gachia|gachia-router|gachia-game-genshin)\.aieasygames\.workers\.dev$/);
export const assertGenshinPublicRead = (input, options) => assertOwnedPreviewRead(input, options, /^gachia\.com$/);

// Use the existing pinned HTTP client, not a browser/profile or global proxy.
// SOCKS5 resolves the exact TLS hostname through the user's existing local proxy.
async function createOwnedPreviewNetwork(proxy, assertRead, kind = 'explicit_loopback_preview_proxy') {
  const server = unifiedPreviewProxy(proxy);
  const context = await playwright.newContext({ proxy: { server }, ignoreHTTPSErrors: false, timeout: 30000, userAgent: 'node',
    storageState: { cookies: [], origins: [] } });
  return {
    route: { kind, server, userAgent: 'node', credentials: false, tlsVerification: true, redirects: false, retries: 0 },
    close: () => context.dispose(),
    request: async (input, options) => {
      const { url, headers } = assertRead(input, options); options.signal?.throwIfAborted();
      // Override the isolated client's cookie jar, even if a rejected response
      // attempted to set a cookie during another in-flight read.
      headers.set('cookie', '');
      headers.set('connection', 'close');
      const response = await context.get(url, { headers: Object.fromEntries(headers), maxRedirects: 0, maxRetries: 0, timeout: 30000 });
      try {
        options.signal?.throwIfAborted();
        const bytes = await response.body(); assert(bytes.length <= 16 * 1024 * 1024, 'Preview network body budget exceeded');
        const responseHeaders = new Headers();
        for (const { name, value } of response.headersArray()) responseHeaders.append(name, value);
        return new Response([204, 205, 304].includes(response.status()) ? null : bytes, { status: response.status(), headers: responseHeaders });
      } finally { await response.dispose(); }
    },
  };
}
export const createUnifiedPreviewNetwork = proxy => createOwnedPreviewNetwork(proxy, assertUnifiedPreviewRead);
export const createGenshinMigrationPreviewNetwork = proxy => createOwnedPreviewNetwork(proxy, assertGenshinMigrationPreviewRead);
export const createGenshinPublicNetwork = proxy => createOwnedPreviewNetwork(proxy, assertGenshinPublicRead, 'explicit_loopback_public_proxy');
