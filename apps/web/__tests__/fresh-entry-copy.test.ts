import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import endfieldGuides from '../public/data/endfield/raw-guides.json';
import seaGuides from '../public/data/sea/raw-guides.json';
import starrailGuides from '../public/data/starrail/raw-guides.json';

const appRoot = join(process.cwd(), 'app');

function readAppFile(path: string) {
  return readFileSync(join(appRoot, path), 'utf8');
}

function guideById<T extends { id: string }>(guides: readonly T[], id: string) {
  const guide = guides.find((item) => item.id === id);
  expect(guide).toBeDefined();
  return guide!;
}

describe('fresh entry copy', () => {
  it('keeps calendar and llms high-freshness hubs on the 2026-09-21 batch', () => {
    const calendar = readAppFile('[lang]/calendar/calendar-client.tsx');
    const llms = readAppFile('llms.txt/route.ts');

    expect(calendar).toContain('ZZZ 3.3');
    expect(calendar).toContain('鸣潮 3.7');
    expect(calendar).toContain('崩铁 4.6');
    expect(llms).toContain('ZZZ v3.3 watch hub');
    expect(llms).toContain('WuWa v3.7 watch hub');
    expect(llms).toContain('HSR v4.6 version hub');
  });

  it('keeps download hubs aligned with current market-intel wording', () => {
    const downloadPage = readAppFile('[lang]/[game]/download/page.tsx');

    expect(downloadPage).toContain('4.6 版本入坑路径');
    expect(downloadPage).toContain('3.7 观察和 3.6 后新玩家入坑问题');
    expect(downloadPage).toContain('3.3 观察和 3.2 后回流入坑问题');
    expect(downloadPage).toContain('Pioneer Test 后续问题');
    expect(downloadPage).toContain('PC/主机上线后核验和移动端倒计时');
  });

  it('keeps ZZZ build-entry routes from drifting back to old version labels', () => {
    const weaponsPage = readAppFile('[lang]/[game]/weapons/page.tsx');
    const discsPage = readAppFile('[lang]/[game]/drive-discs/page.tsx');
    const teamsPage = readAppFile('[lang]/[game]/teams/zzz-teams-client.tsx');

    expect(weaponsPage).toContain('先看 3.3 观察入口');
    expect(discsPage).toContain('先看 3.3 观察入口');
    expect(teamsPage).toContain('3.3 节目准备清单');
    expect(teamsPage).toContain('v3-3-special-program-prep-guide');
    expect(teamsPage).not.toContain('meta-teams-v3-guide');
    expect(weaponsPage).not.toContain('先看 3.1 当前版本');
    expect(discsPage).not.toContain('先看 3.1 当前版本');
  });

  it('marks high-traffic historical guides as archives with current routes', () => {
    const hsr = guideById(starrailGuides, 'himeko-nova-fate-pull-plan');
    const endfield = guideById(endfieldGuides, 'homecoming-operators-map-route');
    const sea = guideById(seaGuides, 'mobile-launch-guide');

    expect(hsr.content).toContain('历史归档提示');
    expect(hsr.contentEn).toContain('Archive note');
    expect(hsr.content).toContain('/starrail/version');
    expect(endfield.content).toContain('Pioneer Test 复盘');
    expect(endfield.contentEn).toContain('/endfield/version');
    expect(sea.content).toContain('early 2027 / December closed beta');
    expect(sea.contentEn).toContain('/sea/version');
  });
});
