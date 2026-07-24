const BASE_URL = 'https://gachia.com';
const INDEXNOW_KEY = 'gachia2026indexnowkey';
const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://search.seznam.cz/indexnow',
  'https://yandex.com/indexnow',
];

const LOCALES = ['zh', 'en'];
const PRIORITY_GUIDES = [
  ['wuwa', 'banner-schedule-guide'],
  ['wuwa', 'echo-advanced-guide'],
  ['wuwa', 'meta-teams-v3-guide'],
  ['starrail', 'banner-schedule-guide'],
  ['genshin', 'banner-schedule-guide'],
  ['sea', 'open-beta-version-center'],
  ['sea', 'launch-day-guide'],
  ['sea', 'download-install-guide'],
  ['sea', 'mechanics-faq-guide'],
  ['skjh', 'week-one-live-ops-overview'],
];

function usage() {
  console.log(`Usage:
  pnpm indexnow:seo-updates -- --priority
  pnpm indexnow:seo-updates -- --url https://gachia.com/en/wuwa/guides/banner-schedule-guide
  pnpm indexnow:seo-updates -- --path /en/wuwa/guides/banner-schedule-guide
  pnpm indexnow:seo-updates -- --priority --dry-run`);
}

function normalizeUrl(value) {
  if (value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${BASE_URL}${value}`;
  return `${BASE_URL}/${value}`;
}

function collectUrls(args) {
  const urls = new Set();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    if (arg === '--priority') {
      for (const [gameId, slug] of PRIORITY_GUIDES) {
        for (const locale of LOCALES) {
          urls.add(`${BASE_URL}/${locale}/${gameId}/guides/${slug}`);
        }
      }
      continue;
    }

    if (arg === '--url' || arg === '--path') {
      const next = args[i + 1];
      if (!next) throw new Error(`${arg} requires a value`);
      urls.add(normalizeUrl(next));
      i += 1;
      continue;
    }
  }

  return [...urls];
}

function validateUrls(urls) {
  for (const url of urls) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'gachia.com' || parsed.port) {
      throw new Error(`IndexNow only accepts production gachia.com URLs: ${url}`);
    }
  }
}

async function submit(urls, dryRun) {
  if (urls.length === 0) {
    usage();
    throw new Error('No URLs selected for IndexNow submission.');
  }

  validateUrls(urls);

  const payload = {
    host: 'gachia.com',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  for (const endpoint of ENDPOINTS) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`${endpoint} -> ${response.status} (${urls.length} URLs)`);
  }
}

const args = process.argv.slice(2);
await submit(collectUrls(args), args.includes('--dry-run'));
