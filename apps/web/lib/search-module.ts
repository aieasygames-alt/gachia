export function loadSearchModule<T>(load: () => Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Search module timeout')), timeoutMs);
    Promise.resolve().then(load).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
