import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateSocialMetadata } from '@/lib/seo-metadata';

it('uses the existing Gachia brand asset at the HI3 URL, not another game artwork', async () => {
  const root = join(process.cwd(), 'public/images/og');
  const generic = await readFile(join(root, 'default.webp'));
  const brand = await readFile(join(process.cwd(), 'public/images/logo.webp'));
  const hi3 = await readFile(join(root, 'hi3.webp'));
  expect(hi3.equals(brand)).toBe(true);
  expect(hi3.equals(generic)).toBe(false);
  expect(hi3.subarray(0, 4).toString()).toBe('RIFF');
  expect(hi3.subarray(8, 12).toString()).toBe('WEBP');
});

it('declares square brand dimensions only for the HI3 fallback', () => {
  const metadata = generateSocialMetadata({ title: 'Fixture', description: 'Fixture', images: ['/images/og/hi3.webp', '/images/og/genshin.webp'] });
  expect(metadata.openGraph).toMatchObject({ images: [
    { url: '/images/og/hi3.webp', width: 1024, height: 1024 },
    { url: '/images/og/genshin.webp', width: 1200, height: 630 },
  ] });
});
