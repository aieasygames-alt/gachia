import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function components(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? components(path) : entry.name.endsWith('.tsx') && entry.name !== 'layout.tsx' ? [path] : [];
  });
}

describe('locale layout owns the main landmark', () => {
  it('does not nest page-owned main landmarks inside the locale main', () => {
    const directory = fileURLToPath(new URL('../app/[lang]/', import.meta.url));
    for (const path of components(directory)) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/<main\b|role=["']main["']/);
    }
    const layout = readFileSync(join(directory, 'layout.tsx'), 'utf8');
    expect(layout.match(/<main\b/g)).toHaveLength(1);
  });
});
