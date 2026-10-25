# 原神 Live Owner 发布契约

更新：2026-10-25，S2.21。本文是发布操作契约，不是已上线声明；实际云端结果以阶段交付记录为准。

## 1. 边界

- 原神已经全量由 `gachia-game-genshin` 承接，不能使用旧的 pre-cutover 工作流。
- 复用已存在的 `gachia-game-genshin-staging`，不创建、合并 Worker，不修改 Router 开关、域名、路由或其他 owner。
- 不恢复登录、不引入数据库或存储绑定，不清缓存，不删除旧构建、浏览器清单或发布证据。
- Main、异环、绿梦、蓝色星原的发布进度分别记账；原神成功不表示其他候选版本已经上线。

## 2. 旧版本来源与兼容性

每次发布必须重新读取生产 deployment / version / script etag。只接受单版本 100% 流量，不能把本地历史构建当成云端旧版本。

旧资源回执需绑定实际版本、部署 UUID、脚本 etag、权威 Worker multipart、历史 Wrangler 日志摘要、静态文件清单及各文件大小和 SHA-256。采集前后版本必须一致。仅保留日志列出的 JS/CSS/font；不复制旧 HTML、数据、BUILD_ID 或 Worker 到新运行时。

`retain-game-assets.mjs` 已允许原神与蓝色星原的独立回执。两者不能混用；异环和绿梦仍不在这个来源回执许可范围。所有旧静态资源需要在原始和 `/_games/genshin` 命名空间逐字节验证，冲突不能覆盖当前文件。

这仍是操作者保存的证据，不是远程签名证明。旧源码提交记为 `not_attested`，Cloudflare 资产清单完整性记为 `not_asserted`。不能因为捕获脚本与静态资源成功就擅自升级这些声明。

材料清单继续使用 `gachia-genshin-material-watchlist-v1`。旧数组、未知 ID、无效 JSON、错误顶层类型、重复值、浏览器存储拒绝或配额不足均需验收。未知字符串 ID 保留，避免临时下架的数据导致用户清单永久丢失。

## 3. 单次构建、完整封存

在干净的已提交工作树中执行，先完成本地测试和内容放行：

```sh
pnpm test:release
pnpm --filter @gachia/game-genshin type-check
pnpm validate:game-deployments
pnpm content:release-ready
pnpm release:genshin:artifact build \
  --directory .release-records/<phase>/genshin-artifact \
  --previous-assets-receipt .release-records/<phase>/previous-assets-receipt.json \
  --rollback-version <observed-production-version-UUID>
```

此入口只做本地构建、旧资源保留、运行时检查、Wrangler dry-run、真实本地 Worker HTTP 验证和封存，不写入 Cloudflare。共享 `genshin.lock` 存在时拒绝并发；不能自动删除旧锁来绕过检查。

封存目录包括完整 `.open-next`、两个明确目标配置和候选 XML。manifest 记录源码 commit、源配置摘要、旧资源回执摘要、完整文件/目录/内部相对符号链接清单、每文件摘要以及树摘要。外部链接、悬空链接、额外文件、空目录新增、配置漂移和字节变化均拒绝。manifest 本身的 SHA-256 必须在目录外单独保存，不能临时读取一个可变 manifest 并把它自己的摘要当作可信输入。

```sh
pnpm release:genshin:artifact verify \
  --directory .release-records/<phase>/genshin-artifact \
  --previous-assets-receipt .release-records/<phase>/previous-assets-receipt.json \
  --rollback-version <observed-production-version-UUID> \
  --sha256 <externally-recorded-manifest-SHA-256> \
  --commit <source-commit>
```

该校验只证明本地完整性，不等于云端部署、浏览器功能验收或独立审批。

## 4. staging 与生产的不同点

两份封存配置除服务名外完全相同，均使用生产构建和生产模式。不得在 staging 验收后重新构建，再把新构建称为同产物推广。

`workers.dev` 域名由运行时 middleware 强制 `X-Robots-Tag: noindex, nofollow`，`robots.txt` 返回通配禁止。页面 canonical 与 XML 仍只指向 `https://gachia.com`，HTML 内的生产语言索引策略保持不变。HTTP 响应头是预览防索引的强制层；不能要求所有生产 HTML 被重新构建成预览 noindex，也不能移除缺译页面自己的 noindex。

生产公共域名不能带全局 noindex。正式与 staging 直接 Worker 域名都禁止索引；其他相似主机名不能通过字符串包含判断误命中。

## 5. 推广前后验收清单

1. 读取所有生产 owner、既有 staging、Router bindings、zone routes 和自定义域名。确认只有被批准的服务允许变化，原神已全量承接的 Router 状态不变。
2. 在封存副本启动本地 Worker，而不依赖 app 中仍可变的构建目录。检查生产模式和模拟 Worker Host 的运行时防索引，再运行浏览器交互与旧存储兼容用例。
3. 复用现有 staging；部署前后复核外部 pin、源码与回执。命令失败或结果不明时先读取 deployment，不直接重试。
4. staging 校验全量候选 XML URL、canonical、标题、robots、hreflang、结构化数据、缺译回退、现有与旧静态资源；三语言、桌面/手机、正常/延迟脚本/无 JS 场景检查材料清单。所有 JS/CSS 的网络失败都必须留存原因，不能只看 HTTP 4xx/5xx。
5. 生产推广前再次读取当前生产 UUID、回滚版本可读性和 staging 当前 UUID。只有同一封存产物及 staging 验收通过才允许推广；不修改 Router、不运行旧 origin/canary/cutover 工作流。
6. 生产重新验证公共域名实际 owner、所有本批变化及严格全站 XML 图，其他 owner 与全站关键页面做回归。对比前后版本、bindings、routes 和 domains，不把 CLI 成功当成已验收。
7. 保存版本 UUID、deployment UUID、源 commit、artifact pin、实际验收范围、失败记录和限制。保留可读的旧版本不等于已经执行在线回滚演练，也不保证平台永久保留旧资产。

本批预期 XML 变化为原神 1602 → 1572：只移除 30 个没有完整日文正文的攻略索引 URL，保留其 200 阅读回退并设置 noindex/follow；唯一完整日文攻略继续索引。若其他 owner 没有变化，全站唯一 URL 总数预期 6683 → 6653。必须实际验证差集与 owner 图，不能仅用预期数字判定成功。

## 6. 后续维护

把这条链路成熟后再抽象为其他 owner 的共用推广能力，不增加新的控制 Worker。异环与绿梦分别恢复来源、存储兼容和同产物验收，不混进原神一次发布。磁盘清理另设保留周期和可恢复性检查，不以删除本批回退证据换取空间。
