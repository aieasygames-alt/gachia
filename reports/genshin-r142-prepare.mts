import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { prepareGenshinCollectionReview } from '../services/content-cms/src/genshin-collection-review.ts'
import { readNteSourceIndex } from '../services/content-cms/src/nte-release-history.ts'
const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-collection-review-2026-11-21-r142')
const digest = (bytes: any) => createHash('sha256').update(bytes).digest('hex')
const read = (proof: any) => { const bytes = readFileSync(proof.path); assert.equal(digest(bytes), proof.pin); return JSON.parse(bytes.toString()) }
const save = (name: string, value: any) => { const file = path.join(root, name), bytes = JSON.stringify(value, null, 2) + '\n'; writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(bytes) } }
const parent = { path: path.join(repo, 'reports/genshin-structural-intake-2026-11-20-r141/delivery.json'), pin: '184ba587502a2d6ff96c43385c38a06e6a6fdf34f4b2fe32603a65a3d5cbe9d4' }
const delivery = read(parent), input = read(delivery.input), review = prepareGenshinCollectionReview(input)
assert.equal(review.stage.stageKey, delivery.stageKey)
const fresh = await readNteSourceIndex(input.sourceIndex)
assert.equal(fresh.allOwnersCurrent, true); assert.equal(canonical(fresh.sources), canonical(input.active))
save('source-read.json', { sourceIndex: input.sourceIndex, allOwnersCurrent: fresh.allOwnersCurrent, sources: fresh.sources.map(({sourcePath, sha256}: any) => ({sourcePath, sha256})), observedAt: new Date().toISOString() })
const decisions = review.items.map(item => {
 const { entry } = JSON.parse(item.candidateText)
 let note = `${entry.key}: 已逐项核对固定来源、完整 O/A/CMS 差异和合并结果，接受导出候选。`
 if (entry.family === 'character-materials') note += ' 按 R136 固定数值 ID 配方证据核对整组材料数组与数量；两项改名使用 R135 数值角色 ID 显式迁移，不按索引配对材料。'
 else if (entry.family === 'characters') note += ' 按 R137 三语角色及双语技能/命座证据核对身份、版本和声优；R138 已补齐规范图片，夜魂及特殊跳跃均保留；配装、配队和评价保持空白。'
 else note += ' 按 R136 材料数值 ID 与双语名称核对定义及来源；特产沿用 R137 资料 API 展示 rank=1，不称官方一星认证或把游戏表排序 rank 当稀有度。'
 note += ' 保留 O 与精确发布 A 恢复，不清除 hold，不授予正式发布资格。'
 return { revisionKey: item.revisionKey, action: 'accept-export', note }
})
const packet = save('review-decisions.json', { runKey: review.runKey, decisions })
save('preparation.json', { parent, input: delivery.input, sourceIndex: input.sourceIndex, cmsBefore: JSON.parse(readFileSync(path.join(root, 'cms-capture-proof.json'),'utf8')).proof, runKey: review.runKey, stageKey: review.stage.stageKey, decisions: packet, items: review.items.length, alreadySavedDrafts: review.manifest.alreadySavedDrafts.length, contentRecordWrites: 0 })
