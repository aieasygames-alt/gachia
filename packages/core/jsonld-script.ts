// Escape HTML raw-text delimiters without changing the parsed JSON value.
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError('JSON-LD value is not serializable');
  return json.replace(/</g, '\\u003c');
}
