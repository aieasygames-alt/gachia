import { createHash } from 'node:crypto';

export function canonical(value: unknown): string {
  const sort = (input: unknown): unknown => Array.isArray(input) ? input.map(sort)
    : input && typeof input === 'object'
      ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sort((input as Record<string, unknown>)[key])]))
      : input;
  return JSON.stringify(sort(value));
}

export const digest = (text: string) => createHash('sha256').update(text).digest('hex');
