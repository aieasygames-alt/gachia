import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { verifyNextDeferredPatch } from './verify-next-deferred-patch.mjs';

// Resolve from the invoking application, never silently check a different app.
const require = createRequire(resolve('package.json'));
const result = verifyNextDeferredPatch(dirname(require.resolve('next/package.json')), { requirePatched: true });
console.log(`Next ${result.nextVersion}: required patch verified`);
