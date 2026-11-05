# R39 本机安装与首篇新增指南发布

日期：2026-11-05。接续[R38](../payload-new-guides-2026-11-05-r38/README.md)，按最短路径推进安装、真实CMS新增、双owner发布与备份刷新。**本轮完成精确代码安装、首篇真实原神中文新增正常上线、NTE共享Main来源交接及新异地包下载认证/隔离恢复。** 最终Git/CI与本机封存身份见delivery；不把正常上线或四版本恢复预览冒称新增场景真实partial/实际回滚已验。

## 1. 已完成的安装与真实内容入库

- 从精确源码`0b60f56729eedc58da53c2e6e5273259ee1adbc8`创建独立安装目录；该提交R38验证型CI成功。依赖从既有应用APFS独立克隆，不使用hardlink或指向临时worktree的运行依赖。
- 新应用在自身目录重新production build，使用独立Homebrew PostgreSQL17.11及临时端口执行6组真实REST检查，含新增/唯一性/身份/错误game拒绝、editor与reviewer资格、锁/恢复/多语言草稿及注销。临时服务停止、临时数据清除；没有迁移在线schema。
- 先冷备，再有界切换CMS、manager和完整publisher依赖。新应用685个清单文件、29个工具文件验摘要；旧应用/配置/工具保留，可回退。685不是直接沿用旧698计数：本轮不复制`.next/dev`，且构建chunk/BUILD_ID变化；对比确认没有删除运行源码。9项匿名/Host/Origin/跨站/私有媒体HTTP通过，安装时DB摘要不变。
- 代理原创选题“原神回坑整理清单：先确认进度，再安排养成与探索”，身份`cms-returning-player-checklist`。新冷备后，通过已认证loopback普通API创建中文draft/hold，重读后锁定并明确批准，其他84条正式/草稿记录均未改。不使用SQL、overrideAccess或手改公开JSON；不增加媒体、翻译或版本/奖励数值断言。
- CMS现85内容/1用户/1媒体，其中82draft/hold、原神2条及NTE1条published/eligible。该新记录随后已完成完整公网发布；后续任何CMS批准仍不能单独视为网站已更新。

## 2. 发布与验收

真实文章为[原神回坑整理清单](https://gachia.com/zh/genshin/guides/cms-returning-player-checklist)，releaseKey `e74ef566372fba6e0981ae0441bec163c77bb350ac4a9cc17eb354c520aa1fc0`，新run `e74ef566372fba6e-ae73eea04d36`。从CMS正式版本完整导出，不发布R38fixture，不手改公开JSON。A→B精确差异只有新增本篇，31篇既有原神公开文章逐记录保持；NTE JSON SHA保持`76536e016c40e9432f396157bec037c0654936738b75cff8807b2d351e3389a6`。

新Genshin/Main实际loopback候选共28响应通过；当前公开A冻结、保留资源与旧版兼容恢复采样通过。候选和恢复各两版本上传后，实际云预览/恢复404-noindex/metadata/JSON-LD/sitemap/媒体/静态/cache与身份检查通过，再执行四版本新鲜续验和900秒门禁。正式推广用时268.49秒，2次成功部署POST；共4次版本上传、0恢复部署/云写重试，失败/诊断不覆盖。

- 原神生产UUID：`8c75bec6-f269-4684-9601-5cf9ca441fce`。
- Main生产UUID：`c2615493-d3da-4598-b488-1583cc734311`。
- 正式公网验收`production_accepted`，source-advance成功；额外5份公网样本保存body/headers/SHA，中文新正文与两游戏精确JSON均通过。
- 10Worker/7服务拓扑复核、NTE原game UUID不变；NTE原始游戏来源与新Main显式重绑定，再次source-select成功。Router/staging及其他服务保持，没有账户级仅本机发布强制或普通请求全链releaseKey声明。

空英日译文继续按原神既有回退/noindex/sitemap排除策略处理；不为上线补齐译文，不启用NTE新增。**新增场景真实partial故障/实际回滚尚未演练**，完整G4不冒称关闭，也不主动制造线上故障凑验收。原始全请求releaseKey、原子ReleaseMap、全类型迁移及完整P/T范围不在本轮关闭。

## 3. 数据保护与边界

发布/来源交接后新冷备`20261105T031643Z-779627`，最新私有R2密文52,220,684字节；85记录/29工具/安装来源清单/源码锁测试和本机导出状态均进入包。本轮两个不同对象各PUT一次，无上传重试。首包AES认证通过但旧SQL-dump摘要受物理行序影响拒绝；完整诊断保留在`restore-diagnostic.json`，没有数据丢失。新增版本化canonical摘要，7项Python回归/全部发布工具测试及真实PG内容/列/序列拒绝验证通过；精确CI后仅更换root manager（保留旧版），没有重建应用或重部署Worker。第二新包新鲜下载、AES认证、48归档成员/2678源码及隔离PG/媒体恢复通过；在线DB不替换，完整原摘要保持`5a40df192c55974a193d02cfc9de1aa4be064c9928372b07a2cf14ad90f8624c`。最新源码快照为`e1f2e54f13384edad44f55f1f611fe4bf5a70852`，应用/publisher仍为0b60f56，不含后续文档提交、应用依赖/build或历史release完整链，不能续跑旧journal。新key仅同机，旧对象/旧key不改。

仅此Mac运行CMS，公开站点由Cloudflare多Worker继续服务；不开放Mac公网回源、不加Tunnel，不改Router/staging或玩家账户。独立key继续用户暂缓，不外传key或要求第二Mac。依赖low接受与11-16复核截止沿用R37，不把本轮构建冒充新依赖audit或风险修复。

## 4. 证据入口

- `staged-app.json`、`staged-build.log`、`staged-runtime.json`、`staged-publisher-probe.json`、`application-manifest-delta.json`：精确安装包/HTTP/源码与构建范围。
- `local-before.json`、`installation.json`、`local-after-cms.json`及私有operations路径：安装前后与真实CMS新增，报告不含凭证或session token。
- `initial-cloud*.log`、`initial-topology-check.json`、`initial-cloud-result.json`：云拓扑和来源读取。首个只读脚本引用了不存在的R37文件名，原失败保留；第二次改用R36封存最终拓扑，非云写重试。新run仍独立重新选择/验证来源。
- `genshin/`：正式导出、新run/构建、A→B差异、四版本预览、推广、公网、source-advance与NTE共享Main交接。
- `prior-sealed-reports.json`：R29–R38共4967份历史封存文件逐字节保持。
- 最终安装/数据/云/异地包、Git/CI身份及证据索引由`delivery.json`和`evidence-index.json`封存；Git只提交本README与必要现行文档，不提交原始证据、DB、凭证或制品。

## 5. 状态与下一工程

G1–G3保持完成；G4安装/正常真实新增/来源接续与共享Main交接子项关闭，新增真实partial/实际回滚仍未演练。既有V1/C01/C02/C03/C04/C05a保持关闭，C05b暂缓；完整P/T等级不提升。下一工程为NTE缺译文读取/noindex/sitemap及中文新增切片，不重复已上线原神正常新增，不把准确度/翻译/第二Mac或独立key重新加入门槛。

备份修复与精确CI/安装见`restore-fix/`，最新已验对象/下载认证/恢复见`backup-verified/`。首次隔离回归脚本曾误用不存在的非本地化title列，仅临时库失败并正确清除；修正为source_record后真实回归通过，原日志保留。封存明确区分应用/publisher的0b60f56、root manager修复提交与最终文档提交。
