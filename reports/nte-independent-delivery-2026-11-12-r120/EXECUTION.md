# R120 异环单 Worker 真实 CMS 生产交付

完成时间：2026-11-14（Asia/Shanghai）。目标已完成：既有异环角色文本经常驻 CMS 草稿、审核、独立构建、云预览和正式发布，日常内容发布只更新 `gachia-game-nte`。游戏页面、公开 JSON、平台摘要、搜索切片和 Main 聚合通过最终只读验收。完整完成回执为 [delivery.json](delivery.json)，SHA256 `ac47c69ff46e0f491aac1e3f894050dd13b259cbf78ec41403f6f3f98d4d0e3a`。

## 当前正式版本和来源

| 服务 | 最终部署版本 |
| --- | --- |
| `gachia` | `0dc6ca87-5ca0-4287-8c8b-8f5beab281b9` |
| `gachia-staging` | `f142070d-ffb0-4b99-a204-49af0c265baa` |
| `gachia-router` | `00ab8c66-9387-4b12-9c77-c401c2a21e0c` |
| `gachia-game-genshin` | `25f9c75b-4f01-4c73-90e6-b85ca93fad4b` |
| `gachia-game-nte` | `963f4629-9b0f-4992-8373-fcb536508c81` |
| `gachia-game-azur-promilia` | `86353da1-7aa9-40e1-836c-a344eeb4dad0` |
| `gachia-game-lvmeng` | `7e62c798-d454-48d7-8bee-1bce6660550b` |

当前完整来源：[source-index.json](independent-sources-01/source-index.json)，SHA256 `38a0a15fcc02cdc891ccf7339db49183bcb1b5f9e5c9cc45c9032df6bbf4d659`，共 115 份。下一批从此索引继续，不回退 R119/R93，不重放本批已完成日志。来源 reader 使用 `readNteSourceIndex`；旧原神专用 reader 不识别新的 NTE 来源种类。

相对 R119，只有 `packages/data/games/nte/raw-characters.json` 变化。最终验证将娜娜莉 `descriptionEn` 反向替换后比较完整角色数组，确认其余字段不变；胡桃已上线英文简介及 ananta/genshin/hi3/nte/sea 五份攻略增量全部保留。

## 真实 CMS 内容更新

常驻 CMS 记录 1327（娜娜莉 / Nanally），stableKey `unified:nte:7842581fb87c42196a3fae5c96f76f8e3c0d2761449087252a33271ee3e8a26a`。先保存完整 2,880 条记录、验证新鲜数据库/媒体/设置备份，再执行 draft 和审核，最终 `_status=published`、`hold=false`。仅修改 `descriptionEn`，其他 2,879 条 CMS 记录逐项保持不变。

> The star attraction of the Eibon Antique Shop and future head of the Coluccis family, Nanally is cheerful, generous, and kind. She has taken part in numerous major Anomaly containment operations.

编辑及审核后，仅构建 NTE。兼容恢复和候选均通过云端精确版本预览，正式内容部署只改变 NTE，Main、Router、原神、蓝色星原、绿梦及 Main staging 的部署身份保持迁移后基线。证据见 [CMS 阶段](local-editorial-stage-01/complete.json)、[正式发布](independent-result-01.json)、[来源接续](independent-source-result-01.json)、[最终只读证明](final-readonly-01/result.json)。搜索 UI 验证名称、跳转、切片和版本一致，不声称展示角色简介。

## 一次性归属与读取迁移

57 个材料 × zh/en/ja，共 171 个公开详情 URL，归入异环应用。材料列表、详情、FAQ、关联角色、canonical/alternate 和 sitemap 同步接通。NTE Worker 输出 raw JSON、平台摘要、搜索切片及 manifest；Router 维持公开兼容 URL，Main 聚合经 Service Binding 读取当前 NTE 内容。独立来源故障不回退旧副本。Main 仍有历史 NTE 源码分支和共享资源，不宣称 Main 已无任何 NTE 字节。

一次性迁移按 NTE → Router → Main 执行，版本见 [迁移完成态](migration-result-08.json)。迁移和日常内容发布分别记账：Main/Router 变化属于一次性迁移，后续这次 CMS 内容发布只变 NTE。

原第八轮控制面直连读取超时后停止，已知 NTE 部署及 Router 恢复上传严格重开，使用既有本机代理继续。Router 部署后，Main 恢复版曾因旧全局 404 根路径回显不同停止。原封装、SHA 和失败日志保留；限定修复仅接纳固定退休 URL 集合的全局错误路径回显，要求其他字节仍匹配原 SHA，随后重新完成恢复/候选全量云预览。没有重试未知写入、改签历史或把失败预览计为成功。停止证据见 [初段停止](migration-cloud-stop-08.json)和 [Main 停止](migration-main-stop-08.json)。

## 验证与执行环境

生产执行器精确提交 `cc0fdd18638b88d30dd42911055ae56b006b19bd`，完整 CI [43450568989](https://github.com/aieasygames-alt/gachia/actions/runs/43450568989) 全部通过、无跳过。迁移封装源码 `06b3fd34edbfc12b5762fb4c1357a1507b118554` 的完整 CI `43387819810`，首段接续源码 `0b0374db5053f6316602892023de71941194b5ac` 的完整 CI `43432878923` 均在历史链中分别绑定和重验。

本地与正式浏览器均覆盖 390/1280 × zh/en/ja 六场景、材料关联/FAQ、娜娜莉图片、搜索跨 Worker 跳转和无 JavaScript 材料正文；代表截图已人工查看。最终只读核对完整公网合同、七服务版本、不可变模块、精确 CI 和完整来源，证明仅 NTE 部署变化。证据见 [本地浏览器](browser-independent-local-01-01/result.json)和 [正式浏览器](browser-production-01-01/result.json)。

公众构建固定 Node 22.23.4；历史模块和生产执行使用原回执绑定的 Node 25.9.0。构建预算维持 14 GiB / 8 GiB 保留线；旧准备的可恢复归档及压缩证据保留。仅使用既有维护 worktree，没有新建 worktree、Worker、数据库或线程。Documents 下的旧且有修改 checkout 未用于本批发布。

本批证明既有异环角色文本的单 Worker 正式更新闭环；恢复能力已通过兼容恢复云预览，本批未实际执行生产回滚。其他内容类型、数值/枚举/关联、内联内容、媒体替换及新增/撤回仍须逐类资格验证。

下一顺序：蓝色星原 → 绿梦中文 → 按内容类型扩展所有游戏 → 页面内联内容 → 新增、撤回和媒体替换。项目底图见 [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)。
