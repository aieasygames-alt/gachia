# R136：原神配方修复及缺失材料定义候选

日期：2026-11-20。已完成来源绑定的离线候选开发和验证；未改写原始数据、公开镜像、真实 CMS 或线上部署。

直接复用 [R135 交付](../material-source-review-2026-11-20-r135/delivery.json)，校验交付 pin `43b63e74f0a7574ec16faa8168d5f41e115bc9503a3caa9dc0be5293c53f1897`、35 份材料相关来源捕获、115 份发布来源摘要及已保存的 675 个参考文件，未重复全仓/历史审计、未下载数据。参考仍是社区维护的 `theBowja/genshin-db` 固定提交 `8e5badd60b5d894284ccc927a56c9683529d2592`，不能称为官方认证。

正式来源仍为 [R134 索引](../main-material-migration-2026-11-19-r134/published-sources/source-index.json)，pin `401834ddb8412bbf45072d9c2c54e4e1176ea03f9bc2b5950fabe53937c16750`。当前候选绑定 R134 的原神材料/角色与 R135 已修正的关系输入，保留发布 A 的胡桃文本。

## 已交付

开发 [候选生成器](../../services/content-cms/src/genshin-recipe-candidates.ts)、[246 个材料/90 个角色显式映射](../../services/content-cms/reviews/2026-11-20-genshin-recipe-decisions.json)和[回归测试](../../services/content-cms/tests/genshin-recipe-candidates.test.ts)。固定角色与天赋文件的独立数值 ID、中英文材料数值身份、每个成本阶段、数量和原始指针。篡改、过期输入、冲突身份、重复材料、无效数量及错位阶段均拒绝。

- 90 个角色的 1,350 个阶段生成正确成本候选，1,066 个阶段的材料 ID、缺项或数量变化。R135 已识别的 1,034 个差异阶段全部纳入，另 32 个阶段需要改成明确核准的既有材料 ID。该差额不是重复审计或新增 32 个配方数值问题。
- 候选保留现有材料的展示顺序，补入缺项。全部 1,350 个阶段独立按数值 ID/数量重读参考，完全一致；天赋数量按单个天赋记录，未乘三。例：琴 40–50 阶段补齐 2 个飓风之种，并修正蒲公英籽 10、破损的面具 15；胡桃突破总量未熟之玉 46、霓裳花 168，单天赋总摩拉 1,652,500、智识之冕 1。
- 新增 84 个定义候选，含旧配方未引用、正确成本需要的材料。68 个字段齐全，可通过材料结构解析；16 个特产缺少参考稀有度，保持缺字段草案，未强行设为 1 星、未放进材料数组。候选配方仍指向它们，正常依赖门禁据此阻塞。
- 45 个既有定义生成名称、稀有度或混淆来源修正：33 处中文名称、3 处英文名称、22 处稀有度，另 3 个混合徽记记录修正中英来源。既有稳定 ID 均保留。33 个既有特产在参考中同样没有稀有度，保留本地值并标为未核实，不算本批证据确认。

原 6 个命名冲突的处理如下，完整逐条原值/候选/证据见 [held-and-resolutions.json](held-and-resolutions.json)：

| 原关系 ID | 候选处理 |
|---|---|
| `basalt-pillar` | 使用既有 `basalt-petrification`，修正英文名为 Basalt Pillar、稀有度为 4 |
| `famed-handguard` | 使用既有 `famous-handguard`，修正英文名为 Famed Handguard、稀有度为 3 |
| `sealed-scroll` | 使用既有 `concealing-scroll`，修正中文为封魔绘卷、稀有度为 2 |
| `majestic-hooked-beak` | 使用既有 `smaragdistite-jade-branch`，修正中文为蕈王钩喙、稀有度为 4 |
| `treasure-hoarder-insignia` | 单独新增寻宝鸦印；`recruits-insignia` 保留新兵的徽记身份，纠正原混淆中文/来源 |
| `golden-raven-insignia` | 单独新增攫金鸦印；`lieutenants-insignia` 保留尉官的徽记身份，纠正原混淆中文/来源 |

这些处理是显式内容候选，不增加运行时别名。14 个仍无可靠匹配的旧 ID 保留原始角色、阶段、quantity 和指针；候选只依据对应角色/阶段的固定成本替换配方，不据此为旧 ID 凭空指定身份。归环 108 条匿名记录及全部历史 held 证据保持。

## 候选结果及边界

| 指标 | R135 输入 | R136 隔离候选 |
|---|---:|---:|
| 材料定义数 | 185 | 253 |
| 材料引用数 | 5,400 | 5,490 |
| 未定义材料 ID | 53 | 16 |
| 悬空材料引用 | 1,279 | 150 |
| 缺失角色定义 | 2 | 2 |

引用总数增加 90 是按固定成本补齐原配方缺项后的净变化，未以旧条目数作为正确性标准。`mualani`、`ororon` 仍保留原角色 ID，未借其他角色闭合依赖。完整 [candidates.json](candidates.json)、[定义提案](definition-candidates.json)和两份 `raw-*.candidate.json` 均为 held，不能直接当作发布 A 或已审核 CMS 内容。

仅产生原神材料、关系两份隔离覆盖；另外 113 份发布来源的摘要接续自已验证的 R135 保留回执，见 [preservation.json](preservation.json)。胡桃、异环材料文本/Zero/清理、咲里和攻略增量保持。本批没有写入这些原始来源，也没有重新发布异环或 Main。

## 验证

CMS 聚焦回归 **65/65**（含新增 9 项候选完整性/真实成本回归）、CMS TypeScript、90 对 raw 镜像、派生清单、16 scope inventory 及文档/范围检查通过，无跳过。真实 NTE 名称冻结和 Git O/发布 A 保留回归继续通过。自包含压缩夹具保存完整三份输入、674 份 JSON 参考、Git blob、映射及 MIT 许可，不依赖报告缓存即可重放输出 pin。

没有完整 Next/OpenNext 构建、远端 CI、真实 CMS 写入、云调用或生产部署；未推进 source-index。材料依赖门禁拒绝本候选的测试通过，发布资格未放宽。首个 runner 把 35 份有界捕获误当作 115 份全量来源，断言在生成候选前终止；修正为分别验证 35 份内容和已固定的 115 份摘要，失败日志保留。

## 直接接续

使用 [delivery.json](delivery.json)、[summary.json](summary.json)和自包含夹具继续，不重跑全仓审计或本轮配方对比。优先补 16 个新特产的稀有度证据，再处理 `mualani`、`ororon` 完整角色定义；33 个保留的既有特产稀有度另需明确核验。保持 14 个旧身份及归环 held 台账。依赖与事实核清后再对账真实 CMS import O/发布 A，做有界导入、审核、数值/关系/新实体及消费者合同。后续完整构建仍先满足 14 GiB 预算，8 GiB 保留线不变。
