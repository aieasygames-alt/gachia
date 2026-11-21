# R145 本机 CMS Next.js 安全升级完成回执

本机常驻 CMS 已由 Next.js **16.4.2 升级至 16.4.6**，精确源码 `db547bec533314a22f58aa6dbbe9f5651a820905`，Payload 3.92.1 / React 19.2.6 保持。新应用已标准构建、封存安装并通过实际恢复演练。本批只修改 CMS 的独立 package/锁文件及交付工具；公开站依赖、定制 patch 和生产内容均保持。

## 安全与依赖范围

- 官方 npm registry 确认 16.4.6 满足当前 Payload 明确的 Next peer 范围；精确包 integrity 保存在 `security-assessment.json`。
- 目标 Next 及完整 CMS 锁文件 359 个包名的 bulk advisory 查询均返回空结果；这表示查询时未报告已知漏洞。
- 仅 Next、`@next/env`、SWC 及对应 peer 引用改变，其他包版本与 integrity 保持。独立 overrides 保持，公开站根锁文件未改。
- 新版标准构建成功，旧版安全提醒消失；既有 legacy-intake 动态文件追踪提示保留，完整日志可查。

## 安装、功能与恢复

- 新安装：`/Users/robert/Library/Application Support/GachiaCMS/releases/20261121T110820Z-cms-next-security-r145-db547bec/services/content-cms`；应用清单 pin `f699e5f49c25b8f3022d65d7d43e65c4731e035fc6d77e6c9c35a2362febff8a`。完整依赖 43,788 项文件/链接和应用文件核对通过，旧安装完整保留。
- 冷备：`/Users/robert/Library/Application Support/GachiaCMS/backups/20261121T111246Z-87eb85`。实际恢复到隔离 PostgreSQL 并提取媒体，完整数据/媒体核对通过。
- 实际切换顺序：新版 → 旧安装 → 新版；每次均健康，最终运行 16.4.6。没有在常驻数据库运行 schema 迁移。
- 本地完整 CMS **623/623**，0 失败/跳过；完整类型检查通过；标准 Next 构建通过。
- 隔离 PostgreSQL + 构建后 HTTP **15 组**通过，覆盖登录/ACL、草稿编辑、独立发布状态、版本/锁、媒体私有访问、撤回、导出、注销和故障健康检查。
- 常驻登录 HTML 和 15 个静态资源均为 200，3 类匿名内容读取为 403，noindex/nofollow 和隐藏框架头保持；只读验收没有修改真实内容。

## 内容、来源与生产保持

- 常驻 CMS **2,966 条**：升级前后 draft/published 稳定双读与 R144 完全一致，含全部时间戳。
- **43 张表、数据库序列和媒体完整指纹保持**；用户、会话、审核、hold、版本与原始来源均保持。
- 新封存安装的真实来源读者和同步只读验证通过；R143 正式源仍可接续，`allOwnersCurrent=true`。476 条已同步原神编辑源没有再次导入。
- 六个生产服务 deployment/version 均与 R144 一致。**0 内容写入、0 审核写入、0 schema 迁移、0 Worker 上传、0 正式部署。**
- 首次控制面只读验证遇到过期 OAuth（401，原凭据到期 10:12 UTC），保留原日志和诊断；通过项目固定 Wrangler 4.148.0 `whoami --json` 刷新现有登录后，六服务读取和安装版完整只读验证成功。未修改云端资源。官方命令文档读取返回 403，命令以本机安装版 help 校验。
- 实现提交[完整 CI 44897652258](https://github.com/aieasygames-alt/gachia/actions/runs/44897652258)成功。收尾仅回执/队列/只读交付工具，不要求重新安装应用或重复内容发布。

## 下一批入口

继续使用 [R143 正式来源](../genshin-collection-production-2026-11-21-r143/published-sources/source-index.json)，pin `6598ff503df109ca57e0df4928ed99a9084f0e7d366401e39e9c2fe06117db57`；CMS 继续使用 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin `b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20`，本批只是增加相同内容的新版应用观测。

下一优先级是公开站 Next.js 15.5.28 安全补丁。已只读确认官方 **15.5.29** 存在且公告查询为空；保留现有 deferred-initial patch/OpenNext，在独立一批完成受影响 owner 构建、消费者、兼容恢复与受控发布。不得把本机 CMS 升级等同于公开 Worker 已升级。

不重放 R140 草稿、R141 暂存、R142 决定、R143 部署或 R144 编辑源同步；胡桃、异环、Zero 清理和攻略增量保持，绿梦继续中文范围。最后可用空间约 **21.80 GiB**；完整游戏构建继续遵守 14 GiB 标准预算和 8 GiB 保留线。

完整校验和接续合同见 [delivery.json](delivery.json)，安装/恢复/功能、安全公告和首次失败记录均在本目录保留。
