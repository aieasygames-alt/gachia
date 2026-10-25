export function parseVerificationProgress(raw: string | null): string[] {
  if (!raw || raw.length > 256 * 1024) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    // Keep unknown IDs so temporarily unavailable tasks do not erase old progress.
    return [...new Set(value.slice(0, 2000).filter((id): id is string =>
      typeof id === 'string' && id.length > 0 && id.length <= 128))];
  } catch { return []; }
}
