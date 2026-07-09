const ASSET_ORIGIN = process.env.GACHIA_ASSET_ORIGIN ?? 'https://gachia.aieasygames.workers.dev';
const JSON_CACHE = new Map<string, Promise<unknown>>();

type CloudflareRequestContext = {
  env?: {
    ASSETS?: {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  };
};

function getAssetsBinding(): NonNullable<CloudflareRequestContext['env']>['ASSETS'] | undefined {
  const context = (globalThis as any)[Symbol.for('__cloudflare-context__')] as CloudflareRequestContext | undefined;
  return context?.env?.ASSETS;
}

export async function loadJson<T>(localPath: string, assetPath: string): Promise<T> {
  const cacheKey = `${localPath}::${assetPath}`;
  const cached = JSON_CACHE.get(cacheKey);
  if (cached) {
    return cached as Promise<T>;
  }

  const promise = (async () => {
    try {
      const { readFileSync } = await import(/* webpackIgnore: true */ 'node:fs');
      return JSON.parse(readFileSync(localPath, 'utf8')) as T;
    } catch {
      const assets = getAssetsBinding();
      const response = assets
        ? await assets.fetch(new Request(new URL(assetPath, ASSET_ORIGIN)))
        : await fetch(new URL(assetPath, ASSET_ORIGIN));
      if (!response.ok) {
        throw new Error(`Failed to load ${assetPath}: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    }
  })();

  JSON_CACHE.set(cacheKey, promise);
  return promise;
}
