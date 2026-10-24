import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { INDEXNOW_POLICY, normalizeIndexNowUrls } from '../packages/core/indexnow-policy.mjs';

const parser = fileURLToPath(new URL('./indexnow-sitemap-input.py', import.meta.url));

export function parseIndexNowArgs(args, { priorityUrls } = {}) {
  const urls = [], sitemaps = [];
  let help = false, submit = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') { help = true; continue; }
    if (arg === '--dry-run') continue;
    if (arg === '--submit') { submit = true; continue; }
    if (arg === '--priority' && priorityUrls) { urls.push(...priorityUrls); continue; }
    if (['--url', '--path', '--sitemap'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      (arg === '--sitemap' ? sitemaps : urls).push(value);
      continue;
    }
    throw new Error(`Unknown IndexNow argument: ${arg}`);
  }
  return { urls, sitemaps, help, submit };
}

export function readIndexNowSnapshots(paths) {
  if (!paths.length) return null;
  try {
    return JSON.parse(execFileSync('python3', ['-B', parser, ...paths], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024, timeout: 30000 }));
  } catch (error) {
    throw new Error(`Invalid local sitemap snapshot: ${error.stderr?.trim() || error.message}`);
  }
}

export function buildIndexNowPlan(values, evidence = null) {
  const urls = normalizeIndexNowUrls(values);
  const listed = new Set(evidence?.urls ?? []);
  return {
    schemaVersion: 1,
    mode: 'offline_plan_only',
    policy: INDEXNOW_POLICY,
    networkRequests: 0,
    submissionApproved: false,
    inputCount: values.length,
    uniqueCandidates: urls.length,
    evidence: evidence ? { kind: evidence.evidenceKind, snapshots: evidence.snapshots } : { kind: 'not_supplied' },
    candidates: urls.map(url => ({ url, snapshotStatus: !evidence ? 'not_assessed' : listed.has(url) ? 'listed_in_supplied_snapshot' : 'not_listed_in_supplied_snapshots', submissionAllowed: false })),
    limitations: ['Snapshot membership is not live HTTP, robots, canonical, owner completeness or content approval.', 'Missing URLs may belong to an unsupplied owner; absence alone is not proof of retirement or noindex.', 'This tool plans discovery/promotion only; no removal notification or external submission is implemented.'],
  };
}

export function runIndexNowPlan(args, { priorityUrls, command = 'indexnow' } = {}) {
  const options = parseIndexNowArgs(args, { priorityUrls });
  if (options.submit) throw new Error(INDEXNOW_POLICY.message);
  if (options.help) {
    console.log(`Usage: pnpm ${command} -- --path /en/wuwa/version [--sitemap /absolute/local/urlset.xml] [--dry-run]\n${priorityUrls ? 'Use --priority for historical candidates, not approved URLs.\n' : ''}Default is offline planning. Repeat --sitemap for other owners. --submit is disabled. Added source templates do not establish public URLs.`);
    return;
  }
  // Validate candidates before reading any evidence. Neither path performs HTTP.
  normalizeIndexNowUrls(options.urls);
  console.log(JSON.stringify(buildIndexNowPlan(options.urls, readIndexNowSnapshots(options.sitemaps)), null, 2));
}

export function isDirectIndexNowScript(metaUrl) {
  return Boolean(process.argv[1]) && metaUrl === pathToFileURL(process.argv[1]).href;
}
