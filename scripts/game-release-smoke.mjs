import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const noindexMeta = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i;

export async function verifyOrigin(plan, origin, request = fetch) {
  const address = new URL(origin);
  if (address.protocol !== 'http:' || address.hostname !== '127.0.0.1' || !address.port || address.pathname !== '/' || address.search || address.hash || address.username || address.password) {
    throw new Error('Release verification only accepts an explicit local Worker origin');
  }
  const observations = [];
  const get = async (path, status = 200) => {
    const response = await request(new URL(path, address), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, status, `${path}: unexpected HTTP status`);
    const body = await response.text();
    observations.push({ path, status: response.status });
    return { response, body };
  };
  const preview = plan.environment === 'staging';
  const homePath = `/zh/${plan.game}`;
  const robots = await get('/robots.txt');
  assert.equal(/^Disallow:\s*\/\s*$/m.test(robots.body), preview, 'robots must match the selected environment');
  const sitemap = await get('/sitemap.xml');
  assert.match(sitemap.response.headers.get('content-type') ?? '', /xml/i);
  assert(!sitemap.body.includes('-staging.') && !sitemap.body.includes('127.0.0.1'), 'sitemap must never publish preview origins');
  const detail = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]))
    .find((url) => url.origin === 'https://gachia.com' && url.pathname.startsWith(`${homePath}/characters/`));
  assert(detail, 'sitemap must expose a real character detail for the smoke test');
  let home;
  for (const path of [homePath, `/en/${plan.game}`, `${homePath}/characters`, detail.pathname]) {
    const result = await get(path);
    assert.match(result.response.headers.get('content-type') ?? '', /text\/html/i);
    assert.match(result.body, /<h1\b/i, `${path}: missing server-rendered heading`);
    const canonical = result.body.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
    assert.equal(canonical, `https://gachia.com${path}`, `${path}: missing canonical`);
    assert.equal(noindexMeta.test(result.body), preview, `${path}: incorrect robots metadata`);
    assert.equal(/noindex/i.test(result.response.headers.get('x-robots-tag') ?? ''), preview, `${path}: incorrect global robots header`);
    if (path === homePath) home = result.body;
  }
  const assets = [...new Set([...home.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:[?#][^"]*)?"/g)]
    .map((match) => match[1]).filter((path) => path.startsWith(`/_games/${plan.game}/_next/`)))];
  assert(assets.length >= 2, 'Expected namespaced JS and CSS assets');
  for (const extension of ['.js', '.css']) {
    const asset = assets.find((path) => path.endsWith(extension));
    assert(asset, `Missing ${extension} asset`);
    const { response, body } = await get(asset);
    assert.match(response.headers.get('content-type') ?? '', extension === '.js' ? /javascript/i : /text\/css/i);
    const original = await get(asset.replace(`/_games/${plan.game}/_next/`, '/_next/'));
    assert.equal(original.body, body, 'Direct preview and Router asset paths must serve identical bytes');
  }
  await get(`${homePath}/__release_smoke_missing__`, 404);
  return { status: 'local_worker_http_verified', cloudVerification: 'not_performed', observations };
}

export async function verifyLocalWorker(plan, root, { timeoutMs = 90000, verify = verifyOrigin } = {}) {
  const child = spawn('pnpm', ['exec', 'wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', '0', '--inspector-port', '0', '--config', 'wrangler.jsonc', '--env', plan.wranglerEnvironment], {
    cwd: resolve(root, plan.app),
    env: { ...process.env, ...plan.buildEnvironment, WRANGLER_SEND_METRICS: 'false', BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  const exited = once(child, 'exit').catch(() => []);
  let output = '';
  let timer;
  try {
    const origin = await new Promise((resolveReady, reject) => {
      timer = setTimeout(() => reject(new Error('Local Worker readiness timed out')), timeoutMs);
      const collect = (chunk) => {
        output = (output + chunk.toString()).slice(-32768);
        const match = output.match(/Ready on (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) resolveReady(match[1]);
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.once('error', reject);
      child.once('exit', (code) => reject(new Error(`Local Worker exited before readiness (${code})`)));
    });
    clearTimeout(timer);
    return await verify(plan, origin);
  } finally {
    clearTimeout(timer);
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const stop = (signal) => {
        try {
          if (process.platform === 'win32') child.kill(signal);
          else process.kill(-child.pid, signal);
        } catch (error) { if (error.code !== 'ESRCH') throw error; }
      };
      stop('SIGTERM');
      const killTimer = setTimeout(() => stop('SIGKILL'), 5000);
      await exited;
      clearTimeout(killTimer);
    }
  }
}
