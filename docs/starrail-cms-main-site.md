# 星铁 CMS 与主站发布

本批接入中文版本状态、跃迁窗口、活动奖励三条内容。Payload 编辑端在本机 `http://127.0.0.1:4320/admin`，主站通过已有 D1 保存并读取独立的已发布副本；公众请求不访问站长的 Mac。

## 日常更新

1. 启动本机 Payload，进入「游戏更新」，编辑对应条目。首次使用创建自己的管理员。
2. 保存草稿用于核对；准备公开时点击 Publish。草稿不会进入公开导出。
3. 在 `tools/payload-cms` 执行 `npm run publish:starrail`。使用 Node 24.22.3；没有对应系统 Node 时执行 `npx --yes --package=node@24.22.3 -- npm run publish:starrail`。
4. 命令返回 `ok: true` 和新 `revision` 后，刷新 `https://gachia.com/zh/starrail/version`。这一步无需构建或部署 Worker。

后台 Publish 与同步主站是两个步骤。**本批没有添加后台自动云发布 hook。** 同步命令从匿名可读的 Payload 正式视图导出全体记录，验证后一次性替换云端副本，并从公开接口读回 revision。失败时会报错，修复连接后重新执行；不把本机保存成功当作公网更新成功。

取消发布或删除记录后同样执行同步命令。完整空列表代表主动撤回，页面不会因此恢复内置旧快照。英文和日文按语言隔离，首批没有翻译内容。所有条目保留各自来源核验日期，不因同步刷新核验日。

`.env` 内的 `STARRAIL_PUBLISH_ORIGIN` 与 `STARRAIL_PUBLISH_TOKEN` 已由本次部署配置；不要把 token 写入 Git 或聊天。它只授权替换星铁发布副本，不授权其他游戏、账号、Worker 部署或后台登录。发布工具标识为 `GachiaCMS/1.0`。需要本机 HTTPS 代理时可设置 `HTTPS_PROXY`、`NO_PROXY=127.0.0.1,localhost` 与 `NODE_USE_ENV_PROXY=1`；不要关闭 TLS 验证。

## 边界与恢复

- D1 新增 `cms_starrail_publication` 单行表，不改变已有账号表和其他内容表。每次写入是带 revision 条件的原子替换；旧批次不会覆盖较新批次，同 revision 的相同内容可安全读回。
- 公共 `GET /api/cms/starrail?locale=zh` 仅返回正式字段，`PUT` 需要专用 Worker secret。请求体有 512 KiB 上限，拒绝草稿、其他游戏、重复身份和不完整导出。
- 页面请求时读取 D1，无内容缓存；存储不可用才使用明确标记的内置快照。Mac 关机不影响云端已经发布的内容。
- 恢复文字：在 Payload 恢复目标历史版本并发布，再运行同步命令。代码回退与内容回退独立；代码回退不会自动回退 D1 内容。
- 首批不含角色、光锥、遗器、兑换码或攻略正文的迁移。已有 `3100` 常驻 CMS 与其历史发布器继续单独维护，本批 `4320` 编辑端没有合并其数据库。

## 主站代码维护

接入源码位于 `codex/starrail-cms-release`，基于当前正式 Main 的 `721d159` 实现，并保留 R153 已发布的 115 份内容来源。生产构建采用 Next 15.5.29 / OpenNext 1.20.13 / Wrangler 4.148.0；独立 Payload 依赖不进入主站运行时。

本批发布回执位于 `reports/starrail-cms-deployment-2026-11-25/`，记录原 Main UUID、候选/兼容恢复模块摘要、旧新静态资源并集、staging 与正式验收。以后重建 Main 必须从这一接入源码或包含其提交的后续版本构建，保留新 API、D1 读取器、专用 secret 和原有 Genshin/NTE bindings。不能直接从旧的 `Documents/gachia` HEAD 或旧 Main 发布器源码重建，否则会移除本批接入。

原 R153 来源索引仍保留原样，只描述其原有 Main UUID；它不是本批 Main 的当前来源证明。旧 CMS 的 Main 发布流程遇到 UUID 漂移应停止，在接入本批源码及正式回执后再进行来源交接；不得把旧索引里的 UUID 手工改成新版本。本批的日常星铁同步不经过旧 Main 构建发布器。
