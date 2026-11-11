import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });
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
  expect(fetcher.mock.calls[0]?.[1].cache).toBe('no-store');
});

it('refreshes successful data on the next load after its bounded cache expires', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const updated = { genshin: { characters: [{ id: 'new', name: 'New', nameAlt: '' }] } };
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json(valid)).mockResolvedValueOnce(Response.json(updated));
  vi.stubGlobal('fetch', fetcher);
  const { loadSearchDataset, SEARCH_DATASET_TTL_MS } = await import('@/lib/search-dataset');
  const first = loadSearchDataset('zh');
  await first;
  clock.mockReturnValue(1000 + SEARCH_DATASET_TTL_MS - 1);
  expect(loadSearchDataset('zh')).toBe(first);
  clock.mockReturnValue(1000 + SEARCH_DATASET_TTL_MS);
  const next = loadSearchDataset('zh');
  expect(next).not.toBe(first);
  expect(loadSearchDataset('zh')).toBe(next);
  await expect(next).resolves.toEqual(updated);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('does not create duplicate requests when an in-flight load crosses the cache duration', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  let accept!: (response: Response) => void;
  const fetcher = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { accept = resolve; }));
  vi.stubGlobal('fetch', fetcher);
  const { loadSearchDataset, SEARCH_DATASET_TTL_MS } = await import('@/lib/search-dataset');
  const first = loadSearchDataset('zh');
  clock.mockReturnValue(1000 + SEARCH_DATASET_TTL_MS + 1);
  expect(loadSearchDataset('zh')).toBe(first);
  accept(Response.json(valid));
  await first;
  expect(loadSearchDataset('zh')).toBe(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('does not retain an expired successful index after refresh fails', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json(valid)).mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce(Response.json(valid));
  vi.stubGlobal('fetch', fetcher);
  const { loadSearchDataset, SEARCH_DATASET_TTL_MS } = await import('@/lib/search-dataset');
  await loadSearchDataset('zh');
  clock.mockReturnValue(1000 + SEARCH_DATASET_TTL_MS);
  await expect(loadSearchDataset('zh')).rejects.toThrow('unavailable');
  await expect(loadSearchDataset('zh')).resolves.toEqual(valid);
  expect(fetcher).toHaveBeenCalledTimes(3);
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
