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
    expect(downloadPage).toContain('3.7 资源下载与新玩家入坑问题');
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

  it('keeps Endfield current entries on the post-test route instead of Homecoming archives', () => {
    const home = readAppFile('[lang]/[game]/page.tsx');
    const version = readAppFile('[lang]/[game]/version/page.tsx');
    const teams = readAppFile('[lang]/[game]/teams/endfield-teams-client.tsx');

    expect(home).toContain("endfield: ['pioneer-test-post-test-route'");
    expect(home).toContain("href: '/endfield/events'");
    expect(version).toContain('pioneer-test-post-test-route');
    expect(teams).toContain('终末地测试后入口');
  });

  it('marks Endfield build and tier data as Pioneer Test references', () => {
    const tierList = readAppFile('[lang]/[game]/tier-list/page.tsx');
    const build = readAppFile('[lang]/[game]/build/endfield-build-client.tsx');
    const characterDetail = readAppFile('[lang]/[game]/characters/[id]/endfield-character-detail.tsx');
    const weapons = readAppFile('[lang]/[game]/weapons/page.tsx');

    expect(tierList).toContain('Pioneer Test 快照');
    expect(tierList).toContain('2026-06-06');
    expect(build).toContain('来自 Pioneer Test 资料');
    expect(characterDetail).toContain('测试参考');
    expect(weapons).toContain("href: '/endfield/events'");
  });

  it('keeps Endfield character and weapon overviews on the Pioneer Test status route', () => {
    const characters = readAppFile('[lang]/[game]/characters/page.tsx');
    const weapons = readAppFile('[lang]/[game]/weapons/page.tsx');

    expect(characters).toContain("href: '/endfield/events'");
    expect(characters).toContain('终末地角色、技能、材料、武器与配队内容均为 Pioneer Test 资料参考');
    expect(weapons).toContain('本页武器属性、效果与来源来自 Pioneer Test 资料快照');
  });

  it('keeps Endfield materials on post-test and reusable factory routes', () => {
    const items = readAppFile('[lang]/[game]/items/page.tsx');

    expect(items).toContain("href: '/endfield/events'");
    expect(items).toContain("href: '/endfield/guides/blueprint-aic-factory-guide'");
    expect(items).toContain('材料、装备套装、来源与推荐来自 Pioneer Test 资料快照');
    expect(items).not.toContain("href: '/endfield/guides/crisis-contract-guide'");
  });

  it('keeps Endfield homepage and weapon details scoped to Pioneer Test data', () => {
    const home = readAppFile('[lang]/[game]/page.tsx');
    const weaponDetail = readAppFile('[lang]/[game]/weapons/[id]/page.tsx');

    expect(home).toContain('Gachia 当前整理 Pioneer Test 的干员、武器、配装、AIC 工厂与测试后路线');
    expect(home).not.toContain('覆盖全部可玩角色');
    expect(weaponDetail).toContain("href: '/endfield/events'");
    expect(weaponDetail).toContain('先确认武器资料适用范围与官方观察项');
  });

  it('treats Endfield downloads and specs as official-only until an opening notice exists', () => {
    const downloadGuide = guideById(endfieldGuides, 'download-install-guide');

    expect(downloadGuide.title).toContain('官方状态与下载核对');
    expect(downloadGuide.content).toContain('Pioneer Test 招募已结束');
    expect(downloadGuide.content).toContain('/endfield/events');
    expect(downloadGuide.content).toContain('不使用第三方镜像');
    expect(downloadGuide.content).not.toContain('NVIDIA GTX 1060');
    expect(downloadGuide.contentEn).not.toContain('iPhone 12 or later');
  });

  it('keeps Endfield guide discovery focused on post-test routes instead of legacy crisis content', () => {
    const guideIndex = readAppFile('[lang]/[game]/guides/page.tsx');
    const guideDetail = readAppFile('[lang]/[game]/guides/[slug]/page.tsx');

    expect(guideIndex).toContain("endfield: ['pioneer-test-post-test-route', 'official-download-specs-homecoming-faq', 'blueprint-aic-factory-guide']");
    expect(guideIndex).not.toContain("endfield: ['download-install-guide', 'combat-system-guide', 'crisis-contract-guide']");
    expect(guideDetail).toContain("normalized.includes('pioneer test archive')");
    expect(guideDetail).toContain('历史测试或旧版本资料');
  });

  it('routes Endfield detail, version, and compare tools through post-test status', () => {
    const characterDetail = readAppFile('[lang]/[game]/characters/[id]/character-detail-shared.tsx');
    const version = readAppFile('[lang]/[game]/version/page.tsx');
    const compare = readAppFile('[lang]/[game]/compare/endfield-compare-client.tsx');

    expect(characterDetail).toContain("href: '/endfield/events'");
    expect(characterDetail).toContain("href: '/endfield/guides/pioneer-test-post-test-route'");
    expect(version).toContain("href: '/endfield/events'");
    expect(version).not.toContain("href: '/endfield/guides/crisis-contract-guide'");
    expect(compare).toContain('角色属性、获取方式、Tier 与配队来自 Pioneer Test 资料快照');
  });
});
