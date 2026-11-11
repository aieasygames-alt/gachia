import assert from 'node:assert/strict';
import { digest } from './desktop-release-assets.mjs';
import { publicRobots } from './desktop-public-acceptance.mjs';
import { recheckUnifiedOwnerPublic, verifyUnifiedOwnerPublic } from './unified-main-public.mjs';
import { unifiedPageFingerprints, unifiedPreviewPath } from './unified-version-preview.mjs';

const origin = 'https://gachia.com';
const detail = /^\/(zh|en|ja)\/genshin\/characters\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const staticPath = /^\/(?:_games\/genshin\/)?_next\/static\/(?:[A-Za-z0-9_\-[\]./]|%5B|%5D)+\.(?:js|css|woff2?|ttf|otf|json|png|jpe?g|gif|webp|avif|svg|ico)$/;
const mime = headers => new Headers(headers).get('content-type')?.split(';')[0].trim().toLowerCase();

// This is a bounded public evidence adapter, not an editorial authorization.
// Its fixed caller must derive requirements from the verified public A/B pair.
export function unifiedGenshinPublicReferences(references, readBody, requirements) {
  assert(Array.isArray(requirements) && requirements.length > 0 && requirements.length <= 3, 'Single Genshin character coverage required');
  let id;
  for (const row of requirements) {
    assert.deepEqual(Object.keys(row).sort(), ['contains', 'owner', 'path', 'status']);
    assert.equal(row.owner, 'genshin'); assert.equal(row.status, 200);
    const match = detail.exec(row.path); assert(match, 'Unqualified Genshin detail path');
    id ??= match[2]; assert.equal(match[2], id, 'Only one existing Genshin character per release');
    assert(Array.isArray(row.contains) && row.contains.length > 0 && row.contains.every(text =>
      typeof text === 'string' && text.startsWith('>') && text.endsWith('<') && text.length <= 6 * 16384 + 2), 'Exact rendered text requirements required');
  }
  assert.equal(new Set(requirements.map(row => row.path)).size, requirements.length, 'Duplicate Genshin language requirement');
  assert(Array.isArray(references) && references.length > 0 && references.length <= 2500);
  assert.equal(new Set(references.map(row => row.path)).size, references.length, 'Duplicate Genshin public reference');
  const result = references.map((row, index) => {
    unifiedPreviewPath(row.path, origin);
    const required = requirements.find(wanted => wanted.path === row.path), asset = staticPath.test(row.path);
    assert(required || asset || ['/sitemap.xml', '/robots.txt'].includes(row.path), 'Unqualified Genshin public consumer');
    assert(Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= 16 * 1024 * 1024, 'Genshin reference body budget exceeded');
    const bytes = readBody(row, index); assert.equal(bytes.length, row.bytes); assert.equal(digest(bytes), row.sha256, 'Genshin reference body changed');
    const headers = new Headers(row.headers), type = mime(headers);
    assert.equal(row.status, 200, 'Existing Genshin public consumer must be present');
    assert(!headers.has('set-cookie'), 'Genshin reference sets a cookie');
    assert(!/\bnoindex\b/i.test(headers.get('x-robots-tag') ?? ''), 'Genshin public reference is noindex');
    if (row.path === '/sitemap.xml') assert(['application/xml', 'text/xml'].includes(type), 'Invalid Genshin sitemap MIME');
    if (row.path === '/robots.txt') assert.equal(type, 'text/plain', 'Invalid Genshin robots MIME');
    if (asset) {
      assert(type && !['text/html', 'application/xml', 'text/xml'].includes(type), 'Genshin static asset is a document fallback');
      return { ...row };
    }
    if (!required) return { ...row };
    assert.equal(type, 'text/html', 'Genshin character must render HTML');
    const html = bytes.toString(), main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
    assert(main, 'Genshin character main content missing');
    for (const value of required.contains) assert(main.includes(value), 'Required Genshin character text missing');
    const fingerprint = unifiedPageFingerprints([{ html, status: row.status }], 'streaming-v2')[0];
    assert.deepEqual(fingerprint.canonical, [`${origin}${row.path}`], 'Genshin character canonical differs from its exact path');
    const expectedRobots = publicRobots(html);
    assert(expectedRobots.every(value => !/\bnoindex\b/i.test(value)), 'Genshin character robots is noindex');
    return { ...row, fingerprint, expectedRobots };
  });
  for (const path of ['/sitemap.xml', '/robots.txt', ...requirements.map(row => row.path)]) {
    assert(result.some(row => row.path === path), `Missing Genshin public coverage: ${path}`);
  }
  // Dedicated Workers serve both raw and namespaced immutable static aliases.
  // Bind both so a successful HTML response cannot mask a broken public bundle.
  const assets = result.filter(row => staticPath.test(row.path));
  assert(assets.length > 0, 'Missing Genshin static coverage');
  for (const row of assets) {
    const alias = row.path.startsWith('/_games/genshin/') ? row.path.slice('/_games/genshin'.length) : `/_games/genshin${row.path}`;
    assert.equal(assets.find(other => other.path === alias)?.sha256, row.sha256, 'Genshin static alias missing or changed');
  }
  const mapped = new Map();
  for (const row of result) {
    // The public Router owns root discovery and raw static paths via Main.
    // Dedicated evidence must follow its sitemap and namespaced asset routes.
    if (row.path === '/robots.txt') continue;
    const path = row.path === '/sitemap.xml' ? '/sitemaps/genshin/index.xml'
      : row.path.startsWith('/_next/static/') ? `/_games/genshin${row.path}` : row.path;
    const projected = { ...row, path, headers: { ...row.headers, ...(detail.test(path)
      ? { 'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate' } : {}) } };
    if (mapped.has(path)) {
      const old = mapped.get(path);
      for (const field of ['status', 'bytes', 'sha256']) assert.equal(projected[field], old[field], 'Conflicting Genshin public alias');
      for (const header of ['content-type', 'cache-control']) assert.equal(new Headers(projected.headers).get(header), new Headers(old.headers).get(header), 'Conflicting Genshin public alias policy');
    }
    else mapped.set(path, projected);
  }
  return [...mapped.values()];
}

export const verifyUnifiedGenshinPublic = input => verifyUnifiedOwnerPublic({ ...input, owner: 'genshin' });
export const recheckUnifiedGenshinPublic = (directory, pin, references) => recheckUnifiedOwnerPublic('genshin', directory, pin, references);
