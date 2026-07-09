import { execFileSync } from 'node:child_process';
import path from 'node:path';

const BASE_URL = 'https://gachia.com';
const INDEXNOW_KEY = 'gachia2026indexnowkey';
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow'];
const LOCALES = ['zh', 'en', 'ja'];
const GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh'];

function gitAddedFiles() {
  const output = execFileSync('git', ['-C', process.cwd(), 'status', '--porcelain=v1', '--untracked-files=all'], {
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith('A ') || line.startsWith('?? '))
    .map((line) => line.slice(3).trim());
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function routeFromAddedFile(filePath) {
  const normalized = toPosix(path.relative(process.cwd(), filePath));
  const prefix = 'apps/web/app/';
  if (!normalized.startsWith(prefix) || !normalized.endsWith('/page.tsx')) return null;

  const segments = normalized.slice(prefix.length, -'/page.tsx'.length).split('/');
  if (segments.length === 0) return null;

  if (segments[0] === '[lang]' && segments[1] === '[game]' && segments[2] === 'version') {
    return LOCALES.flatMap((lang) => GAMES.map((game) => `/${lang}/${game}/version`));
  }

  return null;
}

async function submit(urls) {
  if (urls.length === 0) {
    console.log('No new page URLs found for IndexNow.');
    return;
  }

  for (const [index, url] of urls.entries()) {
    for (const endpoint of ENDPOINTS) {
      const requestUrl = new URL(endpoint);
      requestUrl.searchParams.set('url', url);
      requestUrl.searchParams.set('key', INDEXNOW_KEY);

      const res = await fetch(requestUrl, { method: 'GET' });
      console.log(`${endpoint} [${index + 1}/${urls.length}] -> ${res.status} ${url}`);
    }
  }

  console.log(`Submitted ${urls.length} URLs.`);
}

const addedFiles = gitAddedFiles();
const urls = new Set();
for (const file of addedFiles) {
  const resolved = path.resolve(process.cwd(), file);
  const routeUrls = routeFromAddedFile(resolved);
  if (routeUrls) {
    for (const url of routeUrls) urls.add(url);
  }
}

await submit([...urls]);
