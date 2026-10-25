# 当前审计任务表

更新：2026-10-25。基线：`855254ba3556131bc258250642f2790f521cf064`，本次本地修复随本表封存为 Git 候选，未推送、未部署。

本表专门收敛本轮七项审计发现，不宣称覆盖全部产品计划。原目录 `/Users/robert/Documents/gachia` 的旧 HEAD、未提交候选和历史任务流水不能代表本基线或当前生产版本。

账号删除任务已按用户要求停止，本批未引入其 API、组件、测试或文档。账号开关继续为 false，不重启登录，不读取或删除真实用户数据。

## 七项审计对账

| 原问题 | 当前处理状态 | 证据 / 后续 |
|---|---|---|
| 两个预览发布入口指向生产 | 已由基线修复，本轮复核 | 蓝色星原、异环 deploy:preview 均指向受控 game-release staging；发布合约测试通过，不重复改入口 |
| 依赖安全命中 | 本地生产和全依赖扫描均清零 | 先从基线 22 条生产命中降至 2 条，再完成 Zod/Drizzle 迁移及工具链更新；当前两种扫描均 0，不代表已部署或永久无漏洞 |
| 六对 JSON 镜像漂移 | 已由基线修复，本轮复核 | raw-inventory --release：90/90 相等、pending 0、holds 0；基线已有生成/漂移门禁。相等不等于全站事实核验 |
| sitemap 结构与语言策略 | 已由基线修复，本轮回归 | 根图为 sitemapindex；主站所有权与页面例外显式约束；原神使用 isGuideLocaleIndexable；Web 与发布契约测试通过 |
| 地图写入异常被当成成功 | 本轮修复，未部署 | 精确 ON CONFLICT(user_id,map_id,marker_id) DO NOTHING；插入/删除失败返回 503/no-store；新增 7 项回归。账号停用门禁不变 |
| 首页 post-test 与双 locale | 已由基线修复，本轮回归 | 完整状态映射，href 不含 /zh；现有 three-game-status 测试通过 |
| 待办表包含过期结论 | 本轮重新建立当前入口 | 本表以最新基线为准，历史发布结论保留于原计划，不把已交付事项重新列为未实现 |

## 上轮未完成项的收口

| 优先级 | 剩余任务 | 退出标准 |
|---|---|---|
| 已完成本地修复 | Zod 3.25.76 的高危公告命中 | core/data 改为 4.6.6；partialRecord 保留缺译契约；6 项升级前后兼容测试及真实数据校验通过 |
| 已完成本地修复 | esbuild 0.18.20 的开发服务公告命中 | Drizzle Kit 0.31.11 精确移除未使用 loader 边；禁止该模块加载的真实临时 CLI 生成、SQL 执行、二次无变化测试通过 |
| 已完成本地验证 | Worker 打包、包体与运行时回归 | 五应用 OpenNext、dry-run、可移植性通过；基础 70、搜索修复 19、受管内容 520、SEO 56 条浏览器观测通过，合计 665；不是唯一页数或生产验收 |
| 本地 Git 交付；远端推广待确认 | 精确候选 Git 交付及受控推广 | 用户要求继续下一步后完成基线、源码摘要及只读公网预检；本地提交，不复用此前账号删除的部署授权，不部署脏原目录，未触发 Actions |

### Git 交付前复核

- 重新 fetch 后 origin/main 与验证基线同为 `855254b`，未发现远端源码漂移。
- 13 个工程候选文件与验收时记录的 SHA-256 全部一致，`git diff --check` 通过。
- 再次执行 `pnpm content:release-ready` 通过；`pnpm audit:production` 的 15 项基础请求与 19 项 owner/资源请求通过。此为当前生产 GET 抽查，不是候选云端验收或全部静态字节核验。
- GitHub 只读查询确认最近 Main 发布 `40159761037` 为 failure，对应独立只读恢复 `40162485064` 为 success。S2.23 记录的原产物为 `12585908102`、恢复回执为 `12587311797`；后续仍须实时验证摘要、期限与 Cloudflare 活跃 UUID，不使用 S2.20 的旧来源。
- 未核验云端当前 UUID、账户套餐/Actions 剩余额度，未下载并重新验明旧资源来源。本地通过不等于生产发布门禁全部闭合；推送/云端推广前继续核验。

### 依赖处理边界

- 原 Zod 与 esbuild 命中分别为 `GHSA-mrhx-c7xc-m3w5`、`GHSA-67mh-4wv8-2f99`；没有使用忽略名单，不以账号停用代替依赖修复。
- 扩大至全依赖扫描曾发现 51 条开发/发布工具链命中（1 critical、28 high、19 moderate、3 low），已通过限定版本升级清除。该数字与原生产范围统计不同，不能混算。
- 迁移语义、精确移除依赖的依据、后续升级门禁见 `docs/dependency-security-policy.md`。

## 本次依赖变更

- Better Auth 1.6.22、Vite 8.1.6、Vitest 4.1.12、PostCSS 8.5.23。
- 定向覆盖 nanoid 3.x → 3.3.18、source-map-js → 1.2.2、esbuild 0.27.7 → 0.28.1、Zod 4.x → 4.6.6。
- 保留 Next 15.5.28、自定义水合补丁、OpenNext 1.20.13、既有 Worker 发布拓扑。
- 进一步升级 Drizzle Kit 0.31.11、sharp 0.35.5，以及公告涉及的网络/解析/文件匹配工具链。图片编解码和 SVG 合成回归通过。
- 锁文件同时更新共享 peer 依赖图，不冒称仅影响主站。冻结离线安装通过；Router/DB 的 workers-types 对齐后，原 peer 警告消除。

## 验证与证据

- Node 22.22.2；Web 376、Data 168、Router 35 项测试通过。
- Admin 282 项：265 通过、17 跳过、0 失败。跳过项不视为浏览器验收通过。
- 发布工具 Node 测试 244 通过，Python 四组 30 项通过。
- 九包类型检查通过；Web ESLint 0 error，保留既有 auth-dialog ref cleanup warning。
- 数据 validate、verify:manifests、raw-inventory --release 通过。
- 主站、原神、异环、蓝色星原、绿梦共五个 OpenNext Worker 构建、dry-run 和可移植性检查通过；本地浏览器基础矩阵共 70 场景通过。
- 未部署、未创建 PR、未修改生产服务/数据/开关。主站 gzip 2896.82 KiB；历史 3 MiB 预算约余 175 KiB，实际云套餐未核实，发布前仍需按现行限制与旧资源策略核验。

前一阶段证据：`reports/audit-followup-2026-10-25/`。最新证据：`reports/security-runtime-closeout-2026-10-25/`。上一轮旧目录扫描的 3 critical / 17 high 不能继续当作当前基线的统计。
