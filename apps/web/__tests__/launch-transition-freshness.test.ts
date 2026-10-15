import { describe, expect, it } from 'vitest';
import { scanFreshnessEntryFile } from '@/lib/content-freshness';

describe('source-backed launch transitions', () => {
  it('detects the superseded store estimate and stale live states', () => {
    expect(scanFreshnessEntryFile('three-game-status.ts', "id: 'lvmeng', status: 'upcoming'")).toHaveLength(1);
    expect(scanFreshnessEntryFile('three-game-status.ts', 'App Store 显示预计 2026 年 10 月 31 日推出')).toHaveLength(1);
    expect(scanFreshnessEntryFile('three-game-status.ts', "id: 'azur-promilia', status: 'test'")).toHaveLength(1);
  });

  it('flags a pending past preview without flagging an ended preview', () => {
    expect(scanFreshnessEntryFile('live-content.ts', '3.3前瞻将于10月9日播出')).toHaveLength(1);
    expect(scanFreshnessEntryFile('live-content.ts', '3.3前瞻10月9日已发布，节目码10月11日失效')).toHaveLength(0);
    expect(scanFreshnessEntryFile('data.ts', "id: 'lvmeng', status: 'live'")).toHaveLength(0);
  });
});
