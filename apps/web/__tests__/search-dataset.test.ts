import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
const valid = { hi3: { characters: [{ id: 'one', name: 'One', nameAlt: '' }] } };

it.each(['http', 'json', 'shape', 'network'])('evicts %s failures and recovers on retry', async (kind) => {
  const fetcher = vi.fn().mockImplementationOnce(() => {
    if (kind === 'network') return Promise.reject(new Error('offline'));
    return Promise.resolve(kind === 'http' ? new Response('', { status: 503 }) : new Response(kind === 'json' ? '{broken' : '{"hi3":{"characters":[{}]}}'));
  }).mockResolvedValue(new Response(JSON.stringify(valid)));
  vi.stubGlobal('fetch', fetcher);
  const { loadSearchDataset } = await import('@/lib/search-dataset');
  await expect(loadSearchDataset('zh')).rejects.toThrow();
  await expect(loadSearchDataset('zh')).resolves.toEqual(valid);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('deduplicates in-flight and successful requests by locale and applies a timeout', async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(valid))));
  vi.stubGlobal('fetch', fetcher);
  const { loadSearchDataset } = await import('@/lib/search-dataset');
  const first = loadSearchDataset('en');
  expect(loadSearchDataset('en')).toBe(first);
  await first;
  expect(loadSearchDataset('en')).toBe(first);
  await loadSearchDataset('ja');
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
});

it('shares an in-flight failure without evicting another locale and deduplicates retry', async () => {
  let rejectRequest!: (reason: Error) => void;
  const failure = new Error('offline');
  const fetcher = vi.fn()
    .mockImplementationOnce(() => new Promise<Response>((_resolve, reject) => { rejectRequest = reject; }))
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(valid))));
  vi.stubGlobal('fetch', fetcher);
  const { loadSearchDataset } = await import('@/lib/search-dataset');
  const first = loadSearchDataset('zh');
  expect(loadSearchDataset('zh')).toBe(first);
  const rejected = expect(first).rejects.toBe(failure);
  const english = loadSearchDataset('en');
  await english;
  rejectRequest(failure);
  await rejected;
  expect(loadSearchDataset('en')).toBe(english);
  const retry = loadSearchDataset('zh');
  expect(retry).not.toBe(first);
  expect(loadSearchDataset('zh')).toBe(retry);
  await expect(retry).resolves.toEqual(valid);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
