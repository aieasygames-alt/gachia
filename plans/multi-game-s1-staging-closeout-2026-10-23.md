# S1.3 交付：云端前置核验与蓝色星原 staging 验收

> 后续决策：用户已决定暂时下线站点登录。本文保留 S1.3 当时证据；其中“先配置 staging OAuth”的下一步已由 [S1.4 无账号运营交付](multi-game-s1-accounts-disabled-closeout-2026-10-23.md)取代，不再作为当前无账号版本的上线前提。

日期：2026-10-23，Asia/Shanghai。部署源码基线：`67a8a384d00ccda1599d9f3924ca8c0816c2b758`。实施分支：`codex/multi-game-s1-release-safety`。

**结论：完成一次独立蓝色星原 staging 部署、云端版本对账及限定 HTTP/浏览器验收。六个生产服务的承载版本、生产路由均保持不变。没有生产发布；全站仍不具备无条件上线结论。**

用户授权范围为按上一轮建议执行上线前核验和受控 staging。此次不升级套餐、不新增数据库/存储桶、不修改 secrets、不触发 Actions、不 push、不修改生产流量、不执行删除。新建的 staging Worker 使用现有账户付费套餐，功能验证可能计入现有用量，不声称 Cloudflare 费用必为零。

## 1. 账户、容量与预算：修正旧假设

Cloudflare OAuth 可读 Worker 配置、版本与路由；订阅接口返回 403。没有扩大 token 权限，改用用户已登录控制台只读确认：**Workers Paid，页面显示 $5 / month + usage，Current plan**。域名的 Free Website 套餐不代表 Workers Free。

2026-10-23 [官方 Worker size 文档](https://developers.cloudflare.com/workers/platform/limits/#worker-size)明确显示：

- Free 与 Paid 的 Worker 未压缩大小上限均为 **64 MiB**。
- “There is no compressed size limit. Only the uncompressed bundle size counts.”
- `Total Upload` 为未压缩大小，gzip 仅供参考。
- [启动时间限制](https://developers.cloudflare.com/workers/platform/limits/#worker-startup-time)为 1 秒；Paid 的 Worker 数量上限为 500。

因此，S1.2 中的“假设 3 MiB gzip、余量 245.41 KiB”是当时未查证账户条件下的历史情景，**不是现行发布阻断**。上一阶段主站候选未压缩 13,882.49 KiB（约 13.56 MiB）低于现行公开包体上限；但本轮未上传主站候选，不能据此宣称主站启动/CPU/运行已获平台验收。部署分组仍须比较实际成本、启动、故障范围与维护收益，不因上限提高就立即合并 Worker。

GitHub 用量 API 缺少 `user` scope，返回 404；未刷新或扩权。已登录账单界面确认同一账户在本月使用 Actions **413 / 2,000 分钟**、存储 **0.3 / 0.5 GB**，显示 9 天后重置。本轮构建在本地完成，新增 Actions 运行数 **0**；没有把仓库最近成功流水线当成本次提交的 CI 成功证据。

## 2. 部署前只读检查

- 远程 main 为 `18cfe049b4c34d177049def95e645763c2cef0b2`，是当前本地候选的祖先；没有自动合并原主工作区的未提交改动。
- 读取 Main、Router 与四游戏当前部署，均为一个版本承载 100%。对应版本详情 API 均可读，保存为发布前参考；这只是版本存在性核验，不是执行过回滚演练。
- `gachia.com/*` 和 `www.gachia.com/*` 仍指向 `gachia-router`；生产 Router 的五个服务绑定均为生产目标。
- `gachia-game-azur-promilia-staging` 在部署前不存在，Worker settings 查询为 404。本次为首次创建，不覆盖已有 staging 状态。
- 目标配置仅含静态资产与 preview/public-origin 变量，无服务、D1、R2 或正式域名路由。
- 本地 69 项既有发布/运行时测试、五应用运行时门禁、四游戏注册表检查再次通过，部署启动时 Git 工作树干净。

## 3. 实际远程操作与版本

仅执行一次受控命令：

```bash
pnpm --filter @gachia/game-azur-promilia deploy:staging
```

使用 Node 22.22.2、pnpm 10.10.0、Wrangler 4.148.0 和已核实账户 ID；先默认构建、补丁/索引/本地 Worker 检查，再部署。没有使用支持期例外或修改生成 Worker。

| 项目 | 实测 |
|---|---|
| 服务 | `gachia-game-azur-promilia-staging` |
| 预览 origin | `https://gachia-game-azur-promilia-staging.aieasygames.workers.dev` |
| 云端版本 UUID | `440ed712-bdbf-47eb-9f6c-17cca4416a41` |
| 云端 deployment UUID | `bf548185-0862-401a-94de-dedce1d5ea26` |
| 云端版本序号 / 流量 | 1 / 100%（仅这个 staging 服务） |
| 云端创建时间 | 2026-10-23T04:01:11.146949Z |
| 未压缩 / gzip | 5,275.26 / 1,045.25 KiB |
| 平台报告启动时间 | 13 ms |
| 资产上传 | 新上传 23、已有 49；不等于新增 72 份游戏数据 |

部署 CLI 原始记录仍保留 `deployment_command_succeeded_verification_pending`，不事后篡改。独立验收报告将候选源码、CLI 回执、云端版本与 HTTP/浏览器结果关联，状态为限定 staging 通过，而非生产发布成功。

## 4. 云端验收结果

新增 `scripts/game-staging-acceptance.mjs`，仅接受两个已审查试点及显式 workers.dev 账户子域，构造固定 `-staging` origin；不接受任意 URL 或生产 origin，不改变原有本地专用检查的 origin 门禁。

- HTTP **16 项**通过：robots 禁爬，sitemap 的 156 个 URL 仅指向正式域名；中英日首页、角色列表、真实详情均有正文、正式 canonical、HTML noindex 和 X-Robots-Tag；namespaced 与原始 JS/CSS 内容一致；未知路径为 404 且禁止索引。
- Chromium **12 个场景**通过：1440/390 宽度 × 中英日 × 有/无 JS。目录实际卡片读取；有 JS 场景执行筛选、详情客户端导航和返回，无水合错误、无失败 JS/CSS 响应。
- 浏览器 harness 发出 **147 次**允许的同源请求，设置每次运行 1,000 次上限；只允许 GET/HEAD，阻止跨域请求及写请求，不是压力测试。此数字不包含控制台/API、HTTP harness 或人工可视抽查的请求。
- 部署后及浏览器检查结束后复读云端版本：六个生产服务 deployment UUID、版本与百分比未变，staging 仍为本次候选；生产域名路由与自定义域名未变。六条生产公开 GET 抽样的状态和索引元数据与部署前一致。
- 新增 **7 项**验收工具单元测试通过，覆盖 staging origin 限定、参数拒绝、只读请求、禁止重定向、noindex/canonical/资源/404 失败，以及本地代理参数。合并后的 `pnpm test:release` 为 **76 项**。

复现：

```bash
node scripts/game-staging-acceptance.mjs --game azur-promilia --subdomain aieasygames
```

首次 Node 直连 workers.dev 出现连接超时，未获得 HTTP 结果，不能记为站点通过或应用失败。用户现有 Chrome 能正常访问；系统已配置本地 HTTP 代理。没有修改系统 DNS/代理、关闭 TLS 校验或再次部署，使用同一已有代理完成测试：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 STAGING_CHECK_PROXY=http://127.0.0.1:7890 \
  node --use-env-proxy scripts/game-staging-acceptance.mjs \
  --game azur-promilia --subdomain aieasygames
```

该端口仅是本机既有配置，不应复制为其他机器的通用默认值。Node 的 EnvHttpProxyAgent 实验性警告保留；此次结果只证明经该网络出口的访问，不代表全球地区连通性或真实移动设备验收。失败记录和成功记录均保留，不因重跑覆盖失败证据。

## 5. 仍阻止主站/全站放行的事项

1. **主站 staging 缺真实 OAuth 配置。** `gachia-staging` 未配置 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`。生产所需四个 secret 名称存在，但未读取值，也未验证有效性。应先配置 staging 专用 Google OAuth 客户端及匹配回调地址，不能复制生产 secret 来制造通过。本轮未登录真实 Google 账号。
2. **主站候选仍需自己的云端验收。** 本轮仅部署蓝色星原。主站绑定的 staging D1/R2 与生产标识不同，但未读取业务记录、执行迁移或核验数据库 schema，也未验收真实 cookie、可信 IP、Router 转发和跨 Worker 导航。
3. **Router staging 存在既有配置漂移。** 云端 `gachia-router-staging` 的 workers.dev 仍启用，且服务绑定与本地声明不同。本轮刻意直连独立游戏 staging，不借此修改 Router 或宣称其 staging 已验收。
4. **回滚存在性不等于回滚可用性。** 已记录生产当前 UUID，未演练版本回退、旧资产保留或数据兼容；正式发布前须重新读取当前状态，不能长期复用本次 UUID。
5. **验收范围不是全站。** 异环、原神、绿梦新运行时未在云端单独验收；游戏内容时效、全量 SEO、性能预算和主站认证仍有各自工作包。

判断：蓝色星原这一个候选的独立 staging 验收通过，可进入该服务的生产发布前复核；**未授权/未执行生产切流，不能升级为全站上线许可**。

## 6. 证据与后续

机器报告：[S1.3 staging 验证记录](../reports/release-safety/s1-staging-verification-2026-10-23.json)。原始 API 摘要、日志、失败记录、成功记录和桌面/手机截图保存在忽略目录 `.release-records/`，不提交 token、secret、数据库或无关账户资产清单。

新 staging 保留供用户验收，不自动删除。它首次创建、当前为版本 1，没有“此前 staging 版本”可回滚；若以后需要撤销，应单独确认停止访问或删除新服务，而不是动生产。noindex 是索引限制，不是身份认证，该预览地址可公开访问。

下一优先事项：准备主站 staging 专用 OAuth 凭据并核准真实登录测试账号/范围，然后部署主站候选到其独立 staging，补齐认证、可信 IP、跨 Worker 路径和运行指标。没有这些条件前，不把缺口隐藏在一次全站部署中。新验收工具和文档提交本地 Git；本轮不启动下一次云端写入。
