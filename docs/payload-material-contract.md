# 跨游戏材料契约 v1

状态：**保真适配器已接入显式 review-v2-material 的本地 held 草稿与材料三方更新，未接入发布**。第九批预览本身仍不授予接收权限；实际接收通过第十批审核门禁。实现位于 `services/content-cms/src/material-contract.ts`，版本 `material-contract-v1`。这是 Payload 统一内容模型的共享类型，不为每个游戏复制一套集合。

## 输入与身份

只接受 `legacy-records-v2` 中的 materials 候选，来源必须是 `packages/data/games/<gameKey>/raw-materials.json`。核验候选 revision 摘要、hold、legacyId 和 stableKey；不能用改名后的武器或未知内联模块冒充材料。

身份仍为 gameKey + materials + 原始 id。原始 type、id 不 trim、不大小写转换、不改写 slug，不改变既有路由。类型化投影绑定原始 revision，不新增候选修订，也不改变历史 reviewKey。

## 字段契约

| 源字段 | 类型化字段 | 校验与保留方式 |
|---|---|---|
| id | id | 非空字符串，原样保留 |
| type | type | 非空字符串；游戏内分类，不强制跨游戏统一枚举 |
| rarity | rarity | 1–5 的整数，不接受数字字符串、不截断；不代表不同游戏稀有度含义相同 |
| typeZh | typeLabelZh | 可选字符串或 null，不用于覆盖 type |
| stackLimit | stackLimit | 可选字符串或 null；可以是描述，不推断为数值 |
| name / nameEn / nameJa | translations[].name | 无后缀为中文；中文 name 必须非空，其余可缺失、空字符串或 null |
| source / sourceEn / sourceJa | translations[].source | 获取途径描述，**不是可信来源证明** |
| description / notes（及 En、Ja） | translations[].description / notes | 可选字符串或 null；不渲染 HTML、不自动判断可信度 |
| acquisition / uses / conversions（及 En、Ja） | translations[] 同名字段 | 有序字符串数组或 null；保留空数组、重复条目及顺序，不自动合并语言条目 |

不做语言 fallback；缺字段、null、空字符串、空数组是不同状态。当前真实数据需要的扩展字段通过显式类型表达，不使用任意 JSON 字段绕过建模。新字段、未知语言后缀、对象替代文本、数字替代堆叠说明等均阻断，必须评审契约再升级。

## 保真与校验

`parseMaterial` 完成原始记录到类型化材料的转换，`materialSource` 反向生成源字段并重新校验类型。`previewMaterial` 要求反向结果与原始 JSON canonical 相等，确保没有丢掉字段。反向投影也拒绝重复语言、未知 typed 字段及非法语言。

转换成功仅证明结构和字段保真，不证明事实正确、翻译准确、素材可授权或内容可发布。所有预览 hold=true、publishable=false、draftIntakeEnabled=false。

## 覆盖与接入门槛

第九批真实候选副本中，12 个非空游戏/地区 scope 的 537 条材料全部通过；空材料文件不据此宣称已验证真实记录。完整覆盖矩阵见 [第九批证据](../reports/payload-migration-2026-10-29/batch9-contract-coverage.json)。

以下接入门槛中，1–4 已在第十批本地合成数据/真实候选副本范围验证；不代表真实内容获批或运营体验验收完成。第 5 项仍未实施：

1. 为材料建立显式 Payload 字段、权限、不可变身份、hold 与版本校验；不能把 source 描述映射为证据签名。
2. 为新类型采用显式版本化审核策略/新审核批次，保留旧 review-v1 的历史结果。不得直接修改 `draftKind` 令旧批次自动变绿或失去可验证性。
3. 扩展三方合并字段及冲突粒度，保留数组顺序、多语言缺失和来源头；旧比较的版本校验不应随新字段静默变化。
4. 用多个游戏的材料执行接收、编辑、来源更新、冲突、拒绝、重试、回滚集成测试，再启用接收入口。
5. Worker 消费仍需不可变公开 DTO、Snapshot/ReleaseMap 和独立发布验收。契约预览不改变网站来源。

最新实施证据见[第十批报告](../reports/payload-migration-2026-10-29/batch10.md)。原迁移库未升级，v2 暂存仅在验证副本进行。

## 原生表示层补充（第十二批）

材料 contract 的原始字段 null/空值/缺失仍严格区分。Payload 编辑表示层则由显式 state 定义 presence：文本 state=value + 空 Text 槽解码为空字符串，即使 Payload 将未编辑的输入保存为 null；state=null 保留 null，absent 省略。这样无需用户先输入再清空。实际契约校验仍拒绝必填空名称/类型、非法数字或错误值槽。参见[第十二批验证](../reports/payload-status-audit-2026-10-30/batch12.md)。
