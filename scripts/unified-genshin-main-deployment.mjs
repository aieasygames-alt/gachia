import assert from 'node:assert/strict';
import { unifiedOwnerDeploymentWriter } from './unified-owner-deployment.mjs';
import { unifiedService } from './unified-release-assets.mjs';

const owners = ['genshin', 'main'];

// The locked protocol still verifies authorization/topology at each boundary.
// An uncertain first write cannot be followed by Main or retried here.
export function unifiedGenshinMainDeploymentWriter({ versions, recordResponse, ...input }) {
  versions = structuredClone(versions);
  assert.deepEqual(Object.keys(versions).sort(), [...owners].sort(), 'Exactly Genshin and Main versions required');
  assert.equal(typeof recordResponse, 'function');
  const writers = Object.fromEntries(owners.map(owner => [owner, unifiedOwnerDeploymentWriter({ ...input, owner, versionId: versions[owner],
    recordResponse: response => recordResponse({ ...response, owner }) })]));
  let next = 0, state = 'ready';
  return async args => {
    assert.equal(state, 'ready', 'Ordered deployment is busy, stopped or complete; never retry');
    assert.equal(args.owner, owners[next], 'Genshin must complete before Main');
    assert.equal(args.service, unifiedService(args.owner)); assert.equal(args.versionId, versions[args.owner]);
    assert.equal(args.releaseKey, input.releaseKey);
    state = 'busy';
    try {
      const result = await writers[args.owner](args); next++;
      state = next === owners.length ? 'complete' : 'ready';
      return result;
    } catch (error) { state = 'stopped'; throw error; }
  };
}
