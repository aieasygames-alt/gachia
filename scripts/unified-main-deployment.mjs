import { unifiedOwnerDeploymentWriter } from './unified-owner-deployment.mjs';

// Keep the historical fixed Main entry and receipt unchanged.
export const unifiedMainDeploymentWriter = input => unifiedOwnerDeploymentWriter({ ...input, owner: 'main' });
