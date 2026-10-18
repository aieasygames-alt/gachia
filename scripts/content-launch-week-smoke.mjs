import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const origins = {
  main: process.env.MAIN_ORIGIN,
  lvmeng: process.env.LVMENG_ORIGIN,
  nte: process.env.NTE_ORIGIN,
};
for (const [app, origin] of Object.entries(origins)) {
  assert.ok(origin, `Set ${app.toUpperCase()}_ORIGIN for the built application.`);
  assert.ok(['http:', 'https:'].includes(new URL(origin).protocol));
}

const checks = [
  ['lvmeng', '/zh/lvmeng', ['首发周修复与排障', '本站未逐设备复测']],
  ['lvmeng', '/zh/lvmeng/news', ['2026-10-17', '2026-10-16']],
  ['lvmeng', '/zh/lvmeng/version', ['10月17日修复', '10月16日修复']],
  ['lvmeng', '/zh/lvmeng/map', ['尚未发布新坐标', 'VIII号残片']],
  ['lvmeng', '/zh/lvmeng/download', ['更新并重新登录', '25GB以上', '15GB以上']],
  ['lvmeng', '/zh/lvmeng/launch-check', ['永久签到与成长奖励', '卡池、概率与保底', '未验证到有效码']],
  ['lvmeng', '/zh/lvmeng/starter-guide', ['累计第2天', '累计第7天', '尚未进行客户端完整路线实测']],
  ['lvmeng', '/zh/lvmeng/progression', ['客户端采集验收清单', '材料来源尚未实测']],
  ['lvmeng', '/zh/lvmeng/characters/he-yulian', ['官方获取流程', '不是公测首周结束就失效']],
  ['lvmeng', '/zh/lvmeng/characters/fulizi', ['弗莉兹', '839571350325560067']],
  ['lvmeng', '/zh/lvmeng/characters/lilang', ['璃琅', '834478269179891580']],
  ['lvmeng', '/zh/lvmeng/characters/daliya', ['达里娅', '831939862348170248']],
  ['lvmeng', '/zh/lvmeng/characters/lita', ['命名待交叉核对', '不合并技能']],
  ['main', '/zh/endfield', ['国服丹青渡', '旧数值、配方和蓝图不直接视为当前规则']],
  ['main', '/zh/endfield/version', ['丹青渡', '不是所有新账号均可领取', '服务器时间']],
  ['main', '/zh/endfield/events', ['国服丹青渡活动看板', '历史与地区边界']],
  ['main', '/zh/endfield/download', ['丹青渡更新已公开', 'App Store', 'PS5']],
  ['main', '/zh/endfield/guides/danqingdu-cn-update-guide', ['自动农植机', '不是所有新玩家均可领取']],
  ['main', '/zh/hi3/version', ['国服9.1', '全球服9.0', '9.1详细更新']],
  ['main', '/zh/aniimo/version', ['10月16日周更新', '10月21日04:00', '未注明时区']],
  ['main', '/zh/zzz/version', ['菲欧妮机制介绍已公开', '不等于3.3已上线']],
  ['main', '/zh/wuwa/version', ['锁暝战斗演示', '未据本轮核验确认3.8']],
  ['nte', '/zh/nte/version', ['10月16、17日', '不能改写为已经修好']],
];
for (const locale of ['en', 'ja']) {
  for (const game of ['endfield', 'hi3', 'aniimo', 'zzz', 'wuwa']) {
    checks.push(['main', `/${locale}/${game}/version`, ['2026-10-18']]);
  }
  checks.push(['nte', `/${locale}/nte/version`, ['2026-10-18']]);
}

const results = [];
for (const [app, path, phrases] of checks) {
  const response = await fetch(new URL(path, origins[app]), { redirect: 'manual' });
  assert.equal(response.status, 200, `${app} ${path}`);
  const html = await response.text();
  for (const phrase of phrases) assert.ok(html.includes(phrase), `${path} missing: ${phrase}`);
  assert.ok(html.includes(`https://gachia.com${path}`), `${path} missing production canonical`);
  results.push({ app, path, status: response.status, phrases: phrases.length });
}
const sitemap = await (await fetch(new URL('/sitemap.xml', origins.lvmeng))).text();
for (const slug of ['fulizi', 'lilang', 'daliya']) assert.ok(sitemap.includes(`/characters/${slug}`));
const output = process.env.SMOKE_REPORT;
if (output) await writeFile(output, `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`Launch-week smoke passed: ${results.length} routes across main, lvmeng and nte; new character sitemap entries present.`);
