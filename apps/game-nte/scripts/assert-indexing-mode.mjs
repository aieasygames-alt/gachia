import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const [nextConfig, layout, metadata, robots] = await Promise.all([
  readFile(resolve(root, 'next.config.ts'), 'utf8'),
  readFile(resolve(root, 'app/layout.tsx'), 'utf8'),
  readFile(resolve(root, 'lib/metadata.ts'), 'utf8'),
  readFile(resolve(root, 'app/robots.ts'), 'utf8'),
]);

const required = [
  [nextConfig, "process.env.NTE_DEPLOYMENT_MODE !== 'live'"],
  [nextConfig, "{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }"],
  [layout, "robots: isPreview ? { index: false, follow: false } : undefined"],
  [metadata, "robots: isPreview ? { index: false, follow: false } : indexable ? undefined : { index: false, follow: true }"],
  [robots, "process.env.NTE_DEPLOYMENT_MODE !== 'live'"],
  [robots, "sitemap: 'https://gachia.com/sitemaps/nte/index.xml'"],
];

for (const [source, expected] of required) {
  if (!source.includes(expected)) throw new Error(`Missing indexing-mode contract: ${expected}`);
}

if (!packageJson.scripts['build:worker'].startsWith('NTE_DEPLOYMENT_MODE=live ')) {
  throw new Error('NTE worker builds must explicitly use live indexing mode');
}
if (!packageJson.scripts.preview.startsWith('NTE_DEPLOYMENT_MODE=preview ')) {
  throw new Error('NTE local previews must explicitly use preview indexing mode');
}

console.log('NTE indexing-mode contract passed');
