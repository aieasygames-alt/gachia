# 剩余依赖风险与 Worker 本地验收收尾

日期：2026-10-25。源码基线 855254b，当前为未提交的本地修复候选。Node 22.22.2 / pnpm 10.10.0。

## 结论

上一阶段剩余的 Zod、旧 esbuild 依赖问题和 Worker 本地验证缺口均已处理。生产依赖及全依赖扫描均为 0 命中；五应用 Worker 构建、dry-run、制品可移植性和本地浏览器回归通过。没有推送、创建 PR、启动 Actions、部署云端或读写真实用户数据库。账号开关保持 false，账号删除功能未纳入候选。

这是本地工程收口，不是生产发布或实际云端验收；扫描清零仅代表当日公告匹配，不能保证不存在未公布漏洞。

## 依赖修复

1. core/data 迁移到 Zod 4.6.6，以 partialRecord 显式保留缺少部分翻译的旧契约。六项兼容测试在升级前后均通过，真实游戏数据校验通过，没有为迁移修改内容数据或伪造翻译。
2. Drizzle Kit 固定 0.31.11，仅移除其未使用的废弃 esm-loader 依赖边。真实 CLI 在禁用该 loader 的条件下完成临时 SQL 生成、内存 SQLite 验证和二次无变更检查；没有使用全局旧 esbuild 强制升级或扫描忽略名单。
3. 扩大到开发/发布工具链后发现的公告也已处理：限定分支更新网络、解析、文件匹配依赖，sharp 更新到 0.35.5。合成 PNG/WebP/AVIF 编解码与 SVG 栅格化通过。
4. Router/DB 的 workers-types 对齐已安装 Wrangler 的 peer 要求，冻结安装不再报告该 peer 冲突。Next 15.5.28、OpenNext 1.20.13 和 deferred-initial 补丁不变。

完整兼容约束与后续升级规则见 `../../docs/dependency-security-policy.md`。

## 最终验证

| 验证 | 结果 |
|---|---|
| pnpm audit --prod | info/low/moderate/high/critical 均为 0 |
| pnpm audit（包含开发依赖） | 各级均为 0；与生产范围分别保存 |
| Web | 78 文件 / 376 项通过 |
| Data | 14 文件 / 168 项通过，含新增 6 项 schema 兼容测试 |
| Router | 4 文件 / 35 项通过 |
| Admin | 265 通过、17 跳过、0 失败；跳过不算浏览器通过 |
| 发布工具 Node | 244 项通过，包含新增 Drizzle/图片工具链 4 项 |
| 发布工具 Python | 四组 30 项通过 |
| 类型检查 | 九个配置包全部通过 |
| Web lint | 0 error，1 条既有 AuthDialog ref cleanup warning |
| 冻结离线安装、数据 validate、manifest、raw inventory | 通过；90/90 对 raw 相等 |
| OpenNext、Wrangler dry-run、可移植性 | 五个应用均通过 |

## Worker 包体

| 应用 | dry-run gzip KiB |
|---|---:|
| Main | 2896.82 |
| Genshin | 1382.13 |
| NTE | 1401.55 |
| Azur Promilia | 1064.47 |
| Lvmeng | 1062.87 |

主站距离历史 3 MiB 预算约余 175 KiB。当前实际账户套餐未查询，dry-run 不证明云端平台最终接受或满足历史更低内部预算。生产发布仍需核实平台上限、包体增长以及旧资源保留。

绿梦默认 Wrangler 配置为 preview；首次默认 dry-run 只作打包检查。随后显式 `--env production` 的 dry-run 通过，保留两份日志。本地生产阅读回归使用隔离 fixture 的 production 标志，没有把 preview 配置发布到生产。

## 本地浏览器与内容

| 检查集 | 已保存的浏览器观测条数 |
|---|---:|
| 五应用基础运行时 | 70 |
| Main/Genshin/NTE 搜索与历史修复回归 | 19 |
| Main 受管内容、归档、404、导航 | 520 |
| Main/Genshin 语言与 SEO 发现 | 56 |
| 合计 | 665 |

这些是脚本中的检查/场景记录数，不是唯一页面数、物理设备数或全站覆盖率。包含 1440/390 视口，适用语言、延迟脚本和无 JavaScript 检查；分别保留各套脚本的范围。主站子图实际 4515 URL，原神 1572 URL。受管内容另含 171 个 Main 承接 NTE 物品 HTTP 回退检查、7 份 JSON、3 份搜索索引、8 项合成 IndexNow 边界检查；这些不向真实 IndexNow 提交 URL。

无登录入口/后台认证请求的回归保留。未提供生产数据库绑定或认证凭据。搜索手机截图 `web-search-390.png` 已人工查看，没有观察到横向溢出或不可见按钮。

## 证据与限定

- `audit-production.json`、`audit-all.json`：最终注册表扫描原始结果。
- `runtime-summary.json`、`runtime/`：各套本地验收结果、摘要和观察数。
- `sitemap-contract.json`：实际本地 Worker XML 合约结果。
- `candidate-source-hashes.json`：本批修改/新增工程文件摘要，不是已签名发布制品。
- `gachia-final-*.log`：构建、dry-run、测试、类型、lint、安装与运行时日志。
- 前一阶段 `reports/audit-followup-2026-10-25/` 的 2 条剩余告警为历史，不再作为当前状态。

测试夹具曾因 Drizzle 不导出 package.json、旧缓存中仍可解析被移除模块、以及绝对 out 路径导致第二次生成找不到快照而失败。分别改为解析正式入口、验证锁图并阻断实际 loader 请求、使用临时 cwd 下相对 out 路径后通过，没有放宽业务断言。搜索回归首次遗漏输出目录参数在服务启动前失败，补全参数后完成；保留失败日志，不将其计作通过。

生产剩余动作是精确候选 Git 交付、生产版本/配置/旧资源及回滚门禁核验、经授权的 staging/生产推广。未执行这些动作，不能声称线上漏洞已经修复。
