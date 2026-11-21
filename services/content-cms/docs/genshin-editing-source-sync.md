# 原神正式发布后的 CMS 编辑源同步

`genshin-published-editing-sync-v1` 只接续已完成的 R143 正式来源和 `cms-final.json.gz`。安装 CLI 原生重开正式来源历史、完整接受导出及真实生产 deployment；不接收调用方提供的上线成功标记、内容值或审核替代品。它没有 Worker 上传或部署能力。

同步覆盖材料、角色和角色材料关系三个完整集合。390 条既有 CMS 记录保留数据库 ID、创建时间、真实原始导入 `sourceRecord`、原有 hold 和 `_status`；84 个材料和 2 个角色按它们第一次实际导入的 R143 来源创建为 held 草稿。`sara → kujou-sara`、`shinobu → kuki-shinobu` 使用已审核的明确映射，保留原记录 ID，规范化 stableKey 和 legacyId。

`reviewEvidence.publishedBaseline` 单独记录 R143 规范编辑源、正式索引 pin、exportKey、Worker 版本及同步身份。它供普通编辑器验证当前结构和后续三方合并使用，不能替代或覆盖真实导入 O。旧关系的 sourceRecord 仍保留旧身份和原始配方，新的编辑基线使用已发布的规范身份。Hu Tao 已有正式介绍按 R143 A 接续，其原始 O 和审核状态保持。

这个字段由维护事务专用的进程内 Symbol 能力保护；普通管理员、reviewer、editor、REST JSON、`overrideAccess` 或旧版本恢复都不能创建、修改或移除。每次写入绑定精确前态和完整目标投影；普通编辑器继续只允许现有可编辑叶子，不因同步获得任意结构、身份、来源或媒体权限。公开通用导出若使用同步记录，必须提供与编辑基线匹配的原始源或当前正式 A，不能从旧 checkout 原始值推断新实体。

`scripts/genshin-editing-sync.ts apply|verify` 要求有 pin 的 R143 delivery、精确安装应用 manifest/源码提交、仓库位置、审核员与全新输出路径，且必须在桌面维护锁下运行。安装前保留冷备并验证恢复。写入前核对全部 CMS 草稿和 published 读取、原 179 条结构暂存、221 条审核比较及实际接受决定。任何新增 CMS 工作、缺失决定或生产版本变化都停止同步。

独立安装 CLI 的来源读取使用显式 `--repo` Git 根目录，在异步只读范围内定位既有来源合同和历史 Git 对象；执行代码仍来自已校验的安装包。合同绝对路径、pin、历史工作区与 Git 对象检查保持，不修改全局 cwd、环境变量或普通编辑器路径。安装包同时需要仓库级脚本实际导入的 TypeScript、Playwright 和 Zod 依赖闭包。

所有内容写入和一个不可变 `migration-batches` 完成标记处于同一真实事务。后置核对完整集合、真实 O、规范关系、无关内容及总数；后续重复执行只验证完成标记和实际记录，不重复写入。完成后从 R143 正式索引和本次 CMS 写后快照接续；原 R142 导出器绑定的是同步前 CMS，不能重新对当前已同步状态运行旧审核/草稿写入。
