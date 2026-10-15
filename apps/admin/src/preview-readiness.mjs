import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Filesystem-only diagnostic. Does not launch code or relax the execution preflight.
export function inspectPreviewReadiness(workspacePath) {
  const checks = [];
  const add = (ruleId, status, message) => checks.push({ ruleId, status, message });
  try {
    const root = realpathSync(workspacePath);
    if (root !== workspacePath) throw new Error('Workspace path is not canonical');
    const cwd = join(root, 'apps/web');
    if (!existsSync(cwd) || realpathSync(cwd) !== cwd || !statSync(cwd).isDirectory()) throw new Error('Application directory is absent, linked or not a directory');
    add('preview.application_directory', 'passed', 'Canonical local application directory exists');
    const dotenv = [root, cwd].some((directory) => readdirSync(directory).some((name) => /^\.env(?:\.|$)/.test(name) && !/\.(example|sample|template)$/.test(name)));
    add('preview.dotenv', dotenv ? 'blocked' : 'passed', dotenv ? 'Credential-like dotenv file present; do not execute' : 'No dotenv at the two launch-preflight locations; not a full secret scan');
    const cli = join(cwd, 'node_modules/next/dist/bin/next');
    if (!existsSync(cli)) add('preview.independent_dependencies', 'blocked', 'Independent Next.js dependency is absent; do not install or share main checkout dependencies automatically');
    else {
      const resolvedCli = realpathSync(cli);
      const path = relative(root, resolvedCli);
      const outside = path === '..' || path.startsWith('../') || path.startsWith('..\\');
      const ordinary = statSync(resolvedCli).isFile();
      add('preview.independent_dependencies', outside || !ordinary ? 'blocked' : 'passed', outside ? 'Next.js resolves outside the workspace' : !ordinary ? 'Next.js entry is not a regular file' : 'Next.js path resolves to a file inside workspace; dependency integrity/version not verified');
    }
  } catch (error) { add('preview.filesystem', 'blocked', error.message); }
  return { mode: 'read_only_preparation', checks,
    status: checks.some((check) => check.status === 'blocked') ? 'blocked' : 'filesystem_preflight_only',
    sandboxed: false, capabilities: { execute: false, install: false, publish: false },
    notCovered: ['Complete secret scan', 'Dependency integrity', 'OS isolation', 'Actual application execution and browser acceptance'] };
}
