import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('can print a markdown action report for local review', () => {
    const output = execFileSync('node', ['scripts/content-freshness-audit.mjs', '--markdown'], {
      cwd: '../..',
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    });

    expect(output).toContain('# Content Freshness Audit');
    expect(output).toContain('## Summary');
    expect(output).toContain('## By Game');
    expect(output).toContain('## Action Queue');
    expect(output).toContain('No live-entry stale wording risks found.');
  });

  it('can write the report to a requested output path', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'gachia-freshness-'));
    const outputPath = join(tempDir, 'freshness.md');
    const output = execFileSync('node', ['scripts/content-freshness-audit.mjs', '--markdown', '--output', outputPath], {
      cwd: '../..',
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    });

    expect(output).toContain('Wrote');
    expect(existsSync(outputPath)).toBe(true);
    expect(readFileSync(outputPath, 'utf8')).toContain('# Content Freshness Audit');
  });
});
