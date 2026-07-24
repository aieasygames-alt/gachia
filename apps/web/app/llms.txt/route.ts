const BASE_URL = 'https://gachia.com';

const body = `# Gachia

Gachia is a multi-game wiki and guide site for anime-style RPG and open-world games.
It covers Genshin Impact, Honkai: Star Rail, Wuthering Waves, Neverness to Everness, Zenless Zone Zero, Arknights: Endfield, Sea of Remnants, Ananta, Guihuan, and related game systems.

## Primary Sections

- Home: ${BASE_URL}/en
- Sitemap: ${BASE_URL}/sitemap.xml
- Public HTML sitemap: ${BASE_URL}/en/sitemap
- Wuthering Waves guides: ${BASE_URL}/en/wuwa/guides
- Honkai: Star Rail guides: ${BASE_URL}/en/starrail/guides
- Genshin Impact guides: ${BASE_URL}/en/genshin/guides
- Neverness to Everness guides: ${BASE_URL}/en/nte/guides
- Sea of Remnants guides: ${BASE_URL}/en/sea/guides

## High-Freshness Pages

- WuWa banner schedule: ${BASE_URL}/en/wuwa/guides/banner-schedule-guide
- HSR banner schedule: ${BASE_URL}/en/starrail/guides/banner-schedule-guide
- Genshin banner schedule: ${BASE_URL}/en/genshin/guides/banner-schedule-guide
- Sea of Remnants launch guide: ${BASE_URL}/en/sea/guides/launch-day-guide
- Sea of Remnants download guide: ${BASE_URL}/en/sea/guides/download-install-guide

## Languages

- Simplified Chinese: ${BASE_URL}/zh
- English: ${BASE_URL}/en
- Japanese: ${BASE_URL}/ja

Japanese guide detail pages are exposed for indexing only when a real Japanese body is available.

## Crawling Notes

Public game pages, guide pages, character pages, item pages, weapon pages, tier lists, and sitemap pages are intended for search and AI retrieval.
API routes under /api/ are private or application-oriented and should not be crawled.
Use canonical URLs and hreflang alternates from each page as the source of truth for localized equivalents.
`;

export function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
