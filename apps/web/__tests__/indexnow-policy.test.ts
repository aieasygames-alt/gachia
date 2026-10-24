import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { POST } from '@/app/api/indexnow/route';
import { notifyIndexNow, notifySingleUrl, notifyCharacterUpdate, notifyGameUpdate } from '@/lib/indexnow';

const request = (body: unknown, token = 'test-internal-token') => new Request('https://gachia.com/api/indexnow', {
  method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body),
});
const noNetwork = vi.fn(() => { throw new Error('Outbound network forbidden in IndexNow tests'); });

beforeEach(() => {
  vi.stubEnv('INDEXNOW_AUTH_TOKEN', 'test-internal-token');
  vi.stubGlobal('fetch', noNetwork);
  noNetwork.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  expect(noNetwork).not.toHaveBeenCalled();
  vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks();
});

it('retains service-secret and bearer authentication boundaries', async () => {
  expect((await POST(request({ urls: ['https://gachia.com/zh'] }, 'wrong'))).status).toBe(401);
  vi.stubEnv('INDEXNOW_AUTH_TOKEN', '');
  expect((await POST(request({ urls: ['https://gachia.com/zh'] }))).status).toBe(503);
});

it.each(['https://gachia.com/zh', 'https://gachia.com/en/roco/characters/meewee', 'https://gachia.com/ja/genshin/guides/starter-guide'])('does not let authentication approve %s for submission', async url => {
  const response = await POST(request({ urls: [url, url], submit: true, approved: true }));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ ok: false, candidates: 1, submissionApproved: false, reason: 'content_and_production_review_required' });
});

it.each([{}, { urls: [] }, { urls: Array(10001).fill('https://gachia.com/zh') }, { urls: ['https://gachia.com/zh', 'https://evil.example/zh'] }, { urls: ['/zh'] }, { urls: ['https://u:p@gachia.com/zh'] }, { urls: ['https://gachia.com:443/zh'] }, { urls: ['https://gachia.com/zh?x=1'] }, { urls: ['https://gachia.com/zh#x'] }])('rejects invalid payload %# without partial sends', async payload => {
  expect((await POST(request(payload))).status).toBe(400);
});

it('keeps all server helper APIs non-throwing but paused, including invalid mixed batches', async () => {
  await notifyIndexNow(['/zh', 'https://evil.example/zh']);
  await notifyIndexNow([]);
  await notifySingleUrl('/zh');
  await notifyCharacterUpdate('roco', 'meewee');
  await notifyGameUpdate('genshin');
  expect(console.warn).toHaveBeenCalledTimes(3);
  expect(console.error).toHaveBeenCalledTimes(2);
});
