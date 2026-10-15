import { it, expect, vi } from 'vitest';
import { loadSearchModule } from '@/lib/search-module';

it('returns module or original import failure and clears the timer', async () => {
  vi.useFakeTimers();
  try {
    expect(await loadSearchModule(async () => 'ready')).toBe('ready');
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
    const failure = new Error('chunk failed');
    await expect(loadSearchModule(async () => { throw failure; })).rejects.toBe(failure);
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});
it('bounds a hung import and ignores a late resolution', async () => {
  vi.useFakeTimers();
  try {
    let resolve!: (value: string) => void;
    const pending = loadSearchModule(() => new Promise<string>((done) => { resolve = done; }), 100);
    const rejected = expect(pending).rejects.toThrow('Search module timeout');
    await vi.advanceTimersByTimeAsync(100); await rejected; resolve('late');
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});
