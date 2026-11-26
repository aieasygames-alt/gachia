// Announcement times are civil times as printed by the CN source, without an
// inferred offset. Do not turn these into countdowns or viewer-local timestamps.
export type EventStart = { kind: 'at'; value: string } | { kind: 'after-update'; date: string; version: string };
export type EventEnd = { kind: 'at'; value: string } | { kind: 'version-end'; version: string } | { kind: 'not-announced' };
export type StarRailEventSchedule = {
  region: 'cn';
  clock: 'announcement';
  entries: {
    id: string; title: string; category: 'limited' | 'gift' | 'challenge' | 'season';
    start: EventStart; end: EventEnd; eligibility: string; note: string; sourceUrl: string;
  }[];
};
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 1000): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const version = (v: unknown): v is string => typeof v === 'string' && /^\d{1,2}\.\d{1,2}$/.test(v);
function date(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export function isAnnouncementTime(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(v) && date(v.slice(0, 10));
}
export function parseStarRailEventSchedule(input: unknown, officialCNSources: string[]): StarRailEventSchedule | null {
  if (!object(input) || input.region !== 'cn' || input.clock !== 'announcement' || !Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 20) return null;
  const entries: StarRailEventSchedule['entries'] = [];
  for (const e of input.entries) {
    if (!object(e) || !text(e.id, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id) || !text(e.title, 200) || !['limited', 'gift', 'challenge', 'season'].includes(String(e.category)) || !text(e.eligibility) || !text(e.note, 2000) || typeof e.sourceUrl !== 'string' || !officialCNSources.includes(e.sourceUrl) || !object(e.start) || !object(e.end)) return null;
    let start: EventStart;
    if (e.start.kind === 'at' && isAnnouncementTime(e.start.value)) start = { kind: 'at', value: e.start.value };
    else if (e.start.kind === 'after-update' && date(e.start.date) && version(e.start.version) && e.start.value == null) start = { kind: 'after-update', date: e.start.date, version: e.start.version };
    else return null;
    let end: EventEnd;
    if (e.end.kind === 'at' && isAnnouncementTime(e.end.value)) {
      // Civil timestamps use a fixed-width format and can be compared without
      // inventing a timezone; same-day update completion remains unspecified.
      if (e.end.value < (start.kind === 'at' ? start.value : start.date + 'T00:00')) return null;
      end = { kind: 'at', value: e.end.value };
    } else if (e.end.kind === 'version-end' && version(e.end.version) && e.end.value == null) {
      if (start.kind === 'after-update' && start.version !== e.end.version) return null;
      end = { kind: 'version-end', version: e.end.version };
    } else if (e.end.kind === 'not-announced' && e.end.value == null && e.end.version == null) end = { kind: 'not-announced' };
    else return null;
    entries.push({ id: e.id, title: e.title, category: e.category as StarRailEventSchedule['entries'][number]['category'], start, end, eligibility: e.eligibility, note: e.note, sourceUrl: e.sourceUrl });
  }
  if (new Set(entries.map(e => e.id)).size !== entries.length) return null;
  return { region: 'cn', clock: 'announcement', entries };
}
