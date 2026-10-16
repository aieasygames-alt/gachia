import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const docs = new Set(['docs/workbench-no-update-closeout.md', 'docs/workbench-local-user-guide.md',
  'docs/workbench-v1-handoff.md']);

export function verificationScope({ enabled, event, files }) {
  if (enabled !== 'true' || !['push', 'pull_request'].includes(event) || !Array.isArray(files) || !files.length) return 'full';
  const allowed = (path) => typeof path === 'string' && !path.split('/').some((part) => !part || part === '.' || part === '..') &&
    (docs.has(path) || /^apps\/admin\/(src|public|tests)\/.+\.(mjs|js|css|html)$/.test(path));
  return files.every(allowed) ? 'admin' : 'full';
}

export function changedFiles(event, payload, git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 15000 })) {
  const base = event === 'pull_request' ? payload.pull_request?.base?.sha : payload.before;
  const head = event === 'pull_request' ? payload.pull_request?.head?.sha : payload.after;
  if (!['push', 'pull_request'].includes(event) || ![base, head].every((sha) => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha) && !/^0+$/.test(sha))) return null;
  try {
    const from = event === 'pull_request' ? git('merge-base', base, head).trim() : base;
    if (!/^[a-f0-9]{40}$/.test(from)) return null;
    // Disable rename detection so moves account for both old and new paths.
    const output = git('diff', '--no-renames', '--name-only', '-z', from, head, '--');
    if (!output.endsWith('\0')) return null;
    return output.slice(0, -1).split('\0');
  } catch { return null; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let scope = 'full';
  try {
    const enabled = process.env.CI_ADMIN_LIGHTWEIGHT;
    const event = process.env.GITHUB_EVENT_NAME;
    const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    scope = verificationScope({ enabled, event, files: enabled === 'true' ? changedFiles(event, payload) : null });
  } catch { /* Unknown input must retain the existing full verification chain. */ }
  appendFileSync(process.env.GITHUB_OUTPUT, `scope=${scope}\n`);
  console.log(`Verification scope: ${scope}`);
}
