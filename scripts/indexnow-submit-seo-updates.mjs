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
  ['wuwa', 'farming-guide'],
  ['wuwa', 'meta-teams-v3-guide'],
  ['wuwa', 'cross-game-comparison-guide'],
  ['starrail', 'banner-schedule-guide'],
  ['starrail', 'fate-collab-guide'],
  ['starrail', 'cross-game-comparison-guide'],
  ['genshin', 'banner-schedule-guide'],
  ['genshin', 'cross-game-comparison-guide'],
  ['genshin', 'lunar-reaction-guide'],
  ['nte', 'photo-mode-guide'],
  ['nte', 'damage-formula'],
  ['zzz', 'v3-0-version-guide'],
  ['zzz', 'banner-schedule-guide'],
  ['zzz', 'drive-disc-guide'],
  ['zzz', 'w-engine-guide'],
  ['zzz', 'steam-3-0-start-guide'],
  ['zzz', 'rupture-specialty-guide'],
  ['zzz', 'team-building-guide'],
  ['zzz', 'meta-teams-v3-guide'],
  ['sea', 'open-beta-version-center'],
  ['sea', 'launch-day-guide'],
  ['sea', 'download-install-guide'],
  ['sea', 'mechanics-faq-guide'],
  ['sea', 'molly-starter-team-guide'],
  ['skjh', 'week-one-live-ops-overview'],
  ['roco', 'cbt-registration-guide'],
  ['roco', 'starter-guide'],
  ['roco', 'what-is-roco-kingdom'],
  ['roco', 'platforms-and-download-guide'],
  ['roco', 'jinies-guide'],
  ['roco', 'battle-system-guide'],
  ['roco', 'co-op-and-social-guide'],
  ['roco', 'pre-registration-rewards-faq'],
  ['roco', 'is-roco-kingdom-free-to-play'],
  ['roco', 'roco-kingdom-release-date-guide'],
  ['roco', 'roco-kingdom-vs-pokemon'],
  ['roco', 'roco-kingdom-crossplay-guide'],
  ['roco-cn', 'redeem-codes-cn'],
  ['roco-cn', 'starter-guide-cn'],
  ['roco-cn', 's2-season-guide'],
];

const PRIORITY_PATHS = [
  '/zh',
  '/en',
  '/zh/calendar',
  '/en/calendar',
  '/zh/zzz',
  '/en/zzz',
  '/zh/zzz/version',
  '/en/zzz/version',
  '/zh/zzz/teams',
  '/en/zzz/teams',
  '/zh/zzz/items',
  '/en/zzz/items',
  '/zh/wuwa/version',
  '/en/wuwa/version',
  '/zh/starrail/version',
  '/en/starrail/version',
  '/zh/starrail/guides',
  '/en/starrail/guides',
  '/zh/genshin/version',
  '/en/genshin/version',
  '/zh/nte/version',
  '/en/nte/version',
  '/zh/sea',
  '/en/sea',
  '/zh/sea/characters',
  '/en/sea/characters',
  '/zh/sea/tier-list',
  '/en/sea/tier-list',
  '/en/genshin/weapons/sacrificial-jade',
  '/en/nte/items/tri-key',
  '/zh/roco',
  '/en/roco',
  '/zh/roco/guides',
  '/en/roco/guides',
  '/zh/roco/characters',
  '/en/roco/characters',
  '/zh/roco/download',
  '/en/roco/download',
  '/zh/roco/version',
  '/en/roco/version',
  '/zh/roco/redeem-codes',
  '/en/roco/redeem-codes',
  '/zh/roco/characters/meewee',
  '/en/roco/characters/meewee',
  '/zh/roco/characters/sparka',
  '/en/roco/characters/sparka',
  '/zh/roco/characters/cerulla',
  '/en/roco/characters/cerulla',
  '/zh/roco/characters/blazehound',
  '/en/roco/characters/blazehound',
  '/zh/roco/characters/catapawn',
  '/en/roco/characters/catapawn',
  '/zh/roco/characters/dustler',
  '/en/roco/characters/dustler',
  '/zh/roco-cn',
  '/en/roco-cn',
  '/zh/roco-cn/guides',
  '/en/roco-cn/guides',
  '/zh/roco-cn/characters',
  '/en/roco-cn/characters',
  '/zh/roco-cn/redeem-codes',
  '/en/roco-cn/redeem-codes',
  '/zh/roco-cn/characters/dimo',
  '/en/roco-cn/characters/dimo',
  '/zh/roco-cn/characters/huohua',
  '/en/roco-cn/characters/huohua',
  '/zh/roco-cn/characters/shuilanlan',
  '/en/roco-cn/characters/shuilanlan',
  '/zh/roco-cn/characters/miaomiao',
  '/en/roco-cn/characters/miaomiao',
  '/zh/roco-cn/characters/huangjia-shijiu',
  '/en/roco-cn/characters/huangjia-shijiu',
  '/zh/roco-cn/characters/luoyin',
  '/en/roco-cn/characters/luoyin',
  '/zh/roco-cn/characters/xuewawa',
  '/en/roco-cn/characters/xuewawa',
  '/zh/roco-cn/characters/youguang-rongrong',
  '/en/roco-cn/characters/youguang-rongrong',
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
      for (const priorityPath of PRIORITY_PATHS) {
        urls.add(normalizeUrl(priorityPath));
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
