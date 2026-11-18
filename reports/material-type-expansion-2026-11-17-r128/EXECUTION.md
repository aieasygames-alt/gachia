# R128：删除未获官方证实的异环材料引用

日期：2026-11-17

## 执行决定

用户已明确授权：27 个材料在官方来源未证实的，直接从公开异环角色材料关系中删除。此次删除不把 Game8 词法候选、推测名称或推测数量写回公开数据，也不删除历史 held 台账。

## 删除范围

- 材料 ID：27 个，完整列表见 `nte-unverified-material-deletion.json`。
- 每个镜像删除 441 个 JSON 材料引用，共删除 882 个镜像条目。
- 同步文件：
  - `packages/data/games/nte/raw-character-materials.json`
  - `apps/web/public/data/nte/raw-character-materials.json`
- 删除由未获官方证实的材料 ID 精确匹配完成；没有模糊匹配。
- 删除后只保留 `elite-hunter-guide` 这一项已存在于 `raw-materials.json` 的材料关系。
- 删除后变为空的升级阶段移除；`skillMaterials` 保留为空数组以满足 NTE 类型合同。

## 审计依据

- 历史台账：`reports/material-type-expansion-2026-11-17-r126/nte-held-material-supplement.json`
- 官方来源审计：`reports/material-type-expansion-2026-11-16-r125/official-material-source-audit.json`
- 原始镜像 SHA256 和删除后 SHA256：见 `nte-unverified-material-deletion.json`。

## 删除后不变量

- `remainingMissingMaterials: 0`
- `remainingDanglingCharacters: 0`
- 两份镜像内容一致。
- R126 held 台账、R125/R127 来源与发布回执保留，用于可追溯性。

## 后续

本轮完成后进入按内容类型扩展所有游戏：先重建 NTE 材料依赖与公开消费者对账，再把已验证的数据读取模式扩展到其他独立游戏；只有存在完整材料定义和消费者证据的关系才进入可发布集合。

## 发布边界

R128 是数据清理和依赖门禁，不是 CMS 内容发布，也没有新的 NTE Worker deployment。正式发布仍需下一批按现有 R127 单 Worker 流程执行候选、恢复、云预览、正式推广和公网验收。

## 下一项：跨游戏材料类型审计

已生成 `all-games-material-dependency-audit.json` 作为跨游戏门禁输入。当前 13 个有材料定义的游戏中，12 个没有角色材料悬空引用；原神仍有 74 个角色材料 ID 不在其 `raw-materials.json`，因此原神材料类型扩展暂缓，不能用异环删除决定替代原神来源核验。异环已进入 ready 状态，下一步按独立 Worker 的公开 JSON、搜索切片、Main 聚合消费者逐游戏验收。
