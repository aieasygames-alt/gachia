import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { allowProductionIntegrations } from '../lib/production-integrations';

describe('main-site third-party integration boundary', () => {
  it('renders nothing initially and after mounting on staging, but enables production', () => {
    const source = readFileSync(new URL('../components/production-integrations.tsx', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
    } }).outputText;
    for (const origin of ['https://gachia.com', 'https://gachia-staging.aieasygames.workers.dev']) {
      let state = false;
      let effect: () => void = () => {};
      const exports: { ProductionIntegrations?: () => unknown } = {};
      const require = (name: string) => {
        if (name === 'react') return {
          useState: () => [state, (value: boolean) => { state = value; }],
          useEffect: (callback: () => void) => { effect = callback; },
        };
        if (name === 'react/jsx-runtime') return { jsx: (type: unknown, props: unknown) => ({ type, props }),
          jsxs: (type: unknown, props: unknown) => ({ type, props }), Fragment: 'fragment' };
        if (name === 'next/script') return { default: 'script' };
        return { allowProductionIntegrations };
      };
      new Function('require', 'exports', 'process', 'window', compiled)(require, exports,
        { env: { NODE_ENV: 'production' } }, { location: { origin } });
      expect(exports.ProductionIntegrations!()).toBeNull();
      effect();
      if (origin === 'https://gachia.com') expect(exports.ProductionIntegrations!()).not.toBeNull();
      else expect(exports.ProductionIntegrations!()).toBeNull();
    }
  });

  it('allows only the exact production browser origin in production mode', () => {
    expect(allowProductionIntegrations('production', 'https://gachia.com')).toBe(true);
    for (const mode of ['development', 'test', undefined]) {
      expect(allowProductionIntegrations(mode, 'https://gachia.com')).toBe(false);
    }
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000',
      'https://gachia-staging.aieasygames.workers.dev', 'https://gachia.aieasygames.workers.dev',
      'https://gachia.com.example.com', 'https://www.gachia.com', 'http://gachia.com',
      'https://gachia.com:8443', '', 'null']) {
      expect(allowProductionIntegrations('production', origin)).toBe(false);
    }
  });

  it('keeps the server layout free of direct tracking scripts', () => {
    const layout = readFileSync(new URL('../app/[lang]/layout.tsx', import.meta.url), 'utf8');
    expect(layout).toContain('<ProductionIntegrations />');
    expect(layout).not.toMatch(/googletagmanager|googlesyndication|clarity\.ms|gtag\(/);
    const component = readFileSync(new URL('../components/production-integrations.tsx', import.meta.url), 'utf8');
    expect(component).toContain('useState(false)');
    expect(component).toContain('window.location.origin');
    expect(component).toContain('if (!enabled) return null');
    expect(component).toContain('id="google-adsense"');
    expect(component).not.toMatch(/<script\b/);
  });
});
