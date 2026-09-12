const baseUrl = process.env.SEO_BASE_URL ?? 'https://gachia.com';
const paths = ['/zh', '/zh/genshin', '/zh/azur-promilia', '/zh/nte'];

function countMatches(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

for (const path of paths) {
  const response = await fetch(`${baseUrl}${path}`);
  const html = await response.text();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ?? '';
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] ?? '';
  const hreflang = countMatches(html, /<link[^>]+rel=["']alternate["'][^>]+hreflang=/gi);
  const jsonLd = countMatches(html, /<script[^>]+type=["']application\/ld\+json["']/gi);
  console.log(JSON.stringify({ path, status: response.status, canonical, hreflang, ogImage, jsonLd }));
}
