# 原神有界导入：O / A / 候选与真实 CMS 草稿

R140 从 R139 正式来源接续，对账真实 CMS 的不可变导入原件 O、正式来源 A、R137 完整候选及 R138 图片补丁。此合同生成有界审核包；现有材料名称/稀有度的兼容子集已进入真实 CMS held 草稿。审核包和草稿都不是网站发布资格。

## 输入与合并

- `sourceIndex`、`candidateProof`、`cmsProof` 分别固定正式来源、候选和真实 CMS 捕获；调用方读取时核验文件 pin。
- `active` 保留完整的 115 份来源。`candidateBase` 是 R135 身份修正之前、与 A 一致的三份原神来源；R137 的关系输入已包含 R135 修正，不能当作 A。
- `candidate` 仅允许原神 `raw-materials.json`、`raw-character-materials.json`、`raw-characters.json`。其他来源不接受覆盖。
- `cms` 为三个来源的全部真实记录，保留 `sourceRecord.original`、原始摘要、当前编辑值、状态、ID 和 `updatedAt`。缺失、重复、孤立记录都阻断。
- 先合并 `merge(O, A, CMS当前值)`，再合并 `merge(A, 上一步结果, 候选)`。独立编辑保留；同字段竞争产生冲突；数组按整体处理，避免重排后按索引错误配对。
- 关系 ID 迁移必须显式列出旧 ID、新 ID 和固定证据。当前仅 `sara → kujou-sara`、`shinobu → kuki-shinobu`；未登记的消失、碰撞、链式迁移和新增关系成员均阻断。

## 本批结果

真实 CMS 稳定双读取得 2,880 条记录，其中三个原神来源 390 条。候选产生 221 条变更提案，另保留 255 条原有记录。分包为 129 条材料、90 条角色材料关系、2 条新角色。合并后 269 个材料、117 个角色、5,490 次材料引用，依赖问题为零。

胡桃 CMS 原件 O 与当前值不同，当前值与 A 一致；它的角色文本保持，不制造 `O=A`。其他来源直接使用 A，保留异环文本、Zero canonical、27 个未证实材料的删除状态和攻略增量。磁盘 checkout 与 A 有 11 份差异：历史已记录的 10 份，加上 R135 有意修改的原神关系文件。

`prepareGenshinIntakeBatch` 每包仅接受 1–200 个显式 key。每条记录携带当前 CMS 原件、候选、字段差异、所需审核类别和恢复前态；新实体恢复动作仅描述移除尚未发布的暂存实体，不能当作网站撤回授权。包固定 `hold=true`、`_status=draft`、`publishable=false`，选择参数不能提供值、批准或激活开关。

`prepareGenshinExistingMaterialDrafts` 再以现有 `validateUnifiedRecord` 逐条校验，只放行已有材料的兼容更新。本批为 42 条，合计 30 个中文名称、3 个英文名称、22 个稀有度字段。真实 CMS API 写入 `draft=true, hold=true`；每条有写前 intent、写后读回和结果，原始 provenance 不变。其余 179 条保留在包中：3 条涉及受保护来源字段的已有材料、84 条新材料、90 条关系、2 条新角色。

## 命令与接续

在 `services/content-cms` 执行只读包生成命令：

```sh
pnpm genshin:intake plan \
  --input /absolute/intake-input.json --input-pin SHA256 \
  --output /absolute/new-plan-directory

pnpm genshin:intake batch \
  --input /absolute/intake-input.json --input-pin SHA256 \
  --plan /absolute/plan.json --plan-pin SHA256 \
  --selection /absolute/selection.json --selection-pin SHA256 \
  --output /absolute/new-batch-directory
```

选择文件仅含 `{"keys":["materials:..."]}`。命令核验 pin、复算整个计划，输出目录必须不存在；不连接 CMS、云或数据库。真实 CMS 的一次性写入入口及逐条日志在 `reports/genshin-r140-installed-intake.mts` 和 R140 回执目录，不能重新运行 `prepare` 或重放 PATCH。其 `verify` 动作仅登录并读取内容，校验已经完成的写入。

原始输入/fixture 记录的是写入之前的状态。写入后 `updatedAt` 已变化，因此旧审核包不能再作为新的写入前提。下一批先读取 R140 `installed-intake-result.json` 和 `cms-after.json.gz`，与当前真实 CMS 核对后重新生成计划。正式来源继续 R139，不能推进到本地候选。

## 剩余资格

1. 为其余 179 条建立受保护来源、关系 ID 迁移与新实体的受控安装导入合同，保留 O、现有编辑和恢复前态；不绕过现有 CMS hooks。
2. 分别审核数值/分类、完整阶段配方、显式关系迁移和新实体。42 条草稿仍需审核，不能因字段可写就标记为正式发布。
3. 将完整集合接入页面、公开 JSON、搜索、主站聚合及派生摘要的消费者校验。候选依赖闭合后才能接通原神单 Worker 内容发布。
4. 兼容恢复必须明确保留旧 A 的历史依赖缺口与旧 URL/新 URL 行为；不能强迫旧 A 满足新候选的零缺口门禁，也不能跳过恢复验收。

R139 的代码和图片已经上线。本合同不重复图片上传、49 项特产取证、1,350 阶段配方比对或原神代码部署；绿梦维持中文范围。
