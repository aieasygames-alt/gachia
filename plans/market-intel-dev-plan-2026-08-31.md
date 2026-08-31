# Gachia 游戏情报内容开发计划

计划日期：2026-08-31  
依据报告：`/plans/market-intel-2026-08-31.md`  
目标：把最新公开情报转成可上线的版本页、兑换码页、下载页、专题攻略和本地执行面板状态。  
范围：只处理当前站点游戏：原神、崩坏：星穹铁道、鸣潮、异环、绝区零、归环、无限大、明日方舟：终末地、遗忘之海、失控进化。Roco / Roco-CN 不纳入本轮开发计划。

## 1. 开发原则

1. 优先改已有路由和数据，不新建复杂后台。
2. 用 `apps/web/lib/market-intel.ts` 记录本轮机会、状态和来源。
3. 用 `apps/web/lib/version-snapshots.ts` 驱动各游戏 `/version` 首屏口径。
4. 攻略内容优先补在各游戏 `apps/web/public/data/{game}/raw-guides.json`，复用现有 `/guides/[slug]` 路由。
5. 兑换码只更新已确认可用、已过期或需等待的状态，过期直播码必须标注 `expired`。
6. 未确认日期、平台、测试资格统一使用事实核查口径，不写成已定档。
7. 风险词只进入治理规则和过滤提示，不承接为内容页。

## 2. 阶段一：情报系统与版本快照同步

优先级：P0  
预计改动：共享数据与本地面板  
目的：让执行面板反映 2026-08-31 报告，而不是停留在 2026-08-28。

### 2.1 更新情报批次数据

文件：`apps/web/lib/market-intel.ts`

任务：

1. 将 `MARKET_INTEL_BATCH_ID` 改为 `market-intel-2026-08-31`。
2. 将 `MARKET_INTEL_SOURCE_REPORT` 改为 `/plans/market-intel-2026-08-31.md`。
3. 更新 P0 机会：
   - `genshin-7-0-phase-ii-nod-krai`
   - `zzz-3-2-post-livestream-expired-codes`
   - `endfield-steam-pioneer-test-aic`
   - `sea-early-2027-december-beta`
   - `ananta-2027-launch-platforms`
4. 更新 P1 机会：
   - `wuwa-3-6-post-launch`
   - `nte-1-2-aug31-sep14-events`
   - `skjh-aug31-event-ended-catchup`
   - `starrail-4x-fate-planning`
   - `guihuan-test-timeline-faq`
5. 将 Roco / Roco-CN 机会从本轮面板中移出或降为非本轮观察，不进入当前站点报告主列表。
6. 每个 opportunity 补齐：
   - `keywordCluster`
   - `riskTerms`
   - `targetPages`
   - `actions`
   - `sourceDate: 2026-08-31`
   - `sourceUrls`
   - `status`

验收：

1. `/zh/tools/market-intel` 显示批次为 `market-intel-2026-08-31`。
2. P0 数量为 5，P1 数量为 5。
3. 面板覆盖游戏为 10 个，不包含 Roco / Roco-CN。
4. `getMarketIntelValidationIssues()` 返回空数组。

### 2.2 更新版本快照

文件：`apps/web/lib/version-snapshots.ts`

任务：

1. 将 `VERSION_SNAPSHOT_UPDATED_AT` 改为 `2026-08-31`。
2. 原神：
   - `currentVersion`: `7.0 Phase II`
   - 强化 Nod-Krai、Cryoculus、Phase II banner、interactive map、codes。
   - 链接加入 `/genshin/map`、`/genshin/guides/banner-schedule-guide`、`/genshin/redeem-codes`。
3. ZZZ：
   - 从 `3.2 livestream watch` 改为 `3.2 post-livestream`
   - 明确直播码已过期，版本预热、新代理人和下期兑换码提醒。
4. Endfield：
   - 从 `August test watch` 改为 `Steam Pioneer Test watch`
   - 首屏加入 Steam Pioneer Test recruitment、download、AIC/blueprint。
5. Sea：
   - 维持 watch，但口径改为 `early 2027 / December closed beta`
   - 平台说明覆盖 PC、PS5、Xbox、iOS、Android，并区分确认程度。
6. Ananta：
   - 保持 2027-01-15，上线准备口径补 Chongxiao、no-gacha、PS5/PC/mobile。
7. SKJH：
   - 从 8 月活动进行中改为 8/31 活动收尾 / 结束后补课。
8. WuWa、NTE、StarRail、Guihuan 做 P1 级别文案刷新，避免过期口径。

验收：

1. 每个 `/zh/{game}/version` 首屏与 2026-08-31 报告一致。
2. `lastUpdatedAt` 全部指向 `2026-08-31`。
3. 英文和日文至少不出现明显过期日期或错误平台。

## 3. 阶段二：P0 内容落地

优先级：P0  
预计改动：版本页数据、攻略 JSON、兑换码 JSON、下载/平台 FAQ  
目的：把本轮最可能带来搜索流量的机会变成可访问页面。

### 3.1 原神 7.0 Phase II / Nod-Krai

目标页面：

1. `/genshin/version`
2. `/genshin/map`
3. `/genshin/redeem-codes`
4. `/genshin/guides/banner-schedule-guide`

开发任务：

1. 更新版本快照，首屏突出 7.0 Phase II。
2. 在 banner guide 加 Phase II banner、current banner、next banner、抽卡规划 FAQ。
3. 在地图相关入口增加 Nod-Krai / Cryoculus checklist 的导流。
4. 兑换码页强调当前码、过期码和版本码区别。
5. 若已有 `raw-guides.json` 中有对应旧专题，直接刷新，不重复创建相近 slug。

验收：

1. 搜索意图 `Genshin Impact 7.0 Phase II banner` 能落到版本页或 banner guide。
2. 搜索意图 `Nod-Krai Cryoculus map` 能从版本页进入地图页。
3. 页面不承接 leaks、mod、成人同人等风险词。

### 3.2 ZZZ 3.2 直播后 / 过期码

目标页面：

1. `/zzz/version`
2. `/zzz/redeem-codes`
3. `/zzz/guides/steam-3-0-start-guide`

开发任务：

1. 将 `/zzz/version` 从直播前 watch 改成直播后 recap。
2. 在 `raw-redeem-codes.json` 中把 3.2 直播码标注为过期，不放入可领取列表。
3. 新增或刷新 `3.2 livestream recap and expired codes` 主题内容。
4. 版本页保留 Steam / Xbox / Microsoft Store 入坑导流。

验收：

1. 用户看到 `FLINTWORKS` 一类直播码时知道已经过期。
2. 页面仍承接 `Zenless Zone Zero 3.2 release date`、`new agents`、`livestream codes expired`。
3. 不误导用户复制过期码。

### 3.3 Endfield Steam Pioneer Test / AIC

目标页面：

1. `/endfield/version`
2. `/endfield/download`
3. `/endfield/guides/homecoming-update-guide`

开发任务：

1. 版本快照加入 Steam Pioneer Test recruitment。
2. 下载页和 download guide 加测试资格、Steam 入口、设备要求、官方来源提醒。
3. Homecoming guide 增加 AIC factory / blueprint 新手导流。
4. 如专题不足，新增 `steam-pioneer-test-registration-faq` 或 `aic-factory-blueprint-starter`。

验收：

1. `Arknights Endfield Steam`、`Pioneer Test recruitment`、`AIC factory` 均有明确入口。
2. 不把测试资格写成全量开放。
3. 下载入口只指向官方/商店/官方公告。

### 3.4 Sea early 2027 / December closed beta

目标页面：

1. `/sea/version`
2. `/sea/download`
3. `/sea/guides/platform-download-guide`
4. `/sea/guides/what-is-forgotten-sea`

开发任务：

1. 将 release date 口径从泛 2026 改为 early 2027 watch。
2. 补 December closed beta watch，但标注为需以官方最终公告为准。
3. 平台表拆分 PC、Steam、PS5、Xbox、iOS、Android。
4. FAQ 覆盖 gacha、solo、MMO、closed beta、platform。

验收：

1. 英文 FAQ 不再出现“2026 已确认上线”的误导。
2. 平台和测试资格有确认程度标记。
3. `Sea of Remnants release date` 与 `closed beta December` 有独立 FAQ。

### 3.5 Ananta 2027-01-15 / no-gacha

目标页面：

1. `/ananta/version`
2. `/ananta/download`
3. `/ananta/guides/release-date-beta-pc-faq`
4. `/ananta/guides/preregistration-no-gacha-guide`
5. `/ananta/guides/gameplay-city-no-gacha-comparison-faq`

开发任务：

1. 继续保持 2027-01-15 作为当前公开计划日期。
2. 平台表明确 PS5、PC、Android、iOS。
3. Steam / Xbox 使用谨慎口径，不作为确认平台。
4. 强化 Chongxiao、urban open world、no-gacha、cosmetics 的 FAQ。
5. 移除或修正旧数据中可能出现的“抽卡系统/SSR/pity”类模板化内容。

验收：

1. 页面不会把 Ananta 写成传统 gacha。
2. 用户搜索 `Ananta no gacha`、`Ananta release date January 15 2027` 能得到清晰答案。
3. 平台状态与官方当前口径一致。

## 4. 阶段三：P1 内容跟进

优先级：P1  
建议节奏：P0 完成并部署后 1-2 天内推进。

### 4.1 鸣潮 3.6 上线后

目标页面：

1. `/wuwa/version`
2. `/wuwa/guides/banner-schedule-guide`
3. `/wuwa/redeem-codes`
4. `/wuwa/download`
5. `/wuwa/map`

任务：

1. 版本页从 3.5/维护旧口径更新到 3.6 上线后。
2. 承接 Qingxiao、Jingran、banner、codes、map、Xbox、Steam。
3. 保留 Xbox/Game Pass 新玩家路线。

### 4.2 NTE 1.2 活动与 999 Nights

目标页面：

1. `/nte/version`
2. `/nte/redeem-codes`
3. `/nte/guides/download-install-guide`
4. 新增或刷新活动日历 / 999 Nights 专题。

任务：

1. 加入 2026-08-31 至 2026-09-14 活动窗口。
2. 承接 Clash、999 Nights、Iroi、Shinku、codes、download、Steam。
3. 1.3 仅保留观察，不写死。

### 4.3 SKJH 活动收尾与新手补课

目标页面：

1. `/skjh/version`
2. `/skjh/guides/official-pc-download-faq`
3. `/skjh/guides/first-2-hours-starter-route`
4. `/skjh/guides/server-mode-choice`

任务：

1. 将 8/31 活动从进行中改成结束或收尾提醒。
2. 补“错过活动后还能做什么”FAQ。
3. 强化 WeGame 下载、礼包、S1、服务器模式、防抄家路线。

### 4.4 星铁 4.x 长尾

目标页面：

1. `/starrail/version`
2. `/starrail/redeem-codes`
3. `/starrail/guides/banner-schedule-guide`
4. Fate / Gilgamesh / Kafka / Cyrene 相关专题。

任务：

1. 更新 4.x 抽取规划和队伍构建入口。
2. 将 Fate 联动、Gilgamesh、Kafka、Cyrene 归为长期 evergreen 内容。
3. 不承接内鬼、泄露、成人同人词。

### 4.5 归环事实核查

目标页面：

1. `/guihuan/version`
2. `/guihuan/guides/test-release-timeline-guide`
3. `/guihuan/guides/download-install-guide`
4. `/guihuan/guides/official-release-company-faq`

任务：

1. 继续强化上线时间、国际服、官方、开发商、测试招募。
2. 首屏说明未确认公测日期时以官方公告为准。
3. 对“库洛”等歧义联想词做核验，不写成事实。

## 5. 阶段四：站点治理与自动化

优先级：P1  
目的：减少每次人工转报告时的重复动作。

任务：

1. 更新 `apps/web/lib/keyword-governance.ts`：
   - 确认 `mod / 内鬼 / 同人 / 成人 / aes key / akt / vicineko / 公益服 / 私服 / 破解版` 都在风险规则内。
2. 增加测试：
   - market intel 不允许批次报告外游戏进入本轮主机会。
   - expired code 不应展示在可领取模块。
   - platform FAQ 必须区分 confirmed / store-listed / unconfirmed。
3. 评估是否给报告生成脚本增加轻量模板：
   - 输入：本期报告 Markdown。
   - 输出：market-intel opportunity 草稿。
   - 暂不做自动抓取和自动发文，避免误发未核验内容。
4. 本地执行面板增加下一步字段：
   - `implementationPhase`
   - `ownerNote`
   - `lastVerifiedAt`
   - `nextAction`

验收：

1. 测试覆盖情报数据、风险词、兑换码和版本快照。
2. 面板能直接回答“下一步该执行什么”。
3. 自动化仍停留在辅助生成草稿，不直接发布内容。

## 6. 推荐执行顺序

1. 执行阶段一：同步 `market-intel.ts` 和 `version-snapshots.ts`。
2. 执行阶段二中的 ZZZ、Ananta、Sea，因为它们存在过期码、发售日期和商业模式这类高误导风险。
3. 执行阶段二中的 Genshin、Endfield，补强高搜索量入口。
4. 跑测试并本地查看 `/zh/tools/market-intel`、`/zh/{game}/version`。
5. 提交、推送，触发 Cloudflare 部署。
6. 部署后执行阶段三 P1 内容。
7. 最后补阶段四治理测试和轻量模板。

## 7. 验证命令

建议每批改动后运行：

```bash
pnpm --filter @gachia/web test
pnpm --filter @gachia/web lint
pnpm --filter @gachia/web build
```

本地查看：

```bash
pnpm --filter @gachia/web dev
```

重点 URL：

1. `http://localhost:3000/zh/tools/market-intel`
2. `http://localhost:3000/zh/genshin/version`
3. `http://localhost:3000/zh/zzz/version`
4. `http://localhost:3000/zh/endfield/version`
5. `http://localhost:3000/zh/sea/version`
6. `http://localhost:3000/zh/ananta/version`

## 8. 完成定义

本轮开发完成需要同时满足：

1. 执行面板已切到 2026-08-31 批次。
2. P0 的 5 个游戏页面口径已更新。
3. 过期码、未确认平台、未确认上线日期均有明确提示。
4. P1 清单已进入 backlog 或已完成基础刷新。
5. 测试、lint、build 通过。
6. 代码已提交并推送，Cloudflare 部署成功。
