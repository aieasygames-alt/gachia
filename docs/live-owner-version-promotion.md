# 异环 / 绿梦：不新增 Worker 的版本推广契约

## 适用边界

S2.22 使用既有服务的 Cloudflare Version Preview URL，验收通过后推广同一 UUID。它不同于把 preview 模式构建直接部署到生产，也不同于新建 staging Worker。只适用于明确审查过的 `gachia-game-nte` / `gachia-game-lvmeng`，不授权其他 owner 或 Router 变更。

生产 URL、绑定、域名、Router 切流开关不变。无账号客户端与 Main 的账号 API 停用边界继续保留。业务验证是有边界的工程验收，不是全部游戏事实、性能或安全审计完成的证明。

## 为什么不用旧 deploy 入口

- 异环 `deploy:staging` 可以创建当前不存在的 staging，与本阶段减少运维复杂度的目标冲突。
- 绿梦顶层默认是 preview 模式，但与 production **使用同一服务名**；默认环境绝非隔离预发布目标。
- “重新 build 后部署”不能保证预览验收的代码与线上一致。
- 原始 UUID 回退无法证明新缓存 HTML 引用的 chunk 仍在，因此必须保护旧资源并审查回退资源并集。

## 本地制品

`scripts/live-owner-artifact.mjs` 只提供本地封存与完整性检查，不提供远程写操作。复用整棵 portable Worker 树的哈希、目录和内部链接检查；任何额外文件、空目录、缺失文件、摘要变化、外链或变更 config/receipt 都拒绝。

封存前：干净 committed HEAD、固定 Next/OpenNext/Wrangler、正确生产 mode、生产构建、双资源路径、旧版静态保留。封存内容包含生产配置、候选 XML 和完整 `.open-next`，外部独立保存 manifest SHA-256。

执行配置由 `liveOwnerExecutionConfig` 校验封存后派生，**放在封存目录外**；主脚本与资源目录改为指向封存的绝对路径。Wrangler 会在 config 旁创建 `.wrangler/tmp`，不能为此放宽封存清单。异环派生 config 无环境块，保持线上空 CF 服务标签；绿梦保留显式 `production` 环境选择和既有服务/环境标签。

旧资源 receipt 与 `scripts/retain-game-assets.mjs` 约束相同：权威旧 Worker archive、前后 100% 版本/部署/etag 观察、版本绑定的历史日志清单、实际 JS/CSS/font 字节。只保留已登记静态文件的原路径和命名空间副本；不覆盖不同字节、不复制旧 HTML/数据/runtime。旧 Git 来源未证明时明确 `not_attested`，清单完整性为 `not_asserted`。

## 预览与推广

1. 先读取所有已观察服务的部署、设置、绑定、子域开关，以及 Worker 列表、zone routes、custom domains。确认旧版版本、部署和 etag 与 receipt 一致，服务已存在且 previews 已启用。
2. 验证源码清洁且与已推送 commit 一致；验证产物 pin、本地真实 Worker 验收、回退本地兼容证据。
3. 对封存的派生 config 执行 `wrangler versions upload`；禁用自动创建资源，不使用改名、alias、额外变量或任意配置覆盖。保存上传 multipart 和版本 UUID。
4. 读取真实版本资料，验证原绑定与生产模式，确保 100% 正式部署仍是旧 UUID。上传前后所有部署、运行配置、子域、Worker 列表、路由与域名必须一致；script settings API 的版本注释可能显示最新上传版本，只允许精确匹配本次操作人指定的 `workers/message` 与 `workers/triggered_by=version_upload`，不放宽其他设置。
5. 只接受 `https://<UUID前8位>-gachia-game-<owner>.aieasygames.workers.dev` 的精确版本预览，不把稳定 workers.dev 地址或可变 alias 当成版本证据。
6. 预览通过后重新核对源、pin、receipt、云状态和 UUID；执行 `wrangler versions deploy <已验收UUID>@100%`，不重新 build 或 upload。
7. 对正式服务读取版本与实际云模块，和上传 multipart 的模块摘要核对；重新做正式页面、全部资源、语言、浏览器和全站回归，最后对账控制面。

Wrangler 4.148.0 的版本上传源码明确：静态资源 session/JWT 关联到该上传版本；不切正式 deployment、不部署 triggers；observability/logpush 不随版本上传设置。但它可能写服务标签，因此派生 config 和前后对账必须覆盖标签，script settings 中还会显示最新上传版本的 message 注释；不能笼统声称所有 `versions upload` 都绝不改非版本设置或返回元数据。平台行为变更时重新审查。

## 同一生产包的防索引

两个应用的 middleware 按解析后的主机名判断 `.workers.dev`，而不是环境构建字符串或 URL 子串。直连和版本预览的动态页面/XML/404 设置 `X-Robots-Tag: noindex, nofollow`，robots 阻断 wildcard；正式 `gachia.com` 保持既有索引策略。canonical/XML URL 始终指向正式域名。静态资源不需要可索引页面规则。

本地模拟 Host 必须使用原生 HTTP 请求；Node fetch 不可靠地保留自定义 Host。端到端检查必须验证真实编译产物，不仅检查源码文本。

## 验收范围

`scripts/live-owner-acceptance.mjs` 包含有界、只读 HTTP 和浏览器验证：

- XML 结构/重复/实体声明、旧/新 URL 完全相同（389 / 27），全部公开页面及异环对应日文页。
- 自身 canonical、已批准日文攻略 hreflang 和 noindex、一致生产域名、JSON-LD 可解析；这不是完整 Schema.org 字段审计。绿梦只中文，英文/日文入口 404。
- 真实 dedicated 详情 404 与未知栏目 Main fallback 分开；异环未知栏目按 Main 既有 allowlist 精确 301 到 `/zh/nte`，绿梦未知栏目 404；不因为游戏前缀假定都由专属服务处理。
- 产物中所有旧/新 JS/CSS/font 在原路径和命名空间 GET，核对长度、摘要及类型。正式 `/_next` 属于 Main，游戏原路径必须在直连 Worker 检查。
- 桌面/移动，正常/延迟脚本/禁用 JS，筛选、同 owner 客户端跳转、绿梦两个清单旧 key/未知 ID/畸形值/读写拒绝/重载，以及无登录或账号 API 轮询。
- 每个脚本/样式 HTTP 错误和 requestfailed 立即记日志。只有明确禁用 JS 场景中脚本精确原因 `csp` 才是预期；其他失败不得泛化忽略。

部署后另验严格六文档 XML 图、Main 自有异环 171 详情覆盖、其他 owner 的资源与浏览器原生导航。图片按实际公共 owner 单独检查：专属版本预览只有 logo，不能因独立预览缺少 Main 图片就宣称公共图像失败，也不能把 JS/CSS 字节通过冒充图片已全部通过。S2.22 扩展图片巡检发现 `/images/characters/chaos.webp` 仍为 404；权威旧云 renderer 的本地还原与候选引用相同路径，作为既有缺口保留，不宣称修复。

## 回退和证据保留

上传/预览失败时不切正式流量。生产验收失败时先保存现场，不为了修复验收 harness 重新发布。需要代码修复时建立新 commit、新产物、新版本，重新完整验收。

旧云模块配合新旧资源并集的**本地兼容检查不等同线上回滚演练**；它也不是可直接上传的已批准远程 fallback 配置。实际回退前仍须核对当前版本、资源兼容、预览防索引和配置边界。不得无条件执行 raw UUID 回退。

现场证据 `.release-records/s2-22/` 是受保护的忽略目录，不作为可清盘缓存；提交的阶段文档与 `reports/release-integrity/` 清单绑定摘要。下一次发布必须捕获届时线上新版本，不得复用本次旧版 receipt。完整异地备份恢复与在线回滚演练仍需另行排期。
