# S2.1：内容派生物与 Sitemap 所有权交付

日期：2026-10-23，Asia/Shanghai。固定基线 `fcded9f`，隔离分支 `codex/multi-game-s1-release-safety`。

结论：**本地切片开发和限定验收完成，未部署；S2 整体仍未完成，不将本批解释为全站可直接上线。** 没有 Git fetch/push、Actions 运行、云端部署、路由/服务变更、数据库操作或磁盘清理。原始主工作区未修改。

## 1. 本批结果

1. 稳定的 `/sitemap.xml` 改为合法 `sitemapindex`，发现主站子图和注册表中的四个 live 游戏子图，不再把 XML 地址当普通页面提交。
2. 主站页面图迁至 `/sitemaps/main/sitemap.xml`；独立游戏页面由自己的 Worker 全权提交。主站不能再次提交受保护的 NTE 日文页。
3. 遗忘之海攻略建立确定性派生链：75 篇源攻略，对应原始公开镜像、轻量摘要和 75 份详情，共 77 个输出。未修改攻略事实、翻译、业务日期或当前线上数据。
4. 主站构建前检查漂移，CI 在生成前检查已提交产物；失败只报告，不自动覆盖；孤立文件保留并阻断，避免把内容退役当自动清理。
5. 提供使用标准 XML 解析器的本地验收工具及回归测试，更新既有主站发布 smoke 对新索引结构的消费方式。Router 只补测试，生产代码/配置未改。

维护说明：[内容源与 Sitemap 契约](../docs/content-source-and-sitemap-contract.md)。

## 2. 六对漂移的归因及决策

重新比较隔离基线的 90 对 raw JSON：84 对一致，6 对不同。依据字段/ID 差异和提交内容，不以文件时间戳判断权威性。

| 数据 | 差异及提交证据 | 本批决策 / 下批动作 |
|---|---|---|
| roco characters | 源 `bc613db` 修改 3 个角色的数值、技能或描述；镜像停在 `e18bd4d` | 本批保持；复核事实与版本后同步，不机械选更新文件 |
| roco-cn guides | 源 `75d9ed7` 新增 daily-events-merchant-guide；镜像缺失 | 本批保持；先核验正文语言及显式退役英文 URL，再纳入生成链 |
| skjh guides | 镜像 `9796db5` 有 4 篇 S2/历史活动等运营修订；源无此修订 | 禁止源覆盖镜像；先把核验后的运营修订回迁源 |
| wuwa echoes | 源 `8988558` 新增 3 套；镜像缺失 | 复核版本、实装及命名后成对发布 |
| wuwa redeem-codes | 源把 3 个码标 expired，镜像仍 active | 下批最高优先级核验到期事实并成对更新；本批不声称可领取 |
| wuwa regions | 源 `8988558` 新增 simulacrum-nexus；镜像缺失 | 复核公告/实装、区服与语言后成对发布 |

处理决策是“保留差异，安排有依据的合并”，**不是六对问题已经修复**。完整字段、ID、两侧语义摘要和历史见 [漂移清单](../reports/content-integrity/s2-1-mirror-drift-2026-10-23.json)。

## 3. URL 差分与发现的边界

不混淆三类结果：

| 证据口径 | 改造前 | 改造后主站子图 | 说明 |
|---|---:|---:|---|
| 有文件系统源的 TS 求值 | 6,632 | 4,465 | 源视角的代码差分 |
| 无本地 raw guides 的 ASSETS 回退 | 6,629 | 4,462 | 旧代码回退重建 vs 本地编译 Worker 实际 HTTP；不是旧生产抓取 |
| 新 Next 预渲染文件 | 不作旧值推测 | 4,465 | 与源码求值一致；不等于无缓存 fixture 的运行时回退结果 |

两种前后差分都只移出 2,167 项，无新增、无不明移除：genshin 1,563、nte 585、azur-promilia 15 个页面条目，以及原本错放在 urlset 的四个子图引用。lvmeng 原根图没有页面条目，只迁移其子图引用。

这不是删除 2,163 个页面，也不是它们全部取消索引；仅取消主站重复提交，继续通过原游戏子图发现。未访问所有游戏子图的当前 HTTP，不能声称全站去重后 URL 总量已验收。NTE 哪些日文攻略可索引，仍由其 owner 的既有策略决定。

源码与回退相差的三项全部为 `/zh|en|ja/roco-cn/guides/daily-events-merchant-guide`，原因是第 2 节的已知源/镜像缺条。初次将源码基线直接与回退结果对比时，检查器确实因“不明移除”失败；未加豁免，而是保留源码差分、标明回退重建口径，并单独记录三项未闭合风险。英文路径还受 middleware 退役规则保护，后续不能通过同步镜像顺带恢复提交。

证据：[实际本地 XML 与逐项移出清单](../reports/content-integrity/s2-1-sitemap-url-diff-2026-10-23.json)、[源码/回退边界](../reports/content-integrity/s2-1-source-runtime-boundary-2026-10-23.json)。

## 4. 本地验证

环境：Node 22.22.2 / pnpm 10.10.0；Next 15.5.28 的既有受控补丁与 OpenNext 版本不变。

| 检查 | 结果 |
|---|---|
| data 测试 | 57 通过；含派生物漂移、缺失/损坏、源变更、ID 校验、孤立文件保留等 10 项契约测试 |
| web 测试 | 272 通过；含 root index、独立 owner 排除、预览状态、ASSETS 回退及本地化列表 |
| Router 测试 | 31 通过；所有游戏开关开启时，根索引和主站子图仍原路径进入 MAIN_SITE |
| release 测试 | 96 项 Node、9 项静态保留 Python、8 项 XML 契约 Python 通过 |
| 类型检查 | data / web / Router 通过 |
| lint | web 无错误；auth-dialog 一条既存 hooks 警告未顺带修改 |
| 构建 | 主站完整 OpenNext Worker 构建、Wrangler dry-run 通过；13,918.21 KiB / gzip 2,838.60 KiB，无上传 |
| XML HTTP | 200 + XML Content-Type；标准解析器验证 namespace/index/urlset、公开域、无重复、owner 边界 |
| 既有运行时回归 | 32 项 HTTP，18 个三语言/双尺寸/三脚本模式浏览器案例通过；无账号检查继续有效 |
| 试点公开数据 | 77 个 JSON HTTP 内容逐字段与源派生结果相等 |
| 试点页面 | 三语言 × 1440/390px 共 6 例：实际 h1、正文标题、canonical、robots、hreflang 和 JS/CSS 无失败 |

试点代表页为 `early-2027-december-closed-beta-faq`。现有 Sea 攻略没有符合长度门槛的日文正文：保留日文路径上的英文回退阅读，但这些详情不进日文子图；代表页日文 noindex、hreflang 仅真实可索引语言，未通过伪造翻译扩大索引。

源码、镜像、详情和摘要的同源工程验证不代表事实正确性审稿完成，也不代表所有 75 篇都做过三语言浏览器检查。未读取真实用户 CWV、GSC/GA4、生产错误率或成本指标。

精简验收记录：[S2.1 本地验证](../reports/content-integrity/s2-1-local-verification-2026-10-23.json)。本地原始日志、前后清单、差异失败复现及浏览器记录保留于受保护的 `.release-records/s2-content/` 和对应 rollout 记录，不纳入自动删除。

## 5. 下一批与发布门槛

建议 S2.2 按以下顺序继续，不新增 Worker：

1. 先解决 wuwa 到期码、skjh 镜像运营修订和 roco-cn 缺条/英文退役冲突；核验来源后统一六对输入，扩展生成/检查契约。
2. 为原神缺译详情统一阅读回退、noindex、canonical/hreflang 与独立 sitemap；不要只改 sitemap 或隐藏正文。
3. 补首页语言路径、post-test 展示及关于/联系/隐私/条款的元数据回归。
4. 源、预渲染与运行时回退清单闭合后，再按 S1 门禁安排一次有必要的 staging/生产候选验收；记录真实根图与四个 owner 子图的并集差分。

本批没有直接推广：六对内容漂移、上述三项 URL 边界、原神缺译策略、首页及基础元数据仍在待办。未改生产服务，也没有可宣称的新生产版本 UUID。继续保留 S1.6 已验收生产版本及其回滚/静态资源保护，不根据本地提交重写线上状态。

回退本批时使用上一完整代码与派生物组合，恢复原单根 urlset 只是工程退回而不是长期正确策略。未删除的内容、公开 URL 和游戏子图不需要批量重定向；任何生产回退仍需依照 S1 发布记录重新核实当前版本和授权。
