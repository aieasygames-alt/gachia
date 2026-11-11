import { digest } from '../desktop-release-assets.mjs';
import { unifiedGenshinPublicReferences } from '../unified-genshin-public.mjs';

export function genshinPublicFixture() {
  const requirements = ['zh', 'en', 'ja'].map(locale => ({ owner: 'genshin', path: `/${locale}/genshin/characters/fixture`, status: 200, contains: [`>Approved ${locale}<`] }));
  const html = row => `<html><head><title>Character</title><meta name="description" content="Description"><link rel="canonical" href="https://gachia.com${row.path}"></head><body><main><h1${row.contains[0]}/h1><a href="/zh/genshin">Game</a><img src="/character.webp" alt="Character"></main><script src="/_games/genshin/_next/static/fixture.js"></script></body></html>`;
  const responses = [...requirements.map(row => ({ path: row.path, text: html(row), mime: 'text/html; charset=utf-8' })),
    { path: '/sitemap.xml', text: '<urlset></urlset>', mime: 'application/xml' }, { path: '/robots.txt', text: 'User-agent: *\nAllow: /\n', mime: 'text/plain' },
    ...['/_next/static/fixture.js', '/_games/genshin/_next/static/fixture.js'].map(path => ({ path, text: 'console.log("fixture")', mime: 'text/javascript' }))];
  const bodies = responses.map(row => Buffer.from(row.text));
  const rows = responses.map((row, index) => ({ path: row.path, status: 200, bodyFile: `${index}.body`, bytes: bodies[index].length, sha256: digest(bodies[index]),
    headers: { 'content-type': row.mime, 'cache-control': row.path.endsWith('.js') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate' } }));
  const read = row => bodies[Number(row.bodyFile.split('.')[0])];
  const references = () => unifiedGenshinPublicReferences(rows, read, requirements);
  const replace = (index, text) => { bodies[index] = Buffer.from(text); rows[index].bytes = bodies[index].length; rows[index].sha256 = digest(bodies[index]); };
  return { rows, bodies, read, requirements, references, replace };
}
