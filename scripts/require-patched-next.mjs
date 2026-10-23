import { verifyAppRuntime } from './require-app-runtime.mjs';

// Resolve from the invoking application, never silently check a different app.
const result = verifyAppRuntime(process.cwd());
console.log(`Next ${result.patch.nextVersion}: required patch and application runtime verified`);
