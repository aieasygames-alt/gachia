# R42 社区内容发布推进

日期：2026-11-05。维护目录：`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`。继承提交 `c120316e8e7f2173e279d768e4f8d67ac9048c79`；本轮修改仍是工作区代码，不是新提交、CI 或已安装版本。R40/R41 历史证据未改。

## 结论与政策

用户明确取消公开内容来源认证前置。`community-editorial-v1` 不要求资料权威性审批、原始公开内容认证或远端来源证明。当前公开 JSON 只作为防覆盖的 A 基线；不能借认证名义重新阻塞。仍保留当前内容防覆盖、构建正确性、权限、旧资源兼容、故障恢复与受控流量切换。

已完成普通公开基线读取、统一候选五目标真实构建、本地 Worker 正文验收及独立封存产物重读。**尚未完成统一合同的正式发布与常驻接管。** 测试产物明确 `preview:true`，不允许发布测试标记；常驻 CMS 与网站未被本轮改写。

## 真实运行

- [公开基线](public-baseline/manifest.json)：正常 HTTPS GET 90 个注册公开 JSON；加上明确选定的代码内容和派生摘要，完整覆盖 115 来源。无云端凭据、无来源认证要求。`activePin=771e4008b0b3bba170d69503e9bbf60b1ee47d39d94671d25fc3d903324ecd65`。
- [隔离导入](owner-smoke-03/import.json)：真实 Payload 导入 2,795 个 held 草稿；通过 editor/reviewer 权限修改并审核五个记录，再重读 published 版本。随机独立 SQLite 已删除，未连接常驻 CMS。
- [冻结结果](owner-smoke-03/frozen.json)：115 来源的完整 A 与本批 B 一起投影，生成镜像、摘要、搜索和客户端数据。保留原神公开的第 32 篇 `cms-returning-player-checklist`，异环 53 篇也保留。
- [构建状态](owner-smoke-03/frozen/build-state.json)：蓝色星原、原神、绿梦、异环、Main 五目标全部构建并通过本地 Worker 验收，共 451 个响应。四个独立目标各 3 个；Main 439 个，其中公开 JSON 435 个逐字节核对。
- [产物重读](owner-reverify.log)：独立命令重读固定源码、全部目标产物、HTTP 响应头/正文与编辑值断言通过。`buildPin=9898538f9d6235835dac6c49dd07740f0e065fdfb16208a3b751d69debb45a23`，`frozenPin=4b2b3ea8af216f6a4ba5f2d07bc093269d39b6c436977194a3ce1f7c8211b600`。

实际正文验收路由：

| Owner | CMS 修改 | 本地验收路由 |
| --- | --- | --- |
| azur-promilia | raw 角色名称 | `/zh/azur-promilia/characters/abby` |
| genshin | raw 角色名称 | `/zh/genshin/characters/hu-tao` |
| lvmeng | `game.launchDate` 字面量 | `/zh/lvmeng/version` |
| nte | raw 角色名称 | `/zh/nte/characters/nanally` |
| main | HI3 raw 角色名称 | `/zh/hi3/characters/fenghuang-of-vicissitude` |

每个修改值必须出现在 HTML `main` 正文中，而不仅是 metadata。所有目标检查 sitemap/robots、正确 MIME 与无 cookie；Main 还检查账号 API 仍为 `404 ACCOUNT_FEATURES_DISABLED`。这证明五种代表性消费路径，不是 16 scope 所有内容类型和所有页面均已验收。

## 发现并关闭的缺口

1. [第一次失败](owner-smoke-01.log)：蓝色星原 raw 名称没有进入角色页。补上精确固定代码的 raw 名称适配器，核对完整已有角色集合，不执行来源代码、不替换技能/档案；第三次已用原始角色页正文验证修复。只在该 raw 来源进入候选时生成适配器，不扩张未编辑批次的 owner 范围。
2. [第二次失败](owner-smoke-02.log)：四独立目标通过，Main 首个页面因 `NEXT_LOCALE` 被拒绝。独立诊断确认无 Accept-Language 时国际化中间件设置语言 cookie；请求语言与路由一致时无 cookie。验收显式指定页面语言，保留禁止 cookie 的检查，第三次通过。
3. 绿梦本地执行配置须合并 production 环境 vars，不能误用默认 preview vars。异环保持 live 模式。
4. 独立重读校验拒绝缺失 owner、部分/失败状态、错误 pin、被改正文或产物；失败运行不自动覆盖重试。

## 回归

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| CMS 完整回归 | 243/243 | [cms-tests-delivery.log](cms-tests-delivery.log) |
| TypeScript | 通过 | [typecheck-delivery.log](typecheck-delivery.log) |
| CMS Next 构建 | 通过 | [cms-build.log](cms-build.log) |
| 隔离 PostgreSQL / 真实 HTTP | 15 组通过，服务和临时凭据已移除 | [postgres-smoke.json](postgres/postgres-smoke.json) |
| 数据包回归 | 14 文件、168 项通过 | [data-tests.log](data-tests.log) |
| 文档 / 只读 CI 分类 | 38/38 | [documentation.log](documentation.log) |
| 现行 inventory | 16 scope 通过 | [inventory.log](inventory.log) |
| 构建证据故障测试 | 9/9 | [build-evidence-tests.log](build-evidence-tests.log) |

`git diff --check` 通过。常驻 `http://127.0.0.1:3100/health` 最终只读检查返回 `ready`，本轮没有对其运行迁移、导入或内容更新。

## 空间与下一步

前两次运行只删除本轮离线依赖和 `.next`/`.open-next` 等可重建中间目录，源码、产物与失败诊断保留；成功运行同样删除自己的依赖与中间文件，保留完整源码和封存产物。见 [intermediate-cleanup.log](intermediate-cleanup.log) 与 [final-cleanup.log](final-cleanup.log)。未删除历史发布、恢复包、备份或任何游戏内容；此前批准删除的 HI3 工作台没有重建。

清理后整卷约 31 GiB 可用，本轮证据目录约 1.1 GiB，主要是保留的源码和封存产物。[清理后独立重读](owner-reverify-after-cleanup.log) 再次通过，删除的依赖/中间文件不属于封存来源或产物；没有用删证据来掩盖失败。

当前主线是把统一合同接入已有多 owner 旧资源保留、兼容恢复、精确版本预览、受控推广和 partial 对账，再做常驻冷备/增量迁移/held 导入。现有双游戏发布器仍只接受原合同。完整业务/引用规则、页面内联事实、实体新增/撤回/结构扩展和媒体仍未全覆盖。不再列公开来源认证待办，也不把 `published`、本地源码生成或本地构建回执冒称公网正式可用。
