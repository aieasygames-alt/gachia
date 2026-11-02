import { readFile } from 'node:fs/promises';

const fixture = JSON.parse(await readFile(process.argv[2] ?? 'reports/shadow-fixture-2026-10-31.json', 'utf8'));
const publicUrls = new Set((process.env.PUBLIC_SITEMAP_URLS ?? '').split('\n').map(value => value.trim()).filter(Boolean));
const shadowUrls = Object.values(fixture.snapshots).flatMap(snapshot => snapshot.pages.map(page => page.path));
const leaked = shadowUrls.filter(path => publicUrls.has(path));
console.log(JSON.stringify({ shadowPages: shadowUrls.length, publicUrls: publicUrls.size, leaked, publishable: false }, null, 2));
if (leaked.length) process.exitCode = 1;
