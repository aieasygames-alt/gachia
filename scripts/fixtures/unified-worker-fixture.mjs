// Executable fixture modules for local workerd acceptance, not production builds.
export function unifiedWorkerFixture(text, generation = 0) {
  return `// fixture generation ${generation}
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/sitemap.xml') return new Response('<urlset />', { headers: { 'content-type': 'application/xml' } });
    if (pathname === '/robots.txt') return new Response('User-agent: *\\n', { headers: { 'content-type': 'text/plain' } });
    if (pathname.startsWith('/api/')) return Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404 });
    if (pathname.startsWith('/data/') || pathname.startsWith('/_next/')) return env.ASSETS.fetch(request);
    return new Response(${JSON.stringify(`<main>${text}</main>`)}, { headers: { 'content-type': 'text/html' } });
  }
};
`;
}
