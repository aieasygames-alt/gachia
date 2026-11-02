import assert from 'node:assert/strict';
import { boundedBody, exactPreviewOrigin } from './desktop-version-preview.mjs';
import { releaseScope } from './desktop-release-scope.mjs';

const base = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/';

// Internal transport, not an authorization gate. Only the durable promotion
// continuation may call this after verifying candidate + recovery evidence.
// No default fetch: the controlled desktop wrapper supplies it explicitly.
export function promotionWriter({ game, releaseKey, versions, token, request }) {
  assert(/^[a-f0-9]{64}$/.test(releaseKey));
  assert.equal(typeof request, 'function', 'Explicit request transport required');
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
    assert(response.ok, `Deployment response ${response.status}; reconcile before any further action`);
    const body = JSON.parse((await boundedBody(response)).toString());
    assert.equal(body.success, true, 'Deployment API did not confirm success');
    assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.result?.id), 'Missing deployment identity');
    assert.equal(body.result.strategy, 'percentage');
    assert.deepEqual(body.result.versions, [{ version_id: args.versionId, percentage: 100 }], 'Unexpected deployed versions');
    return { deploymentId: body.result.id, service: args.service, versionId: args.versionId, releaseKey };
  };
}
