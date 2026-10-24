export const INDEXNOW_POLICY: Readonly<{
  mode: 'paused';
  reason: 'content_and_production_review_required';
  message: string;
}>;
export function normalizeIndexNowUrl(value: unknown): string;
export function normalizeIndexNowUrls(values: unknown): string[];
