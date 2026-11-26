import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import expected from '../../../reports/starrail-event-calendar-2026-11-26/expected-publication.json';
import { parseStarRailPublication } from '@gachia/data/cms/starrail-publication';
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: load }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement('a', { href }, children) }));
import { StarRailEvents } from '@/components/wiki/starrail-events';
const docs = parseStarRailPublication({ revision: 1, docs: expected.docs })!.docs;
describe('CMS event calendar reader', () => {
  it('shows eleven unique entries, conditions, civil times, explicit unknown deadline and source links', async () => {
    load.mockResolvedValue({ source: 'cms', updates: docs });
    const html = renderToStaticMarkup(await StarRailEvents({ locale: 'zh' }));
    expect(html.match(/data-event-id=/g)).toHaveLength(11);
    for (const d of docs) for (const e of d.eventSchedule?.entries ?? []) {
      expect(html).toContain(`data-event-id="${e.id}"`);
      expect(html).toContain(e.eligibility);
      expect(html).toContain(`href="#${d.slug}"`);
      expect(html).toContain(`href="${e.sourceUrl}"`);
    }
    for (const text of ['2027/01/11 03:59', '2026/11/11 4.7版本更新后', '4.7版本结束前', '未公告独立结束时间', '不换算为浏览器时区']) expect(html).toContain(text);
    expect(html).not.toContain('2026/11/11 11:00');
  });
  it('reflects a changed deadline immediately and removes withdrawn calendars without legacy cards', async () => {
    const changed = structuredClone(docs);
    const row = changed.find(d => d.eventSchedule)!.eventSchedule!.entries[0]!;
    row.end = { kind: 'at', value: '2026-12-24T03:59' };
    load.mockResolvedValue({ source: 'cms', updates: changed });
    expect(renderToStaticMarkup(await StarRailEvents({ locale: 'zh' }))).toContain('2026/12/24 03:59');
    load.mockResolvedValue({ source: 'cms', updates: docs.filter(d => !d.eventSchedule) });
    const withdrawn = renderToStaticMarkup(await StarRailEvents({ locale: 'zh' }));
    expect(withdrawn).not.toContain('data-event-calendar');
    expect(withdrawn).not.toContain('data-event-id');
  });
  it('keeps empty English and Japanese publications isolated', async () => {
    for (const locale of ['en', 'ja'] as const) {
      load.mockResolvedValue({ source: 'cms', updates: docs.filter(d => d.locale === locale) });
      const html = renderToStaticMarkup(await StarRailEvents({ locale }));
      expect(html).not.toContain('data-event-id');
      expect(html).not.toContain('欢闹厨房');
    }
  });
});
