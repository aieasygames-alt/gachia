import { verifyAppRuntime } from './require-app-runtime.mjs';
import { verifySeaGuideContract } from '../packages/data/scripts/sea-guide-contract.mjs';

// Resolve from the invoking application, never silently check a different app.
const result = verifyAppRuntime(process.cwd());
console.log(`Next ${result.patch.nextVersion}: required patch and application runtime verified`);
const content = await verifySeaGuideContract();
console.log(`Sea guides: ${content.guides} guides / ${content.outputs} outputs verified (${content.sourceSha256})`);
