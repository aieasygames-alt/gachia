// Complete snapshots remain bounded by both record count and serialized UTF-8 bytes.
export const STARRAIL_LOCALE_LIMIT = 100;
export const STARRAIL_PUBLICATION_LIMIT = STARRAIL_LOCALE_LIMIT * 3;
export const STARRAIL_EXPORT_LIMIT = STARRAIL_PUBLICATION_LIMIT + 1;
export const STARRAIL_PUBLICATION_BYTES = 512 * 1024;
