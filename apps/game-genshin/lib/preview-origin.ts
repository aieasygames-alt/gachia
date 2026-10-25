export function isWorkerPreviewOrigin(origin: string): boolean {
  try { return new URL(origin).hostname.endsWith('.workers.dev'); }
  catch { return false; }
}
