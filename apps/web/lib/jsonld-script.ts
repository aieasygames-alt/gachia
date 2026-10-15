// JSON remains equivalent, but HTML cannot interpret data as a closing script tag.
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError('JSON-LD value is not serializable');
  return json.replace(/</g, '\\u003c');
}
