# S1.2 阶段交付：统一应用运行时与本地关键路径回归

日期：2026-10-23，Asia/Shanghai。基线：`3ea77da082b38e6a7f993d92361150db4f7ef417`；分支：`codex/multi-game-s1-release-safety`。

后续状态：[S1.3](multi-game-s1-staging-closeout-2026-10-23.md)已核实 Paid 套餐、现行 64 MiB 未压缩限制，并完成蓝色星原独立云端 staging 验收。下文保留 S1.2 当时的本地范围；其中假设 3 MiB gzip 情景不是当前发布限制，生产仍未切换。

**结论：主站、原神、绿梦完成限定运行时迁移，与异环、蓝色星原统一为一套精确依赖和补丁门禁。默认构建、本地 Worker、浏览器与认证边界验证通过。仅交付本地代码与验证，不是云端验收或生产发布。**

关联长期需求：R01 发布安全、R05 运维复杂度、R09 验证成本；本批不宣称完成整个 S1 或后续 S2–S8。

## 1. 范围、业务结果与权限

- 使用独立工作树，不修改 `/Users/robert/Documents/gachia` 中的原有工作和依赖目录。
- 主站、原神、绿梦不再维护另一套旧 Next/OpenNext 组合；五个应用共用一个门禁，新增游戏可以复用该策略，而非继续增加版本分叉。
- 不改变公共 URL、游戏内容、Router 服务映射或线上流量，不合并或删除 Worker。
- 没有 push、PR、GitHub Actions、Cloudflare 部署、线上数据库写入或业务/历史文件删除。
- 只有本地可再生产物、测试记录，以及独立本地 D1 中的合成账号、会话、收藏发生写入；这不是存储清理批次，不报告磁盘回收收益。

## 2. 工程实现

| 项目 | 当前状态 |
|---|---|
| 五个 Next 应用 | Next 15.5.28 / OpenNext Cloudflare 1.20.13 / Wrangler 4.148.0 |
| Workers 类型 | 五应用固定 5.20261006.1；Router 保留原依赖 |
| React / React DOM | 解析为 19.2.4，本批未升级 |
| 验证工具 | Node 22.22.2 / pnpm 10.10.0 |
| 自定义补丁 | 仅注册 Next 15.5.28，保留四处 CJS/ESM layout/head absent-prefetch 改动 |
| 历史材料 | 15.5.18 补丁和 manifest 保留，不再注册，不删除历史证据 |

统一门禁 `scripts/require-app-runtime.mjs` 替代试点专用命名：从应用实际解析 Next、OpenNext、Wrangler，核对声明与安装版本，并检查四处补丁摘要；`--all` 覆盖五应用。主站原入口委托该门禁。主 CI 在构建与恢复部署产物前检查统一运行时，不改变人工发布确认和不可变产物链。

原神、绿梦增加生成 `_next` 资源的 namespaced 别名，解决直连本地/预览 origin 时依赖 Router 剥离前缀的问题；保留原资源路径，不复制游戏图片或数据。原神 preview/build/deploy staging 使用相同显式环境；绿梦生产构建和 dry-run 显式使用 production。

`release:game` 的远程计划、verify、deploy 白名单仍仅允许异环、蓝色星原；原神、绿梦只加入本地 `prepare-assets`。原神现有发布脚本未获得等同试点的生产确认/回滚门禁。绿梦默认配置仍是生产服务名，即使内容模式为 preview，也不是安全 staging。

本地回归脚本 `scripts/runtime-rollout-smoke.mjs` 从零创建本地配置，不继承云端服务、路由、数据库 ID 或凭据。结果目录唯一，D1 始终 `--local` 且使用独立持久化目录。主站 Google 配置为空，合成 secret/token 随机生成，不写入 Git。单元测试保护本地隔离与发布白名单边界。

## 3. 构建与包体实测

全部使用默认支持策略，无 `--allow-unsupported-next-for-verification`，无跳过构建或手工修改生成 Worker。以下为本地 Wrangler dry-run 的候选 gzip，不是线上上传或启动/CPU 通过的证明。

| 应用 | 模式 | gzip KiB | 本地结论 |
|---|---|---:|---|
| 主站 | production | 2826.59 | 默认 OpenNext 构建、dry-run 通过 |
| 原神 | production | 1338.19 | 构建、41 个资源别名、dry-run 通过 |
| 原神 | staging | 1337.56 | 显式 staging 构建、资源与索引边界抽查通过 |
| 绿梦 | production | 1006.61 | 构建、35 个资源别名、dry-run 通过 |
| 异环 | staging / production | 1342.05 / 1335.78 | 两组受控验证与浏览器复验通过 |
| 蓝色星原 | staging / production | 1039.01 / 1045.17 | 两组受控验证与浏览器复验通过 |

主站距假设 3 MiB（3072 KiB）限额仅 245.41 KiB。**当前套餐未知，不能把这个假设当作账户实际限制，也不能把各 Worker gzip 相加当作合并包体。** 下一批先确认账户容量和主站增长预算，再决定分组策略。此次运行时收敛降低版本维护分叉，但未证明总体构建耗时或磁盘使用已下降。

## 4. 本地验证矩阵

| 集合 | 结果与范围 |
|---|---|
| 发布/运行时/隔离单元测试 | 69/69 通过 |
| 主站 Vitest | 198/198 通过（55 文件） |
| Router Vitest | 31/31 通过（3 文件） |
| 全仓类型检查 | 9/9 任务通过 |
| 定向 admin 回归 | 23 通过、1 明确跳过；覆盖补丁、CI、执行依赖、官方来源网络策略等，不是 admin 全量验收 |
| CI 影响范围契约 | 2/2 通过 |
| React 认证弹窗 fixture | 1/1 通过，内部桌面/手机矩阵；陈旧响应、错误重试和关闭焦点回归，使用 mock，不是真实 OAuth |
| 部署注册表与生成 Router 配置 | 4 个游戏检查通过 |
| NTE 索引契约 | 模式检查通过；日文索引契约通过（53 个可索引指南） |
| 依赖重现 | `pnpm install --frozen-lockfile --offline` 通过；五应用门禁通过 |
| 三应用生产模式本地 HTTP | 主站 49、原神 14、绿梦 12，共 75 次观察 |
| 三应用生产模式浏览器 | 主站 18、原神 18、绿梦 6，共 42 个场景 |
| 两试点 staging/production 浏览器 | 每组 14，共 56 个场景；各组另执行本地 HTTP、产物索引与 dry-run 检查 |
| 原神 staging 补充 HTTP | 12 次观察：中英日计算器、JS/CSS、robots、sitemap、404 |

三应用 HTTP 的 75 次观察包含 20 次重复限流探测及预期的 401/403/404/429，不是 75 个独立页面。浏览器宽度为 1440/390，分别运行交互、延迟脚本、无 JS；不是实机或全内容页面验收。

主站覆盖三语言 HI3 武器目录和三个详情页、canonical、sitemap、robots、静态资源与 404；浏览器覆盖客户端详情导航/返回、搜索、认证弹窗错误恢复。主站有 JS 的场景均观察到真实 prefetch 请求；原神计算器不是导航测试，不能把其 prefetch 为零解释为已覆盖预取导航。

原神覆盖三语言主要入口与材料筛选/关注清单刷新持久化。绿梦覆盖中文主要入口与准备清单刷新持久化，并确认英文/日文入口为 404。两个试点复验三语言交互和无 JS 阅读、筛选、详情导航/返回；试点延迟脚本场景仅覆盖中文。

### 本地认证边界

在新的本地 D1 应用仓库迁移并写入合成会话，实际请求构建后的主站 Worker，验证：空会话与无效 cookie、未登录收藏 401、有效签名会话、收藏写入/读取、不可信 Origin 退出 403 且会话保留、可信退出清除会话并设置 Secure/HttpOnly、应用自有 D1 限流返回 429 与 Retry-After。

没有真实 Google OAuth、生产 cookie 域、线上 TLS、Router 转发可信 IP 或生产数据验收。Better Auth 内建限流仍提示无法确定可信 IP；本地验证通过的是应用自有 D1 限流，不能将两者混为一谈。Google 缺失配置和故意无效 Origin 产生预期日志；不把这些日志解释为全认证系统健康证明。

## 5. 检查过程中发现的问题与处理

1. 新版 Workers 类型下 `Buffer.equals` 在既有 HI3 图片测试中不可见。改为 `Uint8Array` 内容相等/不等断言，保持逐字节语义，不绕过类型检查；主站 198 测试和全仓类型检查重新通过。
2. 旧 admin 浏览器 fixture 写死 pnpm store 中 esbuild 版本路径。改从其 tsx 依赖解析 esbuild，真实 React 弹窗 fixture 通过。
3. 首次泛匹配 `*ci*` 误包含 official 测试，直接 Node 缺少项目既有 tsx loader，两个文件加载失败。随后使用 admin 的 `node --import tsx` 正确入口定向重跑，23 通过、1 浏览器 fixture 跳过；原始失败日志保留，不当作产品故障或完整 admin 测试通过。
4. 原神 staging 首次附加检查错误假设 sitemap 必须为空。源码既有策略与试点一致：保留生产域名 URL，预览 HTML noindex、robots 禁爬。未为让测试通过而修改业务策略，改为验证所有 sitemap URL 均为正式域名；12 项复验通过。完整 staging 索引治理仍属于后续验收，不宣称该 origin 有全局 X-Robots-Tag 防护。
5. 安装仍有 Router 既有 workers-types 4 与 Wrangler 4.110 的 peer 警告。本阶段不捆绑升级非 Next Router；其类型检查与 31 个测试通过，警告列入后续依赖维护。

## 6. 证据、复现与回退

机器可读摘要：[S1.2 验证报告](../reports/release-safety/s1-runtime-rollout-verification-2026-10-23.json)。包含锁文件/输入摘要、本地记录哈希、测试范围和失败修正；不是完整源码或静态资产供应链证明。

本地原始日志与合成状态在 Git 忽略的 `.release-records/`；不提交凭据、数据库或原始 Worker 日志。三个主记录：

- `rollout-web-52b7171b-7097-4e36-972b-9b74981db7f9/result.json`
- `rollout-game-genshin-c5cb4034-7ce0-466d-8673-614e60dbe3f5/result.json`
- `rollout-game-lvmeng-bb14c11b-dac4-4e97-b32e-161979c41764/result.json`

复现命令见[发布安全说明](../docs/game-release-safety.md)。测试须先重建对应模式；原神本批最后补验了 staging，因此不能直接把其现存 `.open-next` 目录当成 production 候选。其他工作树不自动获得新依赖，需先冻结安装并检查实际解析的补丁。

尚未部署，所以线上无须回退。本地若拒绝本批，在单独分支通过可审查 revert 回退整批 package/lock/门禁变更，冻结安装并重新构建，不把旧包和新产物混用，不回退用户数据。将来线上发布前必须独立核实可用版本 UUID、流量、资产保留与跨服务兼容，不能把本地 Git 基线当作云端回滚版本。

## 7. 下一批唯一优先方向

先完成 S1 云端前置核验和一条有界 staging 闭环，而不是立即大规模重构或删除文件：

1. 核实账户/套餐、当前生产版本、发布权限、Actions 剩余额度和可回滚 UUID，明确允许写入的独立 staging 服务。
2. 选择异环或蓝色星原一个已接入门禁的 staging 目标，预算化执行一次发布并核验 noindex、正文、canonical、JS/CSS、404、真实版本及生产未变化。
3. 主站另行安排真实 OAuth、可信 IP、跨 Router 导航与容量验证；未完成前不切主站流量。
4. S2 页面/内容一致性和 S7 存储清单可独立做本地工作，但不扩展本批完成声明；磁盘删除仍需逐项保护、预演和授权。

本阶段交付后停在本地 Git，不自动启动云发布或下一工作包。
