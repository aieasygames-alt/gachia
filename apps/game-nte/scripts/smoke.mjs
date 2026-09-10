const origin = process.env.NTE_PREVIEW_ORIGIN;
if (!origin) {
  console.error('NTE_PREVIEW_ORIGIN is required; refusing to test an unspecified host.');
  process.exit(1);
}

const paths = [
  '/zh/nte',
  '/en/nte',
  '/ja/nte',
  '/zh/nte/characters',
  '/zh/nte/characters/nanally',
  '/zh/nte/guides',
  '/zh/nte/guides/999-nights-mode-guide',
  '/zh/nte/weapons',
  '/zh/nte/redeem-codes',
  '/zh/nte/version',
  '/robots.txt',
];

for (const path of paths) {
  const response = await fetch(new URL(path, origin));
  const body = await response.text();
  if (!response.ok) throw new Error(`${path}: expected 2xx, got ${response.status}`);
  if (!/noindex/i.test(response.headers.get('x-robots-tag') ?? '') && path !== '/robots.txt') {
    throw new Error(`${path}: missing noindex protection`);
  }
  if (path !== '/robots.txt' && !body.includes('gachia.com')) {
    throw new Error(`${path}: expected production canonical/base URL marker`);
  }
  console.log(`${response.status} ${path}`);
}

const robots = await fetch(new URL('/robots.txt', origin));
const robotsBody = await robots.text();
if (!robotsBody.includes('Disallow: /')) throw new Error('robots.txt must disallow crawling in preview');
