# R126：异环 Zero 身份核准与材料 held 补充

日期：2026-11-17

## 决定

- `zero` 的角色身份与展示关系已按官方角色导航证据核准：canonical identity 为 `zero`，展示变体为 `zero-male` 和 `zero-female`。这项角色关系批准与材料依赖批准分开；材料 ID、阶段和数量仍保持 held。
- `zero-male` 与 `zero-female` 是两个展示变体，材料关系不能自动选择其中一个。
- CMS 依赖图把 canonical 关系展开到两个展示 ID；应用材料读取也让两个页面读取同一个 `characterId: "zero"` 关系。
- 未知变体、缺少任一展示变体或其他游戏的相似字符串不会被模糊匹配。
- 没有删除 `zero`。官方证据支持其 canonical identity；CMS relation schema 和材料数据仍未被官方证据确认。
- 已删除 `v1-2-999-nights-guide.relatedCharacters` 中无角色记录、无批准来源的悬空 `iroi`，并同步 `apps/web/public/data/nte/raw-guides.json` 镜像。

## 材料门禁

27 个缺失材料继续保持 `held`，本轮把所有 441 个原始引用补进
[`nte-held-material-supplement.json`](nte-held-material-supplement.json)，包括角色、阶段、数量和 JSON 指针。
每条记录都保留 `approvedTarget: null`、`publishable: false` 和
`releaseCompatible: false`。没有把推测名称、阶段或数量写入
`raw-materials.json`。

## 核验结果

- CMS 依赖/角色预览/材料快照测试：10/10 通过。
- `services/content-cms` typecheck：通过。
- `apps/game-nte` typecheck：通过。
- `@gachia/data` typecheck：通过。
- NTE 内容测试：29/29 通过。
- `@gachia/data` Zero identity 测试：2/2 通过。

新的身份回执见
[`nte-identity-remediation.json`](nte-identity-remediation.json)。当前计划为
27 个材料问题、0 个角色问题，仍然 `executable=false`、`publishable=false`。
完整的可复核计划见 [`nte-dependency-review-plan.json`](nte-dependency-review-plan.json)，
其 `planKey` 为 `6fdf836a6ede5a9ad1dae39ebe81fc1b38979db867b6b171af8a1917af2390fa`。
因此本轮没有触发 CMS 构建或生产 Worker 发布。

