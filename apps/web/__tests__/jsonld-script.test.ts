import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { serializeJsonLd } from '@/lib/jsonld-script';
import { buildWeaponJsonLd } from '@/lib/jsonld';

it('preserves JSON data while preventing script termination and HTML comment syntax', () => {
  const text = '</ScRiPt><script>window.injected=true</script><!-- 中文 日本語 & >';
  const value = { name: text, nested: [text], number: 3, empty: null };
  const script = serializeJsonLd(value);
  expect(script).not.toContain('<');
  expect(JSON.parse(script)).toEqual(value);
  expect(() => serializeJsonLd(undefined)).toThrow(TypeError);
});

it('keeps weapon schema content unchanged for every supported locale', () => {
  for (const locale of ['zh', 'en', 'ja'] as const) {
    const schema = buildWeaponJsonLd({ gameId: 'hi3', locale, name: '</script><img src=x>', description: 'Global notice only <unverified>', weaponId: 'fixture' });
    expect(JSON.parse(serializeJsonLd(schema))).toEqual(schema);
    expect(serializeJsonLd(schema)).not.toContain('<');
  }
});

it('uses safe serialization at all three weapon page script sinks', () => {
  const list = readFileSync(new URL('../app/[lang]/[game]/weapons/page.tsx', import.meta.url), 'utf8');
  const detail = readFileSync(new URL('../app/[lang]/[game]/weapons/[id]/page.tsx', import.meta.url), 'utf8');
  expect(list.match(/__html: serializeJsonLd\(/g)).toHaveLength(1);
  expect(detail.match(/__html: serializeJsonLd\(/g)).toHaveLength(2);
  expect(list + detail).not.toMatch(/__html:\s*JSON\.stringify/);
});

it('routes every app JSON-LD script through the shared serializer', () => {
  const walk = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
  let sinks = 0;
  for (const path of walk(join(process.cwd(), 'app'))) {
    const source = readFileSync(path, 'utf8');
    const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(tree) === 'script') {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const type = attributes.find((attribute) => attribute.name.getText(tree) === 'type')?.initializer;
        if (type && ts.isStringLiteral(type) && type.text === 'application/ld+json') {
          const html = attributes.find((attribute) => attribute.name.getText(tree) === 'dangerouslySetInnerHTML')?.initializer;
          expect(html, path).toBeDefined();
          if (!html || !ts.isJsxExpression(html) || !html.expression || !ts.isObjectLiteralExpression(html.expression)) throw new Error(`Unexpected JSON-LD sink: ${path}`);
          const property = html.expression.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(tree) === '__html');
          if (!property || !ts.isPropertyAssignment(property)) throw new Error(`Missing JSON-LD value: ${path}`);
          const value = property.initializer;
          expect(ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === 'serializeJsonLd', path).toBe(true);
          expect(source, path).toContain("import { serializeJsonLd } from '@/lib/jsonld-script'");
          sinks++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  expect(sinks).toBe(32);
});
