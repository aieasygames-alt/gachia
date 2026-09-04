const BASE_URL = 'https://gachia.com';

const body = `# Gachia

Gachia is a multi-game wiki and guide site for anime-style RPG and open-world games.
It covers Genshin Impact, Honkai: Star Rail, Wuthering Waves, Neverness to Everness, Zenless Zone Zero, Arknights: Endfield, Sea of Remnants, Ananta, Guihuan, and related game systems.

## Primary Sections

- Home live planning hub: ${BASE_URL}/en
- Chinese home live planning hub: ${BASE_URL}/zh
- About Gachia: ${BASE_URL}/en/about
- About Gachia in Chinese: ${BASE_URL}/zh/about
- Contact: ${BASE_URL}/en/contact
- Contact in Chinese: ${BASE_URL}/zh/contact
- Sitemap: ${BASE_URL}/sitemap.xml
- Public HTML sitemap: ${BASE_URL}/en/sitemap
- Public Chinese HTML sitemap: ${BASE_URL}/zh/sitemap
- Cross-game calendar: ${BASE_URL}/en/calendar
- Cross-game calendar in Chinese: ${BASE_URL}/zh/calendar
- Wuthering Waves guides: ${BASE_URL}/en/wuwa/guides
- Wuthering Waves guides in Chinese: ${BASE_URL}/zh/wuwa/guides
- Honkai: Star Rail guides: ${BASE_URL}/en/starrail/guides
- Honkai: Star Rail guides in Chinese: ${BASE_URL}/zh/starrail/guides
- Genshin Impact guides: ${BASE_URL}/en/genshin/guides
- Genshin Impact guides in Chinese: ${BASE_URL}/zh/genshin/guides
- Neverness to Everness guides: ${BASE_URL}/en/nte/guides
- Sea of Remnants guides: ${BASE_URL}/en/sea/guides

## High-Freshness Pages

- WuWa banner schedule: ${BASE_URL}/en/wuwa/guides/banner-schedule-guide
- HSR banner schedule: ${BASE_URL}/en/starrail/guides/banner-schedule-guide
- Genshin banner schedule: ${BASE_URL}/en/genshin/guides/banner-schedule-guide
- Cross-game banner and version calendar: ${BASE_URL}/en/calendar
- ZZZ v3.1 version hub: ${BASE_URL}/en/zzz/version
- WuWa v3.5 version hub: ${BASE_URL}/en/wuwa/version
- HSR v4.4 version hub: ${BASE_URL}/en/starrail/version
- Genshin Luna VIII version hub: ${BASE_URL}/en/genshin/version
- NTE v1.2 version hub: ${BASE_URL}/en/nte/version
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
