# CMS 编辑端首发

> 2026-11-01 最新决定：部署到本机，不购买 Linux 主机、不配置远程后台。已安装的日常入口和命令见 [本机部署说明](desktop.md)。本文以下保留为将来需要远程编辑时的 Linux/HTTPS 备选模板，不是当前待执行步骤。

## 首发范围

本阶段上线 Payload 编辑后台，不切换公众网站的数据权威。内容原样保留；事实准确度、标签统一、翻译完整度、全类型内容清洗均进入上线后 backlog，不再阻断后台上线。已发布的编辑记录仍是私有数据，不会自动激活网站。

选择：独立 Node 服务 + PostgreSQL 17 + 单实例私有媒体持久卷。暂不做 Worker/D1 适配、多实例、全站迁移或媒体公开发布。原站点继续服务，后台故障不影响原站点。首次后台可从空库开始编辑，不必等待全量导入。

## 已提供但未在目标主机运行

- `Dockerfile`、`deploy/compose.yaml`：非 root 应用进程，数据库无宿主端口，应用仅绑定宿主 loopback；PostgreSQL 应用账号不是超级用户。
- `editor:migrate`：版本化初始 PostgreSQL migration；运行时不做 schema push，不自动创建数据库。
- `editor:admin`：离线 CLI 初始化；并发事务锁、非空用户库拒绝；HTTP first-register 始终关闭。
- `/health`：检查实际数据库表；失败返回不泄露细节的 503。
- HTTPS origin、Secure/HttpOnly/SameSite cookie、登录锁定、私有媒体、10 MiB 上传上限、noindex；影子 fixture 路由在 editor 模式关闭。

Compose/Docker 是待目标机验收的模板，不是已上线证明。当前开发机没有 Docker；真实 PostgreSQL + 已构建 Next 服务的本机验证与 Linux 镜像验证是两件事。

## 目标机执行顺序

前提：有持久磁盘的 Linux 主机、Docker Compose、CMS HTTPS 域名和证书、仅团队可访问的网关或 VPN、独立备份位置。镜像构建前确认 Node 24 满足 package.json engines，并将已验证镜像固定为 digest。不得复用公众网站数据库或指向现有迁移实验库。

在 `services/content-cms` 下操作：

```sh
cp .env.editor.example .env.editor
chmod 600 .env.editor
# 在私有文件中设置真实 HTTPS origin，以及三个分别生成的随机密钥。
# 每个密钥分别执行 openssl rand -hex 32；不要复用。
dc() { docker compose --env-file .env.editor -f deploy/compose.yaml "$@"; }
dc config --quiet
dc build cms
dc up -d postgres
dc run --rm cms pnpm editor:migrate
# 通过安全交互/密钥管理器设置并 export CMS_ADMIN_EMAIL、CMS_ADMIN_PASSWORD。
# 密码至少 16 字符；不要将实际密码写进命令历史或 compose 文件。
dc run --rm -e CMS_ADMIN_EMAIL -e CMS_ADMIN_PASSWORD cms pnpm editor:admin
unset CMS_ADMIN_EMAIL CMS_ADMIN_PASSWORD
dc up -d cms
curl --fail http://127.0.0.1:3100/health
```

反向代理只转发到 `127.0.0.1:3100`，终止 TLS，保留 Host 与 `X-Forwarded-Proto: https`。在网关限制登录请求频率、请求体大小（例如 12 MiB）和团队访问范围。不要把 3100 或 PostgreSQL 端口暴露公网。云 PostgreSQL 应使用 `CMS_DATABASE_TLS=require`；模板的 disable 只用于同主机私有 Compose 网络。

首次启动脚本只在空 PostgreSQL volume 上创建非超级用户；不能通过反复改环境变量给旧库改密码。升级须先备份，在停止编辑写入的维护窗口执行 migration，然后启动新版本。不要运行 `migrate:fresh/reset`、`PAYLOAD_DROP_DATABASE` 或 `docker compose down -v`。

## 首发验收：只看可操作性，不检查事实准确度

1. 目标主机镜像成功构建，迁移可重复执行；健康端点 ready。
2. 经真实 HTTPS 登录，cookie 带 Secure/HttpOnly；开放注册和匿名内容/媒体读取失败。
3. 创建 editor/reviewer 账号，编辑一条现有文案的副本并保存，验证角色权限与版本恢复；不要求纠正文案。
4. 上传自有测试图，重启容器后内容和图片仍在；不把未经批准的第三方媒体转成公开资源。
5. 完成一次 PostgreSQL + 媒体联合备份并恢复到独立环境，验证登录、记录、版本、媒体字节。随后才开放团队正式编辑。
6. 删除/停用临时测试账号与测试内容，确认告警与备份责任人。原网站仍不切流。

## 备份与回退

首发采用短维护窗口，停止 CMS 写入，数据库使用 `pg_dump -Fc`，媒体卷完整归档；二者和应用版本、migration 版本、文件摘要一起保存到主机以外的受控备份位置。不要只备份容器文件层，也不要只备份数据库而漏掉媒体。备份含账号哈希和私有内容，必须限制权限并加密。

在全新隔离数据库和媒体卷上使用 `pg_restore --exit-on-error` 恢复并验收，不能把“命令成功”当成恢复完成。当前本地 PostgreSQL 包没有 pg_dump/pg_restore；目标机 Compose 的 PostgreSQL 镜像提供这些工具，完整恢复演练尚未执行。备份频率与保留期随编辑频率设置，首次至少每日备份并定期抽查恢复。

应用失败可停止 CMS 并保留全部卷，公众网站不受影响；数据库 schema 不兼容时不能仅降级应用镜像，应在独立环境恢复匹配版本备份。禁止自动逆迁移删表。

邮件暂未接入，不提供自助忘记密码。首发需至少两名具名管理员，由另一管理员在后台重置账号；全部管理员失联时由持有目标环境权限的运维执行受控恢复，不能重新开放 first-register。正式开放前确认管理员恢复流程与负责人。

## 本地复验

```sh
pnpm typecheck
pnpm test
# 先执行受隔离环境保护的 pnpm build，再运行：
pnpm test:postgres
```

PostgreSQL smoke 自建临时 loopback 集群，使用无超级权限的应用角色，拒绝外部连接配置；完成后删除临时状态。依赖的 embedded-postgres 仅用于开发验证，不是生产数据库。
