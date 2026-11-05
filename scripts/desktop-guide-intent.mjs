import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { digest } from './desktop-release-assets.mjs';
import { validateGuideOverlay } from './desktop-publish.mjs';
import { GUIDE_TEXT_FIELDS } from './desktop-guide-contract.mjs';

const encode = rows => JSON.stringify(rows, null, 2) + '\n';
const exactKeys = (value, keys) => assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Unreviewed intent fields');

// Review planning only. These receipts cannot authorize promotion or bypass the
// existing implicit-reset gate; an activation contract must be reviewed first.
export function planPublishedGuideMerge({ game, importText, publishedText, editorialText, expected, intents = [], preview = false }) {
  assert(['genshin', 'nte'].includes(game), 'Unsupported guide game');
  assert.deepEqual(expected, { importSHA256: digest(importText), publishedSHA256: digest(publishedText), editorialSHA256: digest(editorialText) },
    'O/A/B source drift; rebuild and reapprove the intent');
  const { original, candidate: published } = validateGuideOverlay(importText, publishedText, game, { preview });
  const { candidate: editorial } = validateGuideOverlay(importText, editorialText, game, { preview });
  const source = new Map(original.map(row => [row.id, row])), proposed = new Map(editorial.map(row => [row.id, row]));
  const explicit = new Map();
  assert(Array.isArray(intents), 'Field intent list required');
  for (const intent of intents) {
    exactKeys(intent, ['id', 'field', 'action']);
    assert(GUIDE_TEXT_FIELDS.includes(intent.field) && ['reset-to-import', 'replace-public'].includes(intent.action), 'Unreviewed field intent');
    const key = `${intent.id}.${intent.field}`;
    assert(!explicit.has(key), 'Duplicate field intent');
    explicit.set(key, intent);
  }
  const preserved = [], resolved = [], used = new Set();
  const merged = published.map(publicRow => {
    const old = source.get(publicRow.id), next = proposed.get(publicRow.id);
    if (!next) {
      assert(!old, 'Imported guide deletion is forbidden');
      preserved.push({ id: publicRow.id, reason: 'public CMS addition absent from approved overlay' });
      return structuredClone(publicRow);
    }
    if (!old) {
      validateGuideOverlay(encode([publicRow]), encode([next]), game, { preview });
      return structuredClone(next);
    }
    const result = structuredClone(publicRow);
    for (const field of GUIDE_TEXT_FIELDS) {
      const key = `${publicRow.id}.${field}`, intent = explicit.get(key);
      const own = (row, name) => Object.hasOwn(row, name);
      const same = (a, b) => own(a, field) === own(b, field) && isDeepStrictEqual(a[field], b[field]);
      const assign = () => { if (own(next, field)) result[field] = next[field]; else delete result[field]; };
      if (intent) {
        used.add(key);
        assert(!same(publicRow, next), 'Redundant field intent');
        if (intent.action === 'reset-to-import') {
          assert(same(old, next) && !same(old, publicRow), 'Reset must explicitly restore the exact import field state');
        } else assert(!same(old, next), 'Replacing public A with O requires explicit reset intent');
        assign(); resolved.push(intent);
      } else if (same(old, next)) {
        if (!same(old, publicRow)) preserved.push({ id: publicRow.id, field, reason: 'untouched import field preserves public A' });
      } else {
        assert(same(old, publicRow) || same(publicRow, next), `Concurrent field conflict: ${key}; replace-public intent required`);
        assign();
      }
    }
    return result;
  });
  assert.equal(used.size, explicit.size, 'Intent refers to missing/new/unmodified field');
  for (const row of editorial) if (!published.some(current => current.id === row.id)) merged.push(structuredClone(row));
  const legacy = original.filter(row => !row.cmsOrigin).map(row => row.id), legacyIds = new Set(legacy);
  const rows = [...merged.filter(row => legacyIds.has(row.id)), ...merged.filter(row => !legacyIds.has(row.id)).sort((a, b) => a.id < b.id ? -1 : 1)];
  const content = encode(rows);
  const delta = validateGuideOverlay(publishedText, content, game, { preview });
  return { schemaVersion: 1, kind: 'guide_merge_review_plan', game, expected, intents: resolved, preserved, content,
    candidateSHA256: digest(content), changed: delta.changed, added: delta.added,
    status: 'review_required', productionReady: false, cloudWrites: false,
    activationSupported: false };
}

export function planGuideWithdrawal({ game, publishedText, publishedSHA256, id, policy }) {
  assert(['genshin', 'nte'].includes(game), 'Unsupported guide game');
  assert.equal(digest(publishedText), publishedSHA256, 'Published A drift');
  const rows = JSON.parse(publishedText);
  assert(Array.isArray(rows) && rows.filter(row => row.id === id).length === 1, 'Exactly one published guide required');
  assert(/^[a-z0-9-]+$/.test(id), 'Invalid guide identity');
  assert(policy && ['not-found', 'gone', 'redirect'].includes(policy.action), 'Explicit website withdrawal policy required');
  exactKeys(policy, policy.action === 'redirect' ? ['action', 'targetId'] : ['action']);
  if (policy.action === 'redirect') assert(policy.targetId !== id && rows.some(row => row.id === policy.targetId), 'Redirect must target another published same-game guide');
  return { schemaVersion: 1, kind: 'guide_withdrawal_review_plan', game, id, publishedSHA256, policy,
    status: 'review_required', productionReady: false, cloudWrites: false, activationSupported: false,
    routes: ['zh', 'en', 'ja'].map(locale => ({ path: `/${locale}/${game}/guides/${id}`,
      status: policy.action === 'not-found' ? 404 : policy.action === 'gone' ? 410 : 308,
      ...(policy.action === 'redirect' ? { location: `/${locale}/${game}/guides/${policy.targetId}` } : {}) })),
    requiredSurfaces: ['game guide lists', 'featured/related links', 'search', 'game sitemap', 'Main public guide JSON', 'canonical/JSON-LD', 'compatible recovery of exact public A'],
    recoverySHA256: publishedSHA256 };
}
