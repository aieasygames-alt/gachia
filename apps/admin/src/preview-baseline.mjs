import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fingerprint } from './revisions.mjs';
import { inspectPreviewReadiness } from './preview-readiness.mjs';
import { inspectExecutionDependencies } from './execution-dependencies.mjs';
import { readBoundedFile } from './bounded-file.mjs';

export const previewBaselinePaths = Object.freeze([
  'apps/web/app/[lang]/[game]/weapons/page.tsx', 'apps/web/app/[lang]/[game]/weapons/[id]/page.tsx',
  'apps/web/components/layout/site-header.tsx', 'apps/web/components/auth/auth-dialog.tsx',
  'apps/web/components/search/search-dialog.tsx', 'apps/web/components/search/search-loader.tsx',
  'apps/web/lib/hi3-weapon-scope.ts', 'apps/web/lib/modal-background.ts', 'apps/web/lib/search-dataset.ts',
  'apps/web/lib/search-keyboard.ts', 'apps/web/lib/search-module.ts', 'apps/web/public/images/og/hi3.webp',
  'package.json', 'apps/web/package.json', 'packages/core/package.json', 'packages/data/package.json',
  'packages/db/package.json', 'packages/ui/package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml',
]);
const dependencyPaths = previewBaselinePaths.filter((path) => path.endsWith('package.json') || path.endsWith('.yaml'));

function read(root, path) {
  try {
    const absolute = join(root, path);
    const bytes = readBoundedFile(absolute, 4 * 1024 * 1024);
    return { status: 'read', digest: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, text: bytes.toString('utf8') };
  } catch { return { status: 'unavailable_or_unsafe', digest: null }; }
}

// Fixed-scope comparison only; never merge code into a JSON-only reviewed workspace.
export function previewBaselinePlan(currentRoot, workspaceRoot) {
  const contents = new Map();
  const files = previewBaselinePaths.map((path) => {
    const current = read(currentRoot, path); const workspace = read(workspaceRoot, path);
    if (dependencyPaths.includes(path) && workspace.status === 'read') contents.set(path, workspace.text);
    return { path, current: { status: current.status, digest: current.digest },
      workspace: { status: workspace.status, digest: workspace.digest },
      status: current.status !== 'read' ? 'current_input_unavailable' : workspace.status !== 'read' ? 'missing_in_workspace'
        : current.digest === workspace.digest ? 'same' : 'different',
      contentReviewCoversPath: false };
  });
  const material = { files: dependencyPaths.map((path) => ({ path })) };
  material.digest = fingerprint(files.filter((file) => dependencyPaths.includes(file.path)).map((file) => ({ path: file.path, digest: file.workspace.digest })));
  const dependencies = inspectExecutionDependencies(material, contents);
  const differences = files.filter((file) => file.status !== 'same');
  return { version: 'preview-baseline-plan-v1', mode: 'fixed_scope_read_only', files,
    comparisonDigest: fingerprint(files), differences: differences.length,
    dependencies, readiness: inspectPreviewReadiness(workspaceRoot),
    status: differences.length ? 'baseline_mismatch' : 'fixed_scope_matches_not_execution_ready',
    gates: ['Separate code review and authorized baseline commit; never auto-commit the dirty checkout',
      'Recreate content revision/workspace against the reviewed baseline and reapply exact content changes',
      'Independently prepare and verify dependencies with installation authorization',
      'Explicit non-sandbox execution confirmation and original application preflight',
      'Revalidate exact code/data digests, affected pages and runtime results'],
    capabilities: { copy: false, install: false, commit: false, execute: false, publish: false },
    notCovered: ['Complete source/import closure', 'All Next configs and hooks', 'Full secret scan',
      'Installed artifact integrity', 'Production build or release readiness'] };
}
