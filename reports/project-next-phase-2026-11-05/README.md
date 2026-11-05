# 下一阶段五项任务执行记录

日期：2026-11-05。工作区 `/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`，基础HEAD `816a453b2d2165264d8a4dd6a9c660d2f7f1d90f`。本记录对应用户要求的五个分组，不把N02/N03拆成两项而漏掉N06。**本轮有源码变更与隔离验收，没有提交、推送、实际GitHub CI、安装、正式CMS内容写入或云发布。五项尚未全部端到端关闭。**

## 交付状态

| 顺序 | 工作包 | 本轮实现与本机回归 | 尚未完成 |
| --- | --- | --- | --- |
| 1 | N01 JSON-LD安全 | core共用serializer；两游戏实际详情组件与Web使用安全转义；大小写闭合/HTML注释拒绝门禁；真实Chromium注入回归 | 精确提交CI、受影响Worker构建/真实上线；线上仍为旧版本，不能称已修复公网 |
| 2 | N02/N03 CI、依赖、磁盘 | Web/Data/Router及公众类型、两游戏真实消费者纳入只读CI；文档-only跳过重依赖；4公告适用性表；prepare/build/recovery空间预检；当前入口更新 | 实际CI、安装；pin可达性清理器没有交付，不执行任何删除 |
| 3 | N04 NTE语言 | 列表/详情/metadata/Article/FAQ/alternates/sitemap共用资格；缺失/null/空串/空白、中文/英文/完整与部分日文矩阵；原53篇zh/en资格与旧日文资格保持 | 实际NTE Worker候选网络、四版本/恢复及正式发布 |
| 4 | N05 NTE中文新增 | 不可变game-bound草稿身份、确定性preview导出、Payload真实隔离生命周期/角色/碰撞/锁回归、双游戏新增前404恢复合同；准备了真实文章草稿 | **正式新增仍拒绝**；未入正式CMS、未批准、未安装、无真实候选/恢复四版本、发布/source-advance/Main交接/备份刷新 |
| 5 | N06公开保留与撤回 | O/A/B逐字段合并审核计划；未触及字段及公开CMS新增保留A；冲突/来源漂移拒绝；显式字符串reset与404/410/308撤回审核清单 | 仅review计划，未接入CMS正式导出/批准存储/推广；reset与撤回未激活，旧R35生产拒绝门禁保持 |

## 关键代码

- [共用JSON-LD serializer](../../packages/core/jsonld-script.ts)、[发布HTML安全门禁](../../scripts/desktop-version-preview.mjs)、[原来缺失但已被测试命令引用的回归文件](../../scripts/desktop-version-preview.test.mjs)。门禁是针对固定生成格式的fail-closed raw-text规则，不是通用HTML parser。
- [实际消费者测试配置](../../apps/web/vitest.guides.config.ts)、[真实页面注入回归](../../apps/web/test-support/guide-consumer.ts)。运行的是实际page函数而不是复刻sink；测试阻断所有网络，不能冒充已部署Worker或完整资产验收。
- [只读验证CI](../../.github/workflows/payload-verify.yml)、[变化分类](../../scripts/payload-verification-scope.mjs)、[依赖适用性](../../docs/payload-public-dependency-applicability-2026-11-05.md)。手动触发/未知历史/未知文件默认完整验证，无云凭据和部署步骤。
- [磁盘预检](../../scripts/desktop-disk-preflight.mjs)、[发布器接入](../../scripts/desktop-publish.mjs)、[本地恢复复制门禁](../../scripts/desktop-local-evidence.mjs)。prepare按源码三倍加1GiB；build额外6GiB加8GiB保留线，owner前再查3GiB；recovery按制品/assets大小加1GiB。预算为保守初值，不是实测峰值保证。安装器已包含新模块，但**安装版尚未更新**。
- [NTE统一语言资格](../../apps/game-nte/lib/guide-policy.ts)、[详情消费者](../../apps/game-nte/app/[lang]/nte/guides/[slug]/page.tsx)。日文仍需标题8/摘要40/正文200字符及假名，zh/en需非空标题/摘要与80字符正文；不复制中文充当翻译，FAQ不跨语言拼接。
- [NTE草稿生命周期](../../services/content-cms/tests/editorial-lifecycle.test.ts)、[新建合约](../../services/content-cms/src/desktop-guide-contract.mjs)。NTE正式导出和publisher overlay仍拒绝，preview计划不能推广；CMS与独立publisher模块逐字节相同。
- [三方与撤回计划](../../scripts/desktop-guide-intent.mjs)、[合同边界](../../docs/payload-guide-intent-contract.md)。输出固定review_required且activationSupported=false，不校验云授权，不会绕过旧reset拒绝门禁。缺失/null重置仍不受旧字符串overlay支持，计划也拒绝。

## 来源与清单修复

NTE `data.ts`合法变化暴露了迁移读取器硬编码2026-10-28摘要的问题。保留所有旧清单与历史record-plan不动，新增[2026-11-05当前清单](../../services/content-cms/inventory/2026-11-05/inventory.json)，统一[当前入口](../../services/content-cms/src/inventory-baseline.ts)。当前候选清单包括约定app/package根内非ignored的待提交源码，避免提交后才发现新文件遗漏；不扫描私有运行证据，也不执行源模块。

迁移读取仍严格校验新清单的字节摘要，来源变化仍阻断。ledger的历史批次匹配现在明确为false：reader变化也会改变批次身份，3440条内容投影/116来源/16scope保持，不把新来源混称旧批次或自动批准迁移。sourceCommit字段明确是本次capture的基础提交，不声称未提交源码已经存在于该commit。

## 验证

本机Node25.9.0/pnpm10.10.0，CI仍固定Node22.23.4；本机结果不等价于实际CI。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| CMS全量 | 181/181 | [受限并发日志](cms-tests-bounded.log) |
| desktop发布协议 | 828/828 | [完整发布日志](release-tests-final.log) |
| 其他Node发布回归 | 304/304 | 同上 |
| Python发布/备份/来源回归 | 56/56 | 同上，7组 |
| Web | 440/440 | [日志](web-tests.log) |
| Data / Router | 168/168、35/35 | [Data](data-tests.log)、[Router](router-tests.log) |
| 两游戏实际消费者/语言/浏览器 | 12/12 | [日志](guide-consumers-final.log) |
| CMS与公众/共享类型 | 通过 | [CMS](cms-typecheck.log)、[public](public-typecheck.log) |
| Next typegen / Router配置与映射 | 通过，4个专属部署 | [CMS typegen](cms-typegen.log)，Router check/validate本机执行 |
| Web lint | 0error、1条既有auth-dialog cleanup-ref warning | [日志](web-lint.log) |
| inventory:check / diff-check / 文档 | 16scope、无whitespace错误、43个本地链接通过 | [文档门禁](documentation-tests.log)，无变更历史输入 |

最初并发CMS测试曾触发旧schema子进程20秒超时，保留[失败诊断](cms-tests.log)。将默认测试并发限定为2后全量通过，未增加超时或弱化断言；生产/CMS服务未重启。另保留[中间完整发布测试](release-tests.log)，最终新增双游戏404与低空间恢复回归见final日志。

浏览器截图为实际页面组件+现有CSS的隔离渲染，外部/图片网络全部禁用，不是完整Next/Worker、hydration或真实资产验收：[桌面详情](nte-detail-desktop.png)、[手机详情](nte-detail-mobile.png)、[桌面列表](nte-list-desktop.png)、[手机列表](nte-list-mobile.png)。覆盖非空中文回退、语言标识、原文入口、站内链接、无横向页面溢出和标题/正文不重叠。

## 阻塞与继续顺序

[实机磁盘预检](disk-preflight.json)已实际拒绝启动双owner构建：可用约10-11GiB，最低要求14GiB。检测过程中没有创建release run、安装依赖、构建、上传或删除任何文件。阈值以上仍须满足恢复复制的实际预算；不通过跳过恢复、删失败journal、pin或key换空间。

1. 先审阅精确目录级空间方案，保留当前/父来源、恢复run、公开UUID、pin及失败journal；未知引用默认保护。没有自动GC、清理授权或已回收空间的声明。
2. 对本轮源码作精确提交及只读CI，再在预算允许时完成安全/语言消费者的game+Main候选与兼容恢复验证；安装版身份另验，不把未提交工作区当封存发布输入。
3. N04实际Worker验收后单独解除NTE正式新增门禁，构建/安装精确版本；将[已起草文章](../../plans/nte-next-guide-draft-2026-11-05.md)先写正式CMS、重读、批准，再新run完成四版本/900秒/公网/source-advance/Genshin共享Main交接及备份刷新，不复用历史releaseKey。
4. N06先补服务端不可变批准与版本绑定，再接正式导出及撤回消费者；具体撤回对象/404、410或重定向需明确批准。当前没有撤回任何文章。

限定V1与原始P/T状态保持；账号关闭、IndexNow暂停、CMS仅本Mac、独立key暂缓及未知云写结果不重试均未改变。
