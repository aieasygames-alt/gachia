import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../../../packages/ui/adsense.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;

function mount({ choice = null, origin = 'https://gachia.com', blocked = false, mode = 'production', href = `${origin}/en/nte`, existing = false }:
  { choice?: string | null; origin?: string; blocked?: boolean; mode?: string; href?: string; existing?: boolean } = {}) {
  const values = new Map([['gachia.privacy.v1', 'accepted']]);
  if (choice !== null) values.set('gachia.ads.v1', choice);
  const states: unknown[] = []; let cursor = 0; let effect = () => {};
  const scripts: Record<string, unknown>[] = [];
  const replacements: string[] = []; const listeners = new Map<string, (event: { key: string | null }) => void>();
  const exports: { AdsensePreferences?: () => unknown } = {};
  const window = { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (blocked) throw Error('blocked'); values.set(key, value); } },
    location: { origin, pathname: '/en/nte', href, replace: (url: string) => replacements.push(url), reload: () => replacements.push('reload') },
    addEventListener: (key: string, fn: (event: { key: string | null }) => void) => listeners.set(key, fn), removeEventListener: (key: string) => listeners.delete(key) };
  const document = { getElementById: () => existing || scripts.length ? {} : null, createElement: () => ({}), head: { appendChild: (script: Record<string, unknown>) => scripts.push(script) } };
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const require = (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useState: (initial: unknown) => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (value: unknown) => { states[i] = value; }]; }, useEffect: (fn: () => void) => { effect = fn; } };
    throw Error(name);
  };
  new Function('require', 'exports', 'process', 'window', 'document', compiled)(require, exports, { env: { NODE_ENV: mode } }, window, document);
  const render = () => { cursor = 0; return exports.AdsensePreferences!(); };
  const initial = render(); effect();
  return { initial, render, scripts, replacements, listeners, effect: () => effect(), values };
}
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (value && typeof value === 'object' && 'props' in value) { const node = value as Node; return [node, ...nodes(node.props.children)]; }
  return [];
}
function click(app: ReturnType<typeof mount>, text: string) {
  const button = nodes(app.render()).find(node => node.type === 'button' && node.props.children === text)!;
  (button.props.onClick as () => void)();
}

describe('AdSense explicit consent across independent applications', () => {
  for (const choice of [null, 'rejected', 'corrupt']) it(`does not use existing Analytics consent to enable ads (${choice})`, () => {
    const app = mount({ choice }); expect(app.initial).toBeNull(); expect(app.scripts).toHaveLength(0);
  });
  it('loads the correct publisher exactly once after advertising consent', () => {
    const app = mount({ choice: 'accepted' }); app.effect();
    expect(app.scripts).toEqual([{ id: 'google-adsense', async: true, crossOrigin: 'anonymous', src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8569630257520732' }]);
  });
  for (const origin of ['http://localhost:3000', 'https://gachia-staging.aieasygames.workers.dev', 'https://gachia-game-nte.aieasygames.workers.dev', 'https://gachia.com.evil.test']) it(`never loads ads on ${origin}`, () => {
    const app = mount({ choice: 'accepted', origin }); expect(app.render()).toBeNull(); expect(app.scripts).toHaveLength(0);
  });
  it('fails closed for development, unwritable storage and an emergency-off URL', () => {
    for (const options of [{ mode: 'development' }, { blocked: true }, { href: 'https://gachia.com/en/nte?ads=off' }]) expect(mount({ choice: 'accepted', ...options }).scripts).toHaveLength(0);
  });
  it('stores a new consent before reloading', () => {
    const app = mount(); click(app, 'Allow ads');
    expect(app.values.get('gachia.ads.v1')).toBe('accepted'); expect(app.replacements).toEqual(['https://gachia.com/en/nte']);
  });
  it('revokes a running SDK with a reload, including when storage becomes unwritable', () => {
    const app = mount({ choice: 'accepted' }); click(app, 'Ad preferences'); click(app, 'Decline ads');
    expect(app.values.get('gachia.ads.v1')).toBe('rejected'); expect(app.replacements).toEqual(['https://gachia.com/en/nte']);
    const blocked = mount({ choice: 'accepted', blocked: true, existing: true }); click(blocked, 'Decline ads');
    expect(blocked.replacements).toEqual(['https://gachia.com/en/nte?ads=off']);
  });
  it('reloads for a cross-tab advertising consent change', () => {
    const app = mount({ choice: 'accepted' }); app.listeners.get('storage')!({ key: 'gachia.ads.v1' }); expect(app.replacements).toEqual(['reload']);
  });
});
