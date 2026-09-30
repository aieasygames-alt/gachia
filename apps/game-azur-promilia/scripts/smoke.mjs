const origin = process.env.AZUR_PROMILIA_ORIGIN;
if (!origin) {
  console.error('AZUR_PROMILIA_ORIGIN is required; refusing to test an unspecified host.');
  process.exit(1);
}

const host = new URL(origin).hostname;
if (host === 'gachia.com' || host.endsWith('.gachia.com')) {
  console.error('Preview smoke tests require a preview origin because they assert noindex protection. Use `pnpm run verify:production` for gachia.com.');
  process.exit(1);
}

const paths = [
  '/zh/azur-promilia',
  '/en/azur-promilia',
  '/ja/azur-promilia',
  '/zh/azur-promilia/characters',
  '/zh/azur-promilia/characters/abby',
  '/zh/azur-promilia/weapons',
  '/zh/azur-promilia/guides',
  '/zh/azur-promilia/guides/official-information-checklist',
  '/zh/azur-promilia/guides/cbt-combat-system-reference',
  '/zh/azur-promilia/guides/cbt-weapons-and-equipment-reference',
  '/zh/azur-promilia/guides/cbt-kibo-system-reference',
  '/zh/azur-promilia/guides/kibo-battle-and-ecology',
  '/zh/azur-promilia/guides/homestead-progression',
  '/zh/azur-promilia/guides/banner-system-status',
  '/zh/azur-promilia/guides/test-feedback-tracker',
  '/zh/azur-promilia/travel-trace',
  '/zh/azur-promilia/kibo',
  '/zh/azur-promilia/world',
  '/zh/azur-promilia/redeem-codes',
  '/robots.txt',
  '/sitemap.xml',
];

for (const path of paths) {
  const response = await fetch(new URL(path, origin));
  const body = await response.text();
  if (!response.ok) throw new Error(`${path}: expected 2xx, got ${response.status}`);

  if (path === '/robots.txt') {
    if (!body.includes('Disallow: /')) throw new Error('robots.txt must disallow crawling in preview');
    continue;
  }

  if (path === '/sitemap.xml') continue;
  if (!/noindex/i.test(response.headers.get('x-robots-tag') ?? '') && !/noindex/i.test(body)) {
    throw new Error(`${path}: missing noindex protection`);
  }
  if (!body.includes('https://gachia.com/')) throw new Error(`${path}: missing production canonical/base URL marker`);
  if (!body.includes('hreflang')) throw new Error(`${path}: missing hreflang metadata`);
  if (path.includes('/characters/abby') && !body.includes('Star Blessing')) throw new Error(`${path}: missing structured skill content`);
  if (path.includes('/guides/cbt-') && !body.includes('GameWith')) throw new Error(`${path}: missing source attribution`);
  if (path.includes('/guides/kibo-') || path.includes('/guides/homestead-') || path.includes('/guides/banner-') || path.includes('/guides/test-feedback-')) {
    if (!body.includes('promilia.cn')) throw new Error(`${path}: missing official source attribution`);
  }
  console.log(`${response.status} ${path}`);
}
