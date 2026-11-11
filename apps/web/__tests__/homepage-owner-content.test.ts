import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { expect, it, vi } from 'vitest';
import { genshinContentAssets } from '../../../scripts/genshin-content-assets.mjs';
import { genshinPlatformSchema } from '@gachia/core/genshin-platform';

const context = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: context.get }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: ReactNode; href: string }) => createElement('a', { href }, children) }));
vi.mock('@/components/three-game-next-step', () => ({ ThreeGameNextStep: () => null }));
import Page, { dynamic } from '../app/[lang]/page';
import middleware from '../middleware';

it('renders current owner character names and guide summaries in the actual homepage', async () => {
  const value = genshinPlatformSchema.parse(JSON.parse(String(genshinContentAssets().files.get('platform.json'))));
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: { fetch: async () => Response.json(value) } } });
  const render = async () => renderToStaticMarkup(await Page({ params: Promise.resolve({ lang: 'en' }) }));
  const a = await render();
  expect(a).toContain('Hu Tao');
  value.data.characters[0]!.name.en = 'Updated owner character';
  value.data.guides.find(row => row.id === 'banner-schedule-guide')!.summary.en = 'Updated owner summary';
  const b = await render();
  expect(b).toContain('Updated owner character');
  expect(b).toContain('Updated owner summary');
  expect(b).not.toContain('Genshin v7.1 Livestream Codes');
  expect(b).toContain('HSR v4.6 Preview Codes');
});

it.each(['zh', 'en', 'ja'])('shows a partial outage without old Genshin facts and disables homepage caching for %s', async lang => {
  context.get.mockImplementation(() => { throw new Error('owner offline'); });
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ lang }) }));
  expect(html).toContain('role="status"');
  expect(html).not.toContain('hu-tao.webp');
  expect(html).not.toContain('原神7.1已上线');
  expect(html).toContain('starrail');
  expect(dynamic).toBe('force-dynamic');
  expect(middleware(new NextRequest(`https://gachia.com/${lang}`)).headers.get('cache-control')).toBe('no-store');
  expect(middleware(new NextRequest(`https://gachia.com/${lang}/about`)).headers.get('cache-control')).toContain('public');
});
