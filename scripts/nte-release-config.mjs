import assert from 'node:assert/strict';
import { activeVersion, assertTopology, SERVICES } from './desktop-cloud-release.mjs';
import { normalizedBindings } from './desktop-cloud-transport.mjs';
import { digest } from './desktop-release-assets.mjs';
import { genshinMigrationConfig } from './genshin-production-migration.mjs';
import { parseWrangler } from './game-release.mjs';

export const NTE_MIGRATION_POLICY = 'nte-content-production-migration-v1';
export const NTE_MIGRATION_ORDER = Object.freeze(['nte', 'router', 'main']);
export const NTE_SERVICES = Object.freeze({ nte: 'gachia-game-nte', router: 'gachia-router', main: 'gachia' });
export function assertNteMigrationIdentity(value) {
  assert.deepEqual(Object.keys(value).sort(), ['policy', 'releaseKey', 'sourceCommit', 'sourceCI', 'sourceIndexPin', 'activePin', 'baseline', 'observedAt', 'owners'].sort());
  assert.equal(value.policy, NTE_MIGRATION_POLICY);
  for (const key of ['releaseKey', 'sourceIndexPin', 'activePin']) assert(/^[a-f0-9]{64}$/.test(value[key]));
  assert(/^[a-f0-9]{40}$/.test(value.sourceCommit)); assert.equal(value.sourceCI.commit, value.sourceCommit);
  assert.equal(value.sourceCI.status, 'full_exact_ci_passed'); assert(Number.isSafeInteger(value.sourceCI.runID) && value.sourceCI.runID > 0);
  assert(Number.isSafeInteger(value.observedAt) && value.observedAt <= Date.now() && Date.now() - value.observedAt < 900000);
  assertTopology(value.baseline, value.baseline); assert.deepEqual(Object.keys(value.owners), NTE_MIGRATION_ORDER);
  for (const owner of NTE_MIGRATION_ORDER) {
    const row = value.owners[owner];
    assert.deepEqual(Object.keys(row).sort(), ['service', 'sourceVersionId', 'sourceIdentityPin', 'candidate', 'recovery'].sort());
    assert.equal(row.service, NTE_SERVICES[owner]); assert.equal(row.sourceVersionId, activeVersion(value.baseline, row.service));
    assert(/^[a-f0-9]{64}$/.test(row.sourceIdentityPin));
    for (const role of ['candidate', 'recovery']) {
      assert.deepEqual(Object.keys(row[role]).sort(), ['moduleSHA256', 'artifactPin', 'configPin', 'referencesPin'].sort());
      for (const pin of Object.values(row[role])) assert(/^[a-f0-9]{64}$/.test(pin));
    }
  }
}
export function nteReleaseConfig(owner, source, role = 'candidate', migration = true) {
  assert(Object.hasOwn(NTE_SERVICES, owner)); assert(['candidate', 'recovery'].includes(role));
  const config = owner === 'nte' ? parseWrangler(source) : genshinMigrationConfig(owner, source);
  if (owner === 'nte') assert.equal(digest(source), '24a9c035334cd7cd8fd9587ed36d8fbac2b2d4a685b0ee8277b92f3ca7724ebf');
  assert.equal(config.name, NTE_SERVICES[owner]);
  // Wrangler derives existing Main/Router service tags from their environment
  // blocks. Only NTE's live contract deliberately has no environment block.
  if (owner === 'nte') delete config.env;
  if (owner !== 'nte' && (!migration || role === 'candidate')) {
    assert(!Object.hasOwn(config.vars, 'NTE_CONTENT_ENABLED')); config.vars.NTE_CONTENT_ENABLED = 'true';
    if (owner === 'main') config.services.push({ binding: 'NTE_CONTENT', service: NTE_SERVICES.nte });
  }
  return config;
}
export function nteExpectedBindings(baseline, owner, role, migration = true) {
  assert(Object.hasOwn(NTE_SERVICES, owner)); const bindings = structuredClone(baseline.bindings[NTE_SERVICES[owner]]);
  if (migration && owner !== 'nte' && role === 'candidate') {
    assert(!bindings.some(row => row.name === 'NTE_CONTENT_ENABLED'));
    bindings.push({ name: 'NTE_CONTENT_ENABLED', type: 'plain_text', text: 'true' });
    if (owner === 'main') {
      assert(!bindings.some(row => row.name === 'NTE_CONTENT'));
      bindings.push({ name: 'NTE_CONTENT', type: 'service', service: NTE_SERVICES.nte });
    }
  }
  return normalizedBindings(bindings);
}
/** @param {any} before @param {any} after @param {{configured?: string[], deployed?: Record<string, string>}} [options] */
export function assertNteMigrationTopology(before, after, { configured = [], deployed = {} } = {}) {
  assert.deepEqual(configured, NTE_MIGRATION_ORDER.slice(0, configured.length));
  assert(Object.keys(deployed).every(owner => configured.includes(owner)));
  const expected = structuredClone(before), observed = structuredClone(after);
  for (const owner of configured) {
    const service = NTE_SERVICES[owner], bindings = nteExpectedBindings(before, owner, 'candidate');
    assert.deepEqual(normalizedBindings(before.settings[service].bindings), normalizedBindings(before.bindings[service]));
    expected.bindings[service] = bindings; expected.settings[service].bindings = bindings;
  }
  for (const service of SERVICES) for (const value of [expected, observed]) {
    value.bindings[service] = normalizedBindings(value.bindings[service]);
    value.settings[service].bindings = normalizedBindings(value.settings[service].bindings);
  }
  assertTopology(expected, observed, Object.fromEntries(Object.entries(deployed).map(([owner, version]) => {
    assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(version)); return [NTE_SERVICES[owner], version];
  })));
}
