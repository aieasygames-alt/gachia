import { describe, expect, it } from 'vitest';
import sitemap from '../app/sitemaps/main/sitemap';

describe('content verification page', () => {
  it('lists the Chinese verification page and does not create untranslated sitemap entries', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://gachia.com/zh/content-verification');
    expect(urls).not.toContain('https://gachia.com/en/content-verification');
    expect(urls).not.toContain('https://gachia.com/ja/content-verification');
  });

  it('lists the Chinese update radar and does not create untranslated sitemap entries', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://gachia.com/zh/update-radar');
    expect(urls).not.toContain('https://gachia.com/en/update-radar');
    expect(urls).not.toContain('https://gachia.com/ja/update-radar');
  });

  it('keeps unverified Aniimo character detail pages out of the sitemap', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    for (const locale of ['zh', 'en', 'ja']) {
      expect(urls).not.toContain(`https://gachia.com/${locale}/aniimo/characters/eklue`);
    }
  });
});
