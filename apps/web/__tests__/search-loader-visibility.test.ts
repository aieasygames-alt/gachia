import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, it } from 'vitest';
const source = readFileSync(new URL('../components/search/search-loader.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
function render(open: boolean) {
  let loads = 0; const exports: Record<string, (props: { open: boolean }) => unknown> = {};
  const require = (name: string) => name === 'react' ? {
    useState: (initial: unknown) => [initial, () => {}],
    useEffect: (effect: () => unknown) => { effect(); },
  } : name === 'react/jsx-runtime' ? { jsx: (type: unknown, props: unknown) => ({ type, props }) } : {
    loadSearchModule: () => { loads++; return Promise.resolve({ SearchDialog: () => null }); },
  };
  new Function('require', 'exports', compiled)(require, exports);
  return { output: exports.SearchLoader!({ open }), loads };
}

it('does not render a loading modal when the search loader is closed', () => {
  expect(render(false).output).toBeNull();
  expect(render(false).loads).toBe(0);
});

// Hook stubs inspect the first render only; real focus/loading behavior is browser-tested.
it('returns a loading component on the first open render and starts one load', () => {
  expect(render(true).output).not.toBeNull();
  expect(render(true).loads).toBe(1);
});
