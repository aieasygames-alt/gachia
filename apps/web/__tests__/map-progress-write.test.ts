import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DatabaseSync } from 'node:sqlite';

const mocks = vi.hoisted(() => ({ gate: vi.fn(), rate: vi.fn(), session: vi.fn(), select: vi.fn(),
  limit: vi.fn(), prepare: vi.fn(), bind: vi.fn(), run: vi.fn() }));
vi.mock('@/lib/site-features', () => ({ accountFeatureUnavailable: mocks.gate }));
vi.mock('@/lib/auth', () => ({ createAuth: () => ({ api: { getSession: mocks.session } }) }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate }));
vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mocks.select }), getD1: () => ({ prepare: mocks.prepare }),
}));
import { POST } from '../app/api/map/progress/route';

const request = () => new NextRequest('https://gachia.com/api/map/progress', {
  method: 'POST', body: JSON.stringify({ mapId: 'teyvat', markerId: 'marker-1' }),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.gate.mockReturnValue(null);
  mocks.rate.mockResolvedValue(null);
  mocks.session.mockResolvedValue({ user: { id: 'target' } });
  mocks.limit.mockResolvedValue([]);
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  mocks.prepare.mockReturnValue({ bind: mocks.bind });
  mocks.bind.mockReturnValue({ run: mocks.run });
  mocks.run.mockResolvedValue({ success: true });
});

describe('map progress write failures (enabled fixture only)', () => {
  it('uses a targeted uniqueness conflict clause and the session owner', async () => {
    expect(await (await POST(request())).json()).toEqual({ collected: true });
    expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(user_id, map_id, marker_id) DO NOTHING'));
    expect(mocks.bind).toHaveBeenCalledWith('target', 'teyvat', 'marker-1');
  });
  it.each([false, true])('reports a failed write rather than success (existing=%j)', async existing => {
    mocks.limit.mockResolvedValue(existing ? [{ id: 42 }] : []);
    mocks.run.mockRejectedValue(new Error('private database failure'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'Failed to save map progress' });
  });
  it('scopes deletion to the authenticated user', async () => {
    mocks.limit.mockResolvedValue([{ id: 42 }]);
    expect(await (await POST(request())).json()).toEqual({ collected: false });
    expect(mocks.bind).toHaveBeenCalledWith(42, 'target');
  });
  it('keeps the disabled feature gate ahead of all authentication and storage', async () => {
    mocks.gate.mockReturnValue(new Response(null, { status: 404 }));
    expect((await POST(request())).status).toBe(404);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('keeps anonymous users out', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('the exact emitted SQL tolerates duplicate markers but not foreign key failures', async () => {
    await POST(request());
    const sql = mocks.prepare.mock.calls[0]![0];
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('PRAGMA foreign_keys=ON; CREATE TABLE user(id TEXT PRIMARY KEY); INSERT INTO user VALUES (\'target\');');
      db.exec('CREATE TABLE map_progress(user_id TEXT NOT NULL REFERENCES user(id), map_id TEXT NOT NULL, marker_id TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(user_id,map_id,marker_id));');
      const insert = db.prepare(sql);
      insert.run('target', 'teyvat', 'marker-1');
      insert.run('target', 'teyvat', 'marker-1');
      expect(db.prepare('SELECT COUNT(*) AS n FROM map_progress').get()?.n).toBe(1);
      expect(() => insert.run('missing', 'teyvat', 'marker-1')).toThrow();
    } finally { db.close(); }
  });
});
