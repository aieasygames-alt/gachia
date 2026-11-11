type ContentFetcher = Pick<Fetcher, 'fetch'>;

export interface GenshinPlatformBindings {
  ASSETS?: ContentFetcher;
  GENSHIN_CONTENT?: ContentFetcher;
  GENSHIN_CONTENT_ENABLED?: string;
}

export class GenshinContentUnavailableError extends Error {
  constructor() { super('Genshin content unavailable'); this.name = 'GenshinContentUnavailableError'; }
}

export async function readGenshinContentJSON<T>(env: GenshinPlatformBindings, paths: { owner: string; compatibility: string },
  maxBytes: number, parse: (value: unknown) => T): Promise<T> {
  const remote = env.GENSHIN_CONTENT_ENABLED === 'true';
  const worker = remote ? env.GENSHIN_CONTENT : env.ASSETS;
  if (!worker) throw new GenshinContentUnavailableError();
  const path = remote ? paths.owner : paths.compatibility;
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new GenshinContentUnavailableError()); }, 5000);
  });
  try {
    const response = await Promise.race([worker.fetch(new Request(`https://gachia.com${path}`, {
      method: 'GET', headers: { accept: 'application/json' }, redirect: 'manual', signal: controller.signal,
    })), deadline]);
    if (response.status !== 200 || response.headers.has('set-cookie')
      || response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
      || Number(response.headers.get('content-length') ?? 0) > maxBytes || !response.body) {
      controller.abort();
      void response.body?.cancel().catch(() => {});
      throw new GenshinContentUnavailableError();
    }
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new GenshinContentUnavailableError();
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  } catch {
    controller.abort();
    throw new GenshinContentUnavailableError();
  } finally {
    clearTimeout(timer);
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
