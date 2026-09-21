import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

type FreshnessFinding = {
  severity: 'risk' | 'archive';
};

type FreshnessReport = {
  summary: {
    risk: number;
    archive: number;
  };
  findings: FreshnessFinding[];
};

describe('content freshness audit script', () => {
  it('reports current-entry stale wording separately from archived guide matches', () => {
    const output = execFileSync('node', ['scripts/content-freshness-audit.mjs', '--json'], {
      cwd: '../..',
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    });
    const report = JSON.parse(output) as FreshnessReport;

    expect(report.summary.risk).toBe(0);
    expect(report.summary.archive).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.severity === 'archive')).toBe(true);
  });
});
