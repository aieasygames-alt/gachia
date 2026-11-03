import assert from 'node:assert/strict';
import { boundedBody, exactPreviewOrigin } from './desktop-version-preview.mjs';
import { releaseScope } from './desktop-release-scope.mjs';

const base = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/';

// Internal transport, not an authorization gate. Only the durable promotion
// continuation may call this after verifying candidate + recovery evidence.
// No default fetch: the controlled desktop wrapper supplies it explicitly.
export function promotionWriter({ game, releaseKey, versions, token, request, recordResponse = () => {} }) {
  assert(/^[a-f0-9]{64}$/.test(releaseKey));
  assert.equal(typeof request, 'function', 'Explicit request transport required');
  assert.equal(typeof recordResponse, 'function');
  assert(typeof token === 'string' && token.length > 0);
  const scope = releaseScope(game);
  assert.deepEqual(Object.keys(versions).sort(), [...scope.services].sort());
  const targets = structuredClone(versions);
  for (const [service, version] of Object.entries(targets)) exactPreviewOrigin(service, version);
  const attempted = new Set();
  return async args => {
    assert.equal(args.service, scope.serviceFor(args.owner));
    assert.equal(args.releaseKey, releaseKey);
    assert.equal(args.versionId, targets[args.service], 'Only accepted exact UUID can be promoted');
    assert(!attempted.has(args.service), 'No automatic retry after a deployment attempt');
    attempted.add(args.service);
    let response;
    try {
      response = await request(`${base}${args.service}/deployments`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ strategy: 'percentage', versions: [{ version_id: args.versionId, percentage: 100 }] }),
      });
    } catch {
      throw Error('Deployment outcome unknown; reconcile read-only, never retry');
    }
    const bytes = await boundedBody(response);
    await recordResponse({ service: args.service, kind: 'creation', status: response.status, headers: Object.fromEntries(response.headers), bytes });
    assert(response.ok, `Deployment response ${response.status}; reconcile before any further action`);
    const body = JSON.parse(bytes.toString());
    assert.equal(body.success, true, 'Deployment API did not confirm success');
    assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.result?.id), 'Missing deployment identity');
    // Creation may return only an ID. Verify its allocation by that exact ID,
    // never by latest, before the continuation checks the active deployment.
    if (Object.hasOwn(body.result, 'strategy')) assert.equal(body.result.strategy, 'percentage');
    const allocation = [{ version_id: args.versionId, percentage: 100 }];
    if (Object.hasOwn(body.result, 'versions')) assert.deepEqual(body.result.versions, allocation, 'Unexpected deployed versions');
    let verification;
    try {
      verification = await request(`${base}${args.service}/deployments/${body.result.id}`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { authorization: `Bearer ${token}` },
      });
    } catch { throw Error('Deployment verification unavailable; reconcile read-only, never retry'); }
    const verifiedBytes = await boundedBody(verification);
    await recordResponse({ service: args.service, kind: 'verification', status: verification.status, headers: Object.fromEntries(verification.headers), bytes: verifiedBytes });
    assert(verification.ok, `Deployment verification ${verification.status}; reconcile before any further action`);
    const verified = JSON.parse(verifiedBytes.toString());
    assert.equal(verified.success, true, 'Deployment verification API did not confirm success');
    assert.equal(verified.result?.id, body.result.id, 'Deployment identity differs from creation receipt');
    assert.equal(verified.result.strategy, 'percentage');
    assert.deepEqual(verified.result.versions, allocation, 'Unexpected verified deployed versions');
    return { deploymentId: body.result.id, service: args.service, versionId: args.versionId, releaseKey };
  };
}
