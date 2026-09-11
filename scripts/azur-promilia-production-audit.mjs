const origin = process.env.AZUR_PROMILIA_ORIGIN ?? 'https://gachia.com';
const paths = [
  '/zh/azur-promilia',
  '/en/azur-promilia',
  '/ja/azur-promilia',
  '/zh/azur-promilia/characters',
  '/zh/azur-promilia/guides',
  '/zh/azur-promilia/kibo',
  '/zh/azur-promilia/weapons',
  '/sitemaps/azur-promilia/index.xml',
  '/sitemap.xml',
];

const failures = [];
for (const path of paths) {
  const response = await fetch(new URL(path, origin));
  const body = await response.text();
  if (!response.ok) {
    failures.push(`${path}: HTTP ${response.status}`);
    continue;
  }
  if (path.includes('/azur-promilia') && !path.includes('sitemaps')) {
    if (!/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/gachia\.com\//i.test(body)) failures.push(`${path}: missing canonical host`);
    const alternates = [...body.matchAll(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi)];
    for (const language of ['zh-Hans', 'en', 'ja', 'x-default']) {
      if (!alternates.some((match) => match[1] === language && match[2].startsWith('https://gachia.com/'))) failures.push(`${path}: missing ${language} alternate`);
    }
  }
  if (path.includes('/azur-promilia') && !path.includes('sitemaps')) {
    const resources = [...body.matchAll(/(?:src|href)="(\/_games\/azur-promilia\/_next\/[^"?]+)/g)].map((match) => match[1]);
    if (!resources.length) failures.push(`${path}: no isolated asset references`);
    for (const resource of resources.slice(0, 3)) {
      const asset = await fetch(new URL(resource, origin));
      if (!asset.ok) failures.push(`${resource}: HTTP ${asset.status}`);
    }
  }
  console.log(`${response.status} ${path}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
