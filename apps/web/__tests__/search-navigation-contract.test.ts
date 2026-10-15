import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, test } from 'vitest';

test('search result uses native anchor navigation, not a Next Link or router push', () => {
  const source = readFileSync(new URL('../components/search/search-dialog.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('search-dialog.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const results: ts.JsxOpeningElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(attribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === 'data-search-result')) results.push(node);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  expect(results).toHaveLength(1);
  const result = results[0];
  if (!result) throw new Error('Missing search result anchor');
  expect(result.tagName.getText(tree)).toBe('a');
  const click = result.attributes.properties.find(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === 'onClick');
  expect(click?.getText(tree)).toBe('onClick={onClose}');
  expect(source).not.toMatch(/\brouter\.(push|replace)\s*\(/);
  // Escape/Tab handlers may prevent defaults; the result click itself must not.
  expect(result.attributes.getText(tree)).not.toContain('preventDefault');
});
