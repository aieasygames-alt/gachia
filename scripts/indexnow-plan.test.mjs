import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { INDEXNOW_POLICY, normalizeIndexNowUrl, normalizeIndexNowUrls } from '../packages/core/indexnow-policy.mjs';
import { buildIndexNowPlan, parseIndexNowArgs, readIndexNowSnapshots, runIndexNowPlan } from './indexnow-plan.mjs';
import { HISTORICAL_INDEXNOW_CANDIDATES } from './indexnow-submit-seo-updates.mjs';

const xml = urls => `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-indexnow-'));
  try { return run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('all entrypoints share an explicit paused policy without an environment bypass', () => {
  assert(Object.isFrozen(INDEXNOW_POLICY));
  assert.equal(INDEXNOW_POLICY.mode, 'paused');
  for (const path of ['scripts/indexnow-plan.mjs', 'apps/web/app/api/indexnow/route.ts', 'apps/web/lib/indexnow.ts']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert(source.includes('INDEXNOW_POLICY'), path);
    assert(!/\bfetch\s*\(/.test(source), path);
  }
});

test('canonical production page paths normalize and deduplicate without silently dropping invalid inputs', () => {
  assert.equal(normalizeIndexNowUrl('/ja/roco/characters/meewee'), 'https://gachia.com/ja/roco/characters/meewee');
  assert.deepEqual(normalizeIndexNowUrls(['/zh', 'https://gachia.com/zh']), ['https://gachia.com/zh']);
  assert.throws(() => normalizeIndexNowUrls(['/zh', 'https://evil.example/zh']));
});

test('rejects credential, port, protocol-relative, normalized, encoded and non-page URL variants', () => {
  for (const value of [null, '', '/zh/', '/zh?x=1', '/zh#x', '/zh\n', '//gachia.com/zh', '/en/../zh', '/en/%2e%2e/zh', '/en/%2fadmin', '/en/a\\b', 'en/roco', 'http://gachia.com/zh', 'https://gachia.com:443/zh', 'https://u:p@gachia.com/zh', 'https://GACHIA.com/zh', 'https://gachia.com.evil/zh', 'https://gachia.com/api/indexnow', 'https://gachia.com/zh/a'.repeat(110)]) {
    assert.throws(() => normalizeIndexNowUrl(value), String(value));
  }
});

test('enforces candidate budgets before deduplication', () => {
  assert.deepEqual(normalizeIndexNowUrls(Array(10000).fill('/zh')), ['https://gachia.com/zh']);
  for (const value of [[], null, 'https://gachia.com/zh', Array(10001).fill('/zh')]) assert.throws(() => normalizeIndexNowUrls(value));
});

test('unknown CLI flags and missing values fail closed; package separator and dry-run remain compatible', () => {
  for (const args of [['--submt'], ['--path'], ['--url', '--dry-run'], ['--priority']]) assert.throws(() => parseIndexNowArgs(args));
  assert.deepEqual(parseIndexNowArgs(['--', '--path', '/zh', '--dry-run']), { urls: ['/zh'], sitemaps: [], help: false, submit: false });
});

test('submit stays unavailable even with syntactically valid URLs and forged local approval inputs', () => {
  assert.throws(() => runIndexNowPlan(['--submit', '--path', '/zh']), /paused/);
  assert.throws(() => runIndexNowPlan(['--submit', '--help']), /paused/);
  assert.throws(() => runIndexNowPlan(['--submit', '--path', '/zh', '--sitemap', '/missing.xml']), /paused/);
});

test('no snapshot means not assessed, never eligible', () => {
  const plan = buildIndexNowPlan(['/en/roco/characters/meewee']);
  assert.equal(plan.candidates[0].snapshotStatus, 'not_assessed');
  assert.equal(plan.submissionApproved, false);
  assert.equal(plan.candidates[0].submissionAllowed, false);
});

test('real XML parser reads supplied owner snapshots and records hashes without treating membership as approval', () => fixture(directory => {
  const main = join(directory, 'main.xml'), owner = join(directory, 'owner.xml');
  writeFileSync(main, xml(['https://gachia.com/en/roco/characters']));
  writeFileSync(owner, xml(['https://gachia.com/en/genshin']));
  const evidence = readIndexNowSnapshots([main, owner]);
  assert.equal(evidence.snapshots.length, 2);
  assert.match(evidence.snapshots[0].sha256, /^[0-9a-f]{64}$/);
  const plan = buildIndexNowPlan(['/en/roco/characters', '/en/roco/characters/meewee', '/en/genshin'], evidence);
  assert.deepEqual(plan.candidates.map(row => row.snapshotStatus), ['listed_in_supplied_snapshot', 'not_listed_in_supplied_snapshots', 'listed_in_supplied_snapshot']);
  assert(plan.candidates.every(row => row.submissionAllowed === false));
}));

test('rejects malformed, hostile, unnamespaced, index and duplicate XML instead of extracting loc with regex', () => fixture(directory => {
  const path = join(directory, 'input.xml');
  for (const body of ['<urlset>', '<urlset/>', '<urlset><url><loc>https://gachia.com/zh</loc></url></urlset>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://gachia.com/sitemaps/main/sitemap.xml</loc></sitemap></sitemapindex>', '<!DOCTYPE urlset [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + xml(['https://gachia.com/zh']), xml(['https://gachia.com/zh', 'https://gachia.com/zh']), xml(['https://gachia.com/zh?x=1']), xml(['https://evil.example/zh'])]) {
    writeFileSync(path, body);
    assert.throws(() => readIndexNowSnapshots([path]));
  }
}));

test('rejects cross-owner duplicate locations, missing files and excessive snapshot inputs', () => fixture(directory => {
  const a = join(directory, 'a.xml'), b = join(directory, 'b.xml');
  writeFileSync(a, xml(['https://gachia.com/zh'])); writeFileSync(b, xml(['https://gachia.com/zh']));
  assert.throws(() => readIndexNowSnapshots([a, b]));
  assert.throws(() => readIndexNowSnapshots([join(directory, 'missing.xml')]));
  assert.throws(() => readIndexNowSnapshots(Array(17).fill(a)));
}));

test('historical priorities remain candidates, including previously overpromoted URLs, not a curated approval list', () => {
  const plan = buildIndexNowPlan(HISTORICAL_INDEXNOW_CANDIDATES);
  assert(plan.candidates.some(row => row.url === 'https://gachia.com/en/roco/characters/meewee'));
  assert(plan.candidates.every(row => row.submissionAllowed === false));
});

test('archives the original priority list without executing its outbound submission', () => {
  const proof = JSON.parse(readFileSync(new URL('../reports/content-integrity/s2-12-source-decisions-2026-10-24.json', import.meta.url)));
  const source = proof.originalSources.find(row => row.path === 'scripts/indexnow-submit-seo-updates.mjs').originalSource;
  const boundary = source.indexOf('const args = process.argv.slice(2);');
  assert(boundary > 0);
  const old = runInNewContext(source.slice(0, boundary) + '\ncollectUrls(["--priority"])', { fetch: () => { throw Error('Archived transport must not execute'); } }, { timeout: 1000 });
  assert.deepEqual(normalizeIndexNowUrls(HISTORICAL_INDEXNOW_CANDIDATES), JSON.parse(JSON.stringify(old)));
});

test('both actual CLI wrappers produce offline plans and reject submission without invoking fetch', () => fixture(directory => {
  const trap = join(directory, 'network-trap.mjs'), marker = join(directory, 'attempt.txt');
  writeFileSync(trap, `import { writeFileSync } from 'node:fs'; globalThis.fetch = () => { writeFileSync(${JSON.stringify(marker)}, 'attempted'); throw Error('network forbidden'); };`);
  for (const name of ['seo-updates', 'new-pages']) {
    const script = new URL(`./indexnow-submit-${name}.mjs`, import.meta.url);
    const args = ['--import', trap, script.pathname];
    const plan = JSON.parse(execFileSync(process.execPath, [...args, '--path', '/en/roco/characters/meewee'], { encoding: 'utf8' }));
    assert.equal(plan.networkRequests, 0);
    assert.equal(plan.submissionApproved, false);
    const blocked = spawnSync(process.execPath, [...args, '--path', '/zh', '--submit'], { encoding: 'utf8' });
    assert.equal(blocked.status, 1); assert.match(blocked.stderr, /paused/);
    const empty = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(empty.status, 1);
  }
  assert.throws(() => readFileSync(marker), /ENOENT/);
}));
