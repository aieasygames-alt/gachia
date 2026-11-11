import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';
import { unifiedRuntimeConfig, unifiedTransportTarget } from '../../../../scripts/unified-cloud-module.mjs';
import { canonical } from '../../src/record-mapping.ts';

const sha = 'a'.repeat(64);

export function prepareProductionSource(s, ownerOrder = ['main']) {
  const ownerMetadata = {};
  for (const owner of ownerOrder) {
    const target = unifiedTransportTarget(owner, readFileSync(new URL(`../../../../apps/${owner === 'main' ? 'web' : `game-${owner}`}/wrangler.jsonc`, import.meta.url), 'utf8'));
    const config = unifiedRuntimeConfig(target), service = target.config.name;
    const bindings = [{ name: 'ASSETS', type: 'assets' },
      ...Object.entries(config.vars ?? {}).map(([name, text]) => ({ name, type: 'plain_text', text })),
      ...(config.d1_databases ?? []).map(row => ({ name: row.binding, type: 'd1', id: row.database_id })),
      ...(config.r2_buckets ?? []).map(row => ({ name: row.binding, type: 'r2_bucket', bucket_name: row.bucket_name })),
      ...(config.services ?? []).map(row => ({ name: row.binding, type: 'service', service: row.service }))];
    s.spec.baseline.bindings[service] = [...bindings, ...(owner === 'main' ? ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN']
      .map(name => ({ name, type: 'secret_text' })) : [])];
    s.spec.baseline.settings[service] = { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags,
      tags: target.tags, bindings: s.spec.baseline.bindings[service] };
    ownerMetadata[owner] = { main_module: 'worker.js', bindings, compatibility_date: config.compatibility_date,
      compatibility_flags: config.compatibility_flags, keep_bindings: ['secret_text', 'secret_key'], annotations: {} };
  }
  const save = (name, value) => s.save(path.join(s.root, name), value), owners = {}, old = {};
  for (const [owner, row] of Object.entries(s.spec.owners)) {
    old[owner] = Object.fromEntries(['service', 'versionId', 'directory', 'artifactSHA256', 'modulePath', 'archiveSHA256', 'moduleSHA256'].map(key => [key, row[key]]));
    owners[owner] = { service: row.service, sourceVersionId: row.versionId, moduleSHA256: row.moduleSHA256, mode: row.mode,
      moduleProof: row.moduleProof, versionProof: save(`${owner}-production-version.json`, row.version) };
  }
  const previous = save('production-previous.json', { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: old });
  const handoff = save('production-handoff.json', { schemaVersion: 1, kind: 'unified_observed_source_handoff', status: 'all_five_active_source_modules_verified',
    transportPin: s.spec.transportPin, previous, owners, workerWrites: 0, authPOSTs: 0, activationSupported: false, rawUuidRollbackAuthorized: false,
    topologyUnchanged: true, before: save('production-before.json', s.spec.baseline), after: save('production-after.json', s.spec.baseline), observedAt: new Date().toISOString() });
  return { previous, handoff, metadata: ownerMetadata.main, ownerMetadata, ownerOrder,
    productionIdentity: { releaseKey: digest(canonical({ candidate: sha, review: sha, transport: sha,
      executorCommit: '2'.repeat(40), sourceCommit: '1'.repeat(40), owners: ownerOrder })),
    sourceIdentityPin: digest(canonical({ proof: s.spec.owners.main.moduleProof, version: s.spec.owners.main.version })) } };
}

export async function sealProductionLocal(s, f, prepared) {
  const owners = prepared.ownerOrder;
  for (const owner of owners) {
    const root = path.join(f.transportDirectory, owner, 'recovery'); mkdirSync(root, { recursive: true });
    const form = new FormData(); form.set('metadata', JSON.stringify(owner === 'main' ? prepared.metadata : prepared.ownerMetadata[owner]));
    form.set('worker.js', new Blob(['sealed recovery metadata']), 'worker.js');
    writeFileSync(path.join(root, 'exact.multipart'), Buffer.from(await new Response(form).arrayBuffer()));
  }
  const scope = { preservationOnlyOwners: [], preservedOwners: {}, uploadOwners: owners, editorial: { owners }, build: { owners } };
  const qualification = { policy: 'ananta-existing-installation-content-v1', game: 'ananta',
    changed: [...f.input.value.changed], fields: ['/content'], locale: 'zh' };
  const transport = { directory: f.transportDirectory, transportPin: f.input.value.transportPin, receipt: { owners: Object.fromEntries(owners.map(owner => [owner, Object.fromEntries(
    ['candidate', 'recovery'].map(role => [role, { moduleSHA256: f.input.value.owners.main[role].moduleSHA256,
      uploadConfigPin: f.input.value.owners.main[role].configPin, referencesPin: f.input.value.owners.main[role].referencesPin }]))])) } };
  const local = { scope, qualification, build: f.input.run, transport, review: { reviewPin: sha },
    built: { frozen: { sourceCommit: '1'.repeat(40), candidate: { candidateSHA256: sha, changed: f.input.value.changed } } },
    publication: { previousPath: prepared.previous.path, previousPin: prepared.previous.pin, owners: Object.fromEntries(owners.map(owner => [owner, {
      sourceVersionId: s.spec.owners[owner].versionId, ...Object.fromEntries(['candidate', 'recovery'].map(role => [role,
        { artifactSHA256: f.input.value.owners.main[role].artifactPin }])) }])) } };
  return local;
}
