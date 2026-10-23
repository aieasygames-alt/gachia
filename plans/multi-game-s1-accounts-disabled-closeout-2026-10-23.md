# S1.4 交付：无账号运营与主站 staging 验收

日期：2026-10-23，Asia/Shanghai。功能候选：`3e39b3f09281e4abe67d6ee29f69fcd23f557b93`；验收工具修正：`41b6e75`。分支：`codex/multi-game-s1-release-safety`。

**结论：按用户决定，完成站点账号功能可恢复下线，并通过主站独立 staging 的限定验收。当前无账号版本不再依赖 Google OAuth 配置。生产未发布，六个生产服务、生产路由及蓝色星原 staging 版本均未改变；不能将本批结论扩展为全站无条件放行。**

## 1. 交付范围

- 隐藏登录入口、账号菜单及依赖登录的收藏交互；关闭认证客户端构造、会话轮询；隐藏创建云端分享的队伍按钮。
- 认证及历史回调、收藏、角色云存档、地图云进度、共享配装创建均先返回 404 + `ACCOUNT_FEATURES_DISABLED`，带 no-store/noindex，不触碰认证、限流或数据库，也不刷新 Cookie。
- 保留公共阅读、搜索、语言切换和既有无账号本地工具；已有公开分享 GET 保持原行为。没有新建工具或宣称地图第三方 API 已通过本批验收。
- 保留账号表、历史数据、迁移、认证依赖与 dormant 组件；不销毁账号、不删除历史会话、不迁移数据库、不读取真实用户记录、不改任何 secret 值。
- 统一源码策略、浏览器、Worker 和发布 secret 检查。仅免除停用功能的认证专用配置，保留 IndexNow secret 及所有生产确认、不可变产物和回滚门禁。
- 更新三语言隐私披露；为主站 workers.dev 运行时添加 noindex 和禁爬 robots，正式域名仍保持原索引规则。

完整行为矩阵、恢复步骤及保留理由见[账号下线与恢复规范](../docs/account-features-retirement.md)。未来恢复需要独立切片和真实 OAuth/安全验收，不是直接把 JSON 改成 true。

## 2. 本地验收

| 检查 | 结果 |
|---|---|
| Web 单元/契约测试 | 231 / 57 文件通过 |
| 发布与验收工具测试 | 81 项通过 |
| 全仓类型检查 | 9 / 9 任务通过（含缓存复用） |
| CI 与补丁/不可变产物契约 | 9 项通过 |
| CI 范围策略 | 2 项通过 |
| Router 测试 | 31 / 3 文件通过 |
| 冻结锁文件离线安装 | 通过；未改依赖或锁文件 |
| 默认生产 OpenNext 构建 | 通过，生成 7,523 静态页面 |
| 产物可移植性 | 通过；3,133 文件、19 个内部链接 |
| 主站 staging dry-run | 通过；未压缩 13,887.32 KiB / gzip 2,834.49 KiB |
| 本地真实 Worker HTTP | 31 项通过：17 项公共检查 + 14 项账号停用方法检查 |
| 本地 Chromium | 18 场景通过；493 次允许的同源请求 |

本地 Worker 故意不绑定 D1/R2，也不配置认证 secret、不运行迁移或种子 SQL。阅读路径不依赖账号数据库，停用 API 在损坏请求体或合成旧 Cookie 下也不调用认证/限流/DB；不存在用真实账号数据制造通过的情况。单元测试还保留已有公开分享读取及历史独立认证策略测试，后者不是当前站点登录验收。

浏览器矩阵：1440/390 宽度 × 中英日 × 正常 JS/延迟 JS/无 JS。实际执行阅读、搜索、详情客户端导航、返回及焦点恢复，断言无登录入口、无后台账号请求、无失败 JS/CSS 和水合错误。此矩阵不是全站工具测试或真实移动设备测试。

构建仍报告既有 dormant AuthDialog 的 ref cleanup lint 提醒，以及工具链 punycode 弃用提醒；没有因此关闭 lint 或放宽运行时门禁。代理访问保留 Node EnvHttpProxyAgent 实验性警告。

## 3. 不可变候选与部署

部署前重新读取六个生产版本、生产域名路由、主站 staging 当前版本及绑定，确认 staging D1/R2 与生产标识不同，self-reference 指向 staging。只核对 secret 名称，不读取其值；Google OAuth 两项缺失不阻塞当前无账号版本，IndexNow 名称存在。

功能候选提交后工作树干净，封存本地已验收产物，仅执行一次主站 staging 部署：

```bash
pnpm --filter @gachia/web exec opennextjs-cloudflare deploy --config wrangler.jsonc --env staging
```

| 项目 | 实测 |
|---|---|
| 服务 / origin | `gachia-staging` / `https://gachia-staging.aieasygames.workers.dev` |
| 候选源码 | `3e39b3f09281e4abe67d6ee29f69fcd23f557b93` |
| 云端版本 | `ac713549-2c34-4d41-a77f-6cc74566845e` |
| 云端 deployment | `f8534ccf-4a4b-495a-a8d8-3ea6c66313f2` |
| 创建时间 | `2026-10-23T12:34:25.785566Z` |
| 平台启动时间 | 23 ms |
| 未压缩 / gzip | 13,887.32 / 2,834.49 KiB |
| 先前 staging 回退引用 | `6d5a6d43-2530-4f42-9ce7-a1267ae26d3c`；版本元数据可读，未演练回退 |
| 封存 tar SHA-256 | `5467d6ee465d3fc30a7ac366398d0e17129890f1d85c46cabff852774bf82aaa` |
| Worker 入口 SHA-256 | `d05223bf4d44c84108a102ab62aa3bc9c5568f0c3ac2064c37be5cc65c64bc45` |

部署后复核 Worker 字节、封存 tar 及 Wrangler 配置校验和均未变。后续工具修正仅改变测试请求头，不改业务源码或生成产物，没有再次构建/部署来替换验收对象。

本轮未运行或触发 GitHub Actions、未 push、未改生产路由、未新建 Worker。仅沿用已核实 Paid 账户的现有 staging；部署和有限功能请求可能产生现有套餐下的用量，不声称 Cloudflare 零成本。

## 4. 云端验收及一次失败调查

首次复用本地 harness 时，测试把模拟的 `CF-Connecting-IP: 192.0.2.1` 带到云端，首条请求遭 Cloudflare 403（DNS points to prohibited IP）。对同一 URL 的两个受限 GET 对照证明：不带该头为 200，带头为 403。修正为只允许显式 HTTP loopback/端口本地夹具携带该头，新增回归测试；没有关闭 WAF、修改 DNS、系统代理或 TLS，没有复制 secret，没有重新部署。失败原始记录保留，不改写成成功。

修正后的同一部署验收：

- HTTP **31 项**通过，包括 12 条三语言 HI3 阅读、robots 禁爬、正式域名 sitemap、JS/CSS、404 及 14 项账号接口拒绝；正文 canonical 指向 `gachia.com`，预览响应带 noindex。
- Chromium **18 场景**通过，允许的同源请求 **494 次**（单次运行上限 3,000），账号请求 0、失败脚本/样式 0、运行时错误 0。阻止跨域请求，不是压力测试。
- 额外 **9 条 staging GET**通过：中英日首页、隐私页、抽卡规划器路由；隐私页确认账号停用/历史数据保留说明。这仅证明这些路由响应与披露，不代表完整规划器交互验收。
- 最终对账：六个生产服务 deployment、版本和流量百分比、生产路由及域名配置未变；蓝色星原 staging 未变；主站 staging 仍为本次候选。
- 六条生产公共 GET 抽样为 200，未添加 noindex；没有对生产账号接口发送停用测试写请求。

云端验收使用用户已有本机代理出口，未改变全局网络设置。结果不是全球连通性、真实用户 Core Web Vitals 或长期 CPU/成本评估。

复现入口固定到 main staging，不接受自由 origin：

```bash
node scripts/web-staging-acceptance.mjs
```

HTTP 账号拒绝检查会发送有限 POST/PUT/DELETE，携带合成退役 Cookie 和损坏请求体，不能改用生产地址运行。没有使用真实有效旧会话或读取业务记录；“旧会话无法绕过”由早期门禁、单元调用边界和无数据库本地 Worker 共同验证，而非真实账号登录实验。

## 5. 生产判断与下一步

1. **已满足当前无账号主站候选的限定 staging 标准。** Google OAuth 不再是当前版本的阻断项；真实 OAuth 验收改为未来恢复账号时的必需项，不记为已经通过。
2. **生产尚未更新，线上仍是旧版本。** 正式推广前重新核对生产当前版本、可回退组合、旧静态资源保留与候选产物；明确批准 main-only 发布，再核验生产域名上的关闭效果与关键阅读路径。
3. **Router 与跨 Worker 边界仍需独立验收。** Router staging 既有漂移未处理，本批主站直连结果不证明 Router 转发、统一域名资源及四款独立游戏的新运行时均已通过云端验收。
4. **长期运营与清理不混入本批。** S2 内容/SEO 契约、数据镜像、游戏接入模板及 S5 磁盘预演按原计划推进。没有合并 Worker、没有删除缓存/历史版本，更没有删除用户数据来“减少复杂度”。
5. **留存 staging 和证据。** 封存包约 52 MiB（du 快照）作为本批回退/复核证据保留，不在验收期间自动清理；预览 noindex 不是访问控制，不能在页面放置非公开数据。

机器报告：[S1.4 无账号验证记录](../reports/release-safety/s1-accounts-disabled-verification-2026-10-23.json)。原始 CLI/API/测试日志、失败与成功记录、截图均在忽略目录 `.release-records/`。开发主文档更新至 v1.4，不覆盖原主工作区的未提交内容或任务总表。
