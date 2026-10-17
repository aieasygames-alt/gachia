import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allowProductionIntegrations } from '../lib/production-integrations';

describe('main-site third-party integration boundary', () => {
  it('keeps optional vendors gated by explicit choice', () => {
    const source = readFileSync(new URL('../components/production-integrations.tsx', import.meta.url), 'utf8');
    expect(source).toContain('allowAnalytics(process.env.NODE_ENV, window.location.origin, choice)');
    expect(source).toContain('{enabled &&');
    expect(source).toContain('readPrivacyChoice(window.localStorage)');
    expect(source).toContain('window.location.replace(url.href)');
    expect(source).toContain("window.addEventListener('storage', changed)");
    expect(source).not.toMatch(/clarity\.ms|googlesyndication|adsbygoogle/);
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
    expect(layout.indexOf('<ProductionIntegrations />')).toBeGreaterThan(layout.indexOf('<body'));
    expect(layout).not.toMatch(/<head>[\s\S]*?<ProductionIntegrations/);
    expect(layout).not.toMatch(/googletagmanager|googlesyndication|clarity\.ms|gtag\(/);
    const component = readFileSync(new URL('../components/production-integrations.tsx', import.meta.url), 'utf8');
    expect(component).toContain('useState(false)');
    expect(component).toContain('window.location.origin');
    expect(component).toContain('if (!available) return null');
    expect(component).not.toContain('id="google-adsense"');
    expect(component).not.toMatch(/<script\b/);
  });
});
