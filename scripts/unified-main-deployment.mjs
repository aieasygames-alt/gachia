import assert from 'node:assert/strict';
import { boundedBody } from './desktop-version-preview.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';
import { digest } from './desktop-release-assets.mjs';

const base = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia/deployments';
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

// Deliberately Main-only. This does not expand the legacy game/Main writer.
export function unifiedMainDeploymentWriter({ releaseKey, versionId, token, request, recordResponse }) {
  assert(/^[a-f0-9]{64}$/.test(releaseKey)); exactUnifiedPreviewOrigin('gachia', versionId);
  assert(typeof token === 'string' && token.length > 0); assert.equal(typeof request, 'function');
  assert.equal(typeof recordResponse, 'function');
  let attempted = false;
  return async args => {
    assert.equal(args.owner, 'main'); assert.equal(args.service, 'gachia');
    assert.equal(args.releaseKey, releaseKey); assert.equal(args.versionId, versionId);
    assert(!attempted, 'No retry after a Main deployment attempt'); attempted = true;
    let response;
    try {
      response = await request(base, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', connection: 'close' },
        body: JSON.stringify({ strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] }) });
    } catch { throw Error('Main deployment outcome unknown; reconcile read-only, never retry'); }
    const bytes = await boundedBody(response);
    await recordResponse({ kind: 'creation', status: response.status, headers: Object.fromEntries(response.headers), bytes });
    assert(response.ok, `Main deployment HTTP ${response.status}; reconcile before proceeding`);
    const body = JSON.parse(bytes); assert.equal(body.success, true); assert(UUID.test(body.result?.id), 'Missing Main deployment identity');
    const versions = [{ version_id: versionId, percentage: 100 }];
    if (Object.hasOwn(body.result, 'strategy')) assert.equal(body.result.strategy, 'percentage');
    if (Object.hasOwn(body.result, 'versions')) assert.deepEqual(body.result.versions, versions);
    let verification;
    try {
      verification = await request(`${base}/${body.result.id}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { authorization: `Bearer ${token}`, connection: 'close' } });
    } catch { throw Error('Main deployment verification unavailable; reconcile read-only, never retry'); }
    const verifiedBytes = await boundedBody(verification);
    await recordResponse({ kind: 'verification', status: verification.status, headers: Object.fromEntries(verification.headers), bytes: verifiedBytes });
    assert(verification.ok, `Main deployment verification HTTP ${verification.status}`);
    const verified = JSON.parse(verifiedBytes); assert.equal(verified.success, true);
    assert.equal(verified.result?.id, body.result.id); assert.equal(verified.result.strategy, 'percentage');
    assert.deepEqual(verified.result.versions, versions, 'Unexpected Main deployed allocation');
    const proof = (response, bytes) => ({ status: response.status, sha256: digest(bytes), bytes: bytes.length });
    return { deploymentId: body.result.id, service: 'gachia', versionId, releaseKey,
      responses: { creation: proof(response, bytes), verification: proof(verification, verifiedBytes) } };
  };
}
