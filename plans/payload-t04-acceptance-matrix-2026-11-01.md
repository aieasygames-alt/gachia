# T04 剩余验收矩阵与执行顺序

日期：2026-11-01。本文保留R9 shadow读侧验收矩阵，不是当前首发执行顺序；合成shadow输出仍不可发布。当前状态见[R27审计](../reports/payload-completion-audit-2026-11-03-r27/README.md)和[V1有限完成计划](payload-v1-completion-2026-11-03.md)：既有指南文字先复用旧reader/双owner封存发布，真实云生命周期未验，全请求releaseKey与完整Snapshot激活仍未完成，不用本地持续发布覆盖下表全范围缺口。

## 判定层次

单元协议通过、合成真实应用 HTTP 通过、真实内容迁移通过、Worker/生产接管通过是四个不同层次。
R7 达到 Main/NTE 分割归属及 Genshin 中文合成 plain-text 切片的真实应用 HTTP 层次；R9 增加合成浏览器跳转/返回、Flight、显式 prefetch 协议和 A/B 重启换版。真实旧源采样与合成 shadow 分开，不代表真实 CMS DTO parity。
不使用一个笼统的完成百分比；每个 owner × 类型 × 语言 × 消费者 × 状态必须绑定证据。

## Owner 与路径矩阵

| Owner | 代表路径 / 责任 | 当前状态 | 下一项 |
|---|---|---|---|
| genshin | `/zh/genshin/characters/index` 合成 fixture | 六类 HTTP 通过 | 真实类型、多语言、RSC/navigation |
| nte | `/zh/nte/characters/index`；items 列表也归 NTE | 合成六类 HTTP 及与 Main 分割归属通过 | 真实类型/语言、items 列表与详情依赖对账 |
| main | `/zh/nte/items/ore`；无独立 owner 的其余 scope | 实际 Main Next 合成六类 HTTP 通过 | 真实 items 语义、其他 scope、RSC/navigation |
| lvmeng | 中文独立页面，不能制造 en/ja 可索引资格 | 未接线 | 真实语言策略与特殊区块 |
| azur-promilia | 独立页面/详情 | 未接线 | 类型能力、资产与缺译 |

路径归属以 `packages/core/route-ownership.json` 和 `route-ownership.ts` 为源码依据，
不是线上 bindings 的证明。scope 不等于 owner：一个 NTE Snapshot 可同时包含 Main 和 NTE 的页面。
本批第四任务只新增 Main/NTE 分割归属代表链路，不能据此覆盖全部 Main scope。

## 消费者矩阵

| 消费者 | 关闭标准 | 当前边界（R9） |
|---|---|---|
| body | HTML 实际文本与已验证 Snapshot 一致，错误 owner 不可读 | Main/NTE 分割归属及 Genshin 中文合成通过 |
| metadata | 实际 title/robots 来自同一请求 context，非仅 header 相等 | 同上 |
| JSON-LD | 实际内容、版本、链接与 body 一致，安全序列化 | 同上 |
| sitemap | 只列当前 owner 的同版本合格路径，public sitemap 不泄漏 shadow | 影子 XML 通过，真实索引资格未交接 |
| media | 请求路径、字节/MIME/摘要、来源与权利回执逐项绑定 | 仅合成 SVG；真实 10 项 runtime 不等于权利 |
| cache | 实际策略/版本化键，跨请求和跨版本不串读 | no-store 通过；持久缓存/保留未实现 |
| navigation/search | 同版本依赖闭包、无越 owner/语言失效链接 | 同 owner/release 合成 Next Link 已验；真实依赖与 search 待实施 |
| RSC/navigation | Flight、预取、客户端跳转及失败恢复不混版本 | 合成三 owner × 双版本浏览器跳转/返回、Flight 错误帧及显式 prefetch 协议已验；自动预取缓存矩阵、移动端、真实内容与已打开客户端撤回仍待验 |

## 内容、语言和状态

- 类型全集由第二任务账本枚举；identity-only、具名区块、派生读侧代码和页面内联事实分别记录，不伪造通用文章。
- zh/en/ja 分别记录实际字段 presence、空值与来源；注册表语言不等于内容完整或可索引，缺译不自动回退。
- 正常：完整制品才能输出；同一请求 context ID 一致，不同请求不复用可变上下文。
- 缺译/hold/撤回/过期：资格门禁阻断，不能以旧公开正文假装新版本；真实类型运营工作流待验收。
- 缺 Snapshot/部分 ReleaseMap/摘要篡改/错误 owner：任一依赖缺失时整体拒绝；留存实际错误响应。
- CMS 离线：目前 shadow 拒绝输出；未来公开读侧须独立读取已保留发布制品，不能把该拒绝策略当生产可用性通过。
- 恢复/版本切换：同版本恢复不改变身份；新版本必须重新完整验证，混合版本拒绝。并发激活/传播窗口另验。
- opt-in 关闭/公网 Host：shadow 404，公开路径继续原读侧；不得将 shadow 发布到公网。

## 本批 Main/NTE 代表链路关闭标准

1. 同一 NTE Snapshot 含 `/zh/nte/characters/index`（nte）及 `/zh/nte/items/ore`（main），由真实路由策略推导。
2. CMS、Main、NTE 同时 loopback；可额外保留 Genshin 回归服务。实际正文、metadata、JSON-LD、XML、SVG、cache 输出取证。
3. 正确 owner 可读，错误 owner 不可读；影子 sitemap 只列本 owner 路径；Main 元数据不得继承公众可索引/生产媒体声明。
4. 完整引用、部分失败、错误 key、关闭门禁和恢复有真实 HTTP 证据；public 源不切换。
5. 单元测试、类型检查、适用本地 build 与证据摘要核对通过，未执行项如实保留。

## 生产保留需求（交给 T05，不在本批偷偷实现）

- CMS 编辑服务故障时，已激活且未被紧急撤回的发布制品仍可读。
- 明确保留时间/数量、最大传播窗口、撤回优先级、回退授权、缓存键和 GC 引用保护；数值需容量/SLO 决策，不虚构。
- 内容回退、数据库恢复和 Worker 回退是不同操作；激活 CAS、跨 owner 能力核验和失败对账属于后续 T06/P4。

已完成的 R7 执行顺序：本矩阵 → 可重跑全类型/媒体账本 → T05 本地 ADR 第一版 → Main/NTE 代表链路。
R9 已按上述下一轮顺序推进真实语义切片、权利/责任缺口台账、合成 RSC 与旧源采样、本地底层运行时实验。下一步收口字段兼容政策与真实凭据后接 typed shadow，补 PG/Payload adapters 实验；详见 [R9 状态](../reports/payload-status-audit-2026-10-30/comprehensive-audit-2026-11-01-r9.md)，完整关闭条件仍沿用 R8。

## 本批执行记录

矩阵与账本/ADR 已按顺序建立。Main/NTE 分割归属采用同一 NTE Snapshot，Genshin 保留回归；实际四个服务同时 loopback。
最终结果与构建/测试证据统一见 `reports/payload-next-phase-2026-11-01/README.md`。
本批关闭标准中的代表性 HTML/metadata/JSON-LD/sitemap/合成媒体/cache/错误 owner 子项完成后，不改变上表真实内容、其他 owner、RSC 与生产保留的待验状态。
