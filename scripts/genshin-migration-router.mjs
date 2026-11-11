import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boundedBody } from './desktop-version-preview.mjs';
import { digest } from './desktop-release-assets.mjs';
import { assertModuleVersionIdentity, scriptETag } from './desktop-version-provenance.mjs';
import { normalizedBindings } from './desktop-cloud-transport.mjs';
import { migrationPinned, migrationPreviewOrigin } from './genshin-migration-http.mjs';

export async function migrationRouterModule(bytes) {
  assert(bytes.length > 0 && bytes.length <= 16 * 1024 * 1024);
  const boundary = bytes.subarray(0, bytes.indexOf('\r\n')).toString().slice(2); assert(/^[\w-]{1,200}$/.test(boundary));
  const form = await new Response(bytes, { headers: { 'content-type': 'multipart/form-data; boundary=' + boundary } }).formData();
  const modules = [...form].filter(([name]) => name !== 'metadata'); assert.equal(modules.length, 1);
  const [name, file] = modules[0]; assert(['worker.js', 'index.js'].includes(name) && typeof file !== 'string');
  const code = Buffer.from(await file.arrayBuffer());
  return { name, code, moduleSHA256: digest(code) };
}
export async function readMigrationRouterSource(proof) {
  const value = migrationPinned(proof);
  assert.equal(value.kind, 'genshin_migration_router_source_observation'); assert.equal(value.service, 'gachia-router'); assert.equal(value.cloudWrites, false);
  const before = migrationPinned(value.before), after = migrationPinned(value.after);
  migrationPreviewOrigin(value.service, value.versionId); assert.equal(before.id, value.versionId);
  assertModuleVersionIdentity(before, after); assert.equal(scriptETag(value.etag), before.resources.script.etag);
  const archive = readFileSync(value.archive.path); assert.equal(digest(archive), value.archive.pin);
  const module = await migrationRouterModule(archive); assert.equal(module.name, value.originalModuleName);
  assert.equal(digest(readFileSync(value.module.path)), value.module.pin); assert(module.code.equals(readFileSync(value.module.path)));
  return { value, version: before, ...module };
}
export async function readMigrationRouterVersion({ versionId, token, binary = false, request = fetch }) {
  migrationPreviewOrigin('gachia-router', versionId);
  const base = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia-router';
  const response = await request(base + (binary ? '/content/v2?version=' + versionId : '/versions/' + versionId), {
    method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${token}`, connection: 'close' }, signal: AbortSignal.timeout(binary ? 180000 : 30000) });
  const bytes = await boundedBody(response); assert(response.ok, `Read-only Router HTTP ${response.status}`);
  if (binary) return { archive: bytes, etag: response.headers.get('etag') };
  const body = JSON.parse(bytes); assert.equal(body.success, true); assert.equal(body.result.id, versionId);
  assert.equal(body.result.metadata.has_preview, true); assert(/^[a-f0-9]{64}$/.test(body.result.resources.script.etag)); return body.result;
}
export function assertMigrationRouterMetadata(metadata, config) {
  assert.equal(metadata.main_module, 'worker.js'); assert.equal(metadata.compatibility_date, config.compatibility_date);
  assert.deepEqual(metadata.compatibility_flags ?? [], config.compatibility_flags ?? []);
  assert.deepEqual(metadata.keep_bindings, ['secret_text', 'secret_key']);
  const bindings = [...Object.entries(config.vars).map(([name, text]) => ({ name, text, type: 'plain_text' })),
    ...config.services.map(row => ({ name: row.binding, service: row.service, type: 'service' }))];
  assert.deepEqual(normalizedBindings(metadata.bindings), normalizedBindings(bindings));
  assert(Object.keys(metadata).every(key => ['main_module', 'compatibility_date', 'compatibility_flags', 'keep_bindings', 'bindings', 'annotations'].includes(key)), 'Unreviewed Router metadata');
}
