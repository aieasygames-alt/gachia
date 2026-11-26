import { describe, expect, it } from 'vitest';
import batch from '../../../reports/starrail-event-calendar-2026-11-26/batch.json';
import before from '../../../reports/starrail-event-calendar-2026-11-26/cloud-before.json';
import expected from '../../../reports/starrail-event-calendar-2026-11-26/expected-publication.json';
import { isAnnouncementTime } from '../cms/starrail-events';
import { parseStarRailUpdate } from '../cms/starrail-updates';
import { parseStarRailPublication } from '../cms/starrail-publication';

const record = () => structuredClone(parseStarRailUpdate(expected.docs.find(d => d.slug === batch.updates[0]!.slug))!);
describe('CN event calendar publication contract', () => {
  it('keeps all old publications valid and round trips all eleven reviewed windows', () => {
    expect(parseStarRailPublication(before)?.docs).toHaveLength(71);
    const parsed = parseStarRailPublication({ revision: 1, docs: expected.docs });
    expect(parsed?.docs.flatMap(d => d.eventSchedule?.entries ?? [])).toHaveLength(11);
    expect(parsed?.docs).toEqual(expected.docs);
    expect(record().eventSchedule?.entries.at(-1)?.end).toEqual({ kind: 'not-announced' });
  });
  it.each(['2026-02-30T04:00', '2026-11-23T24:00', '2026-11-23T04:60', '2026-11-23T04:00Z', '2026-11-23T04:00+08:00', '2026-11-23', '2026-1-1T04:00'])(
    'rejects impossible or offset-bearing civil timestamp %s', value => expect(isAnnouncementTime(value)).toBe(false),
  );
  it('accepts leap dates and cross-year windows without assigning an offset', () => {
    expect(isAnnouncementTime('2024-02-29T04:00')).toBe(true);
    const event = parseStarRailUpdate(expected.docs.find(d => d.slug === 'v4-7-cn-endgame-calendar'));
    expect(event?.eventSchedule?.entries[1]?.end).toEqual({ kind: 'at', value: '2027-01-11T03:59' });
  });
  it('rejects reversed windows, guessed update times, conflicting versions and duplicate IDs', () => {
    for (const mutate of [
      (r: ReturnType<typeof record>) => { r.eventSchedule!.entries[1]!.end = { kind: 'at', value: '2026-11-10T03:59' }; },
      (r: ReturnType<typeof record>) => { Object.assign(r.eventSchedule!.entries[0]!.start, { value: '2026-11-11T11:00' }); },
      (r: ReturnType<typeof record>) => { r.eventSchedule!.entries[0]!.end = { kind: 'version-end', version: '4.8' }; },
      (r: ReturnType<typeof record>) => { r.eventSchedule!.entries.push(r.eventSchedule!.entries[0]!); },
    ]) { const r = record(); mutate(r); expect(parseStarRailUpdate(r)).toBeNull(); }
  });
  it('rejects foreign-server, non-event, unsourced and community calendar entries', () => {
    for (const mutate of [
      (r: ReturnType<typeof record>) => { r.region = '国际服'; },
      (r: ReturnType<typeof record>) => { r.kind = 'guide'; },
      (r: ReturnType<typeof record>) => { r.eventSchedule!.entries[0]!.sourceUrl = 'https://hsr.hoyoverse.com/zh-cn/news/167246'; },
      (r: ReturnType<typeof record>) => { const url = 'https://www.prydwen.gg/star-rail/guides/game-modes'; r.sources = [{ url }]; r.eventSchedule!.entries.forEach(e => e.sourceUrl = url); },
      (r: ReturnType<typeof record>) => { Object.assign(r.eventSchedule!, { region: 'global' }); },
      (r: ReturnType<typeof record>) => { Object.assign(r.eventSchedule!, { clock: 'UTC+8' }); },
    ]) { const r = record(); mutate(r); expect(parseStarRailUpdate(r)).toBeNull(); }
  });
  it('rejects colliding event identities across records in one language', () => {
    const a = record(); const b = record(); b.slug = 'another-event-owner';
    expect(parseStarRailPublication({ revision: 1, docs: [a, b] })).toBeNull();
    b.locale = 'en';
    expect(parseStarRailPublication({ revision: 1, docs: [a, b] })?.docs).toHaveLength(2);
  });
});
