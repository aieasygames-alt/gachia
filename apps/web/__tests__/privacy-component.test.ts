import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import * as preferences from '../lib/privacy-preferences';
import { allowProductionIntegrations } from '../lib/production-integrations';
const compiled = ts.transpileModule(readFileSync(new URL('../components/production-integrations.tsx', import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
function mount(value: string | null, origin = 'https://gachia.com', blocked = false) {
  const states: unknown[] = []; let cursor = 0; let effect: () => void = () => {}; let stored = value;
  const replaced: string[] = []; const listeners = new Map<string, (event: unknown) => void>();
  const storage = { getItem: () => stored, setItem: (_key: string, next: string) => { if (blocked) throw Error('blocked'); stored = next; } };
  const window = { localStorage: storage, location: { origin, pathname: '/en/hi3', href: `${origin}/en/hi3`, replace: (url: string) => replaced.push(url), reload: () => replaced.push('reload') }, addEventListener: (key: string, fn: (event: unknown) => void) => listeners.set(key, fn), removeEventListener: (key: string) => listeners.delete(key) };
  const exports: { ProductionIntegrations?: () => unknown } = {};
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const require = (name: string) => {
    if (name === 'react') return { useState: (initial: unknown) => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (next: unknown) => { states[i] = next; }]; }, useEffect: (fn: () => void) => { effect = fn; } };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'next/script') return { default: 'script' };
    if (name.includes('privacy-preferences')) return preferences;
    return { allowProductionIntegrations };
  };
  new Function('require', 'exports', 'process', 'window', compiled)(require, exports, { env: { NODE_ENV: 'production' } }, window);
  const render = () => { cursor = 0; return exports.ProductionIntegrations!(); };
  const initial = render(); effect();
  return { initial, render, replaced, listeners, stored: () => stored };
}
function nodes(node: unknown): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (node && typeof node === 'object' && 'props' in node) {
    const item = node as { type: unknown; props: Record<string, unknown> };
    return [item, ...nodes(item.props.children)];
  }
  return [];
}
describe('mocked component lifecycle, not browser acceptance', () => {
  for (const value of [null, 'rejected', 'corrupt']) it(`does not render scripts for ${value}`, () => {
    const app = mount(value); expect(app.initial).toBeNull();
    expect(nodes(app.render()).filter(n => n.type === 'script')).toHaveLength(0);
  });
  it('renders only analytics after explicit acceptance', () => {
    const scripts = nodes(mount('accepted').render()).filter(n => n.type === 'script');
    expect(scripts).toHaveLength(2); expect(JSON.stringify(scripts)).not.toMatch(/clarity\.ms|googlesyndication/);
  });
  it('rejects preview and blocked writes', () => {
    expect(mount('accepted', 'https://gachia-staging.aieasygames.workers.dev').render()).toBeNull();
    expect(nodes(mount('accepted', 'https://gachia.com', true).render()).filter(n => n.type === 'script')).toHaveLength(0);
  });
  it('revokes before page replacement', () => {
    const app = mount('accepted');
    (nodes(app.render()).find(n => n.type === 'button' && n.props['aria-controls'])!.props.onClick as () => void)();
    (nodes(app.render()).find(n => n.type === 'button' && n.props.children === 'Reject optional services')!.props.onClick as () => void)();
    expect(app.stored()).toBe('rejected'); expect(app.replaced).toEqual(['https://gachia.com/en/hi3']);
  });
  it('rechecks cross-tab changes', () => {
    const app = mount('accepted'); app.listeners.get('storage')!({ key: preferences.PRIVACY_KEY });
    expect(app.replaced).toEqual(['reload']);
  });
});
