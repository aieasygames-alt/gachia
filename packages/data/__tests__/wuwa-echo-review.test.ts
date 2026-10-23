import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { echoSets, getEchoSetName, getEchoSetDesc2pc, getEchoSetDesc5pc } from '../games/wuwa/echoes';
import type { WuWaEchoSet } from '../games/wuwa/types';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-5-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));

it.each(['zh', 'en', 'ja'] as const)('uses the exact reviewed official %s names and five-piece text', locale => {
  const notice = proof.notices.find((row: { language: string }) => row.language === locale);
  for (const entry of notice.excerpts) {
    const set = echoSets.find(row => row.id === entry.entity)!;
    expect(getEchoSetName(set, locale)).toBe(entry.name);
    const delimiter = locale === 'en' ? ': ' : '：';
    expect(getEchoSetDesc5pc(set, locale)).toBe(entry.quote.slice(entry.quote.indexOf(delimiter) + delimiter.length));
    expect(getEchoSetDesc5pc(set, locale).length).toBeGreaterThan(50);
    expect(set.sourceReview?.sources).toContainEqual({ language: locale, url: notice.url });
    expect(set.bonus2pc).toBeUndefined();
    expect(set.bonus2pcEn).toBeUndefined();
    expect(set.bonus2pcJa).toBeUndefined();
    expect(set.bestFor).toEqual([]);
    expect(getEchoSetDesc2pc(set, locale)).toContain({ zh: '尚未核实', en: 'not verified', ja: '未確認' }[locale]);
  }
});

it('preserves all IDs, mirror equality and archived withdrawn claims, not just the current count', () => {
  const mirror: WuWaEchoSet[] = JSON.parse(readFileSync(new URL('../../../apps/web/public/data/wuwa/raw-echoes.json', import.meta.url), 'utf8'));
  expect(mirror).toEqual(echoSets);
  const old = proof.withdrawnClaims.originalSourceRecords;
  expect(old).toHaveLength(3);
  for (const row of old) {
    expect(row.bonus2pc).toBeTruthy();
    expect(echoSets.find(set => set.id === row.id)).toBeTruthy();
  }
  expect(proof.withdrawnClaims.originalPendingSnapshot.path).toBe('wuwa/raw-echoes.json');
  expect(new Set(echoSets.map(set => set.id)).size).toBe(15);
});

it('keeps existing two-piece bonuses and Japanese English fallbacks for older sets', () => {
  const older = echoSets.filter(set => !set.sourceReview);
  expect(older).toHaveLength(12);
  for (const set of older) {
    expect(getEchoSetDesc2pc(set, 'zh')).toBe(set.bonus2pc);
    expect(getEchoSetDesc2pc(set, 'ja')).toBe(set.bonus2pcEn);
    expect(getEchoSetName(set, 'ja')).toBe(set.nameEn);
  }
});
