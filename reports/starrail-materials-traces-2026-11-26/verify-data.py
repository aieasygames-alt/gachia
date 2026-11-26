# -*- coding: utf-8 -*-
import pathlib,json,subprocess,collections
r=pathlib.Path(__file__).resolve().parent;repo=r.parents[1]
baseline=json.loads((r/'editor-sync.json').read_text())['baselineHEAD']
paths=['packages/data/games/starrail/raw-materials.json','apps/web/public/data/starrail/raw-materials.json']
before=json.loads(subprocess.check_output(['git','show',baseline+':'+paths[0]],cwd=repo,text=True));after=json.loads((repo/paths[0]).read_text());rep=json.loads((r/'compatibility-repairs.json').read_text());slugs={x['id'] for x in rep}
assert len(before)==68 and len(after)==83
assert (repo/paths[0]).read_bytes()==(repo/paths[1]).read_bytes()
assert [x for x in before if x['id'] not in slugs]==[x for x in after if x['id'] not in slugs]
for x in rep:assert x['before']==next((y for y in before if y['id']==x['id']),None) and x['after']==next(y for y in after if y['id']==x['id'])
assert sum(x['before'] is None for x in rep)==15
assert next(x['after'] for x in rep if x['id']=='credit')['type']=='currency'
for locale in ['zh','en','ja']:
 p=f'apps/web/public/data-manifest/search-{locale}.json';a=json.loads((repo/p).read_text());b=json.loads(subprocess.check_output(['git','show',baseline+':'+p],cwd=repo,text=True));assert a.pop('starrail')!=b.pop('starrail');assert a==b
expected=json.loads((r/'expected-publication.json').read_text())['docs'];size=len(json.dumps({'revision':1795616809787,'docs':expected},ensure_ascii=False,separators=(',',':')).encode());assert len(expected)==71 and size<512*1024
(r/'compatibility-data-acceptance.json').write_text(json.dumps({'status':'passed','recordsBefore':68,'recordsAfter':83,'correctedStableIds':['credit'],'addedIds':sorted(x['id'] for x in rep if x['before'] is None),'currencyTypePreserved':True,'unrelatedMaterialsUnchanged':True,'mirrorExact':True,'otherGameManifestsUnchanged':True,'publishedChineseAfter':71,'compactPublicationUTF8Bytes':size,'byteLimit':512*1024},indent=2)+'\n')
reads=json.loads((r/'source-reads.json').read_text());assert len(reads)==16 and all(x['status']==200 for x in reads)
print('Source transports',collections.Counter(x['transport'] for x in reads));print('Expected records',len(expected),'bytes',size)
old=json.loads((r.parent/'starrail-materials-enemies-2026-11-25/remaining-priorities.json').read_text())
old.update({'status':'next_priorities','currentBatchMaterialIds':[x['sourceId'] for x in json.loads((r/'material-registry-new.json').read_text()).values()],'remainingMaterialCount':0,'remainingMaterials':[],'priorityOrder':['国服活动结构化日历及独立活动窗口','材料额外来源差异持续核验，不影响当前已印证来源发布','其他角色数值、有效国服兑换码、地图与翻译依独立证据更新'],'capacityPlanning':{'currentPublicationAfterThisBatch':71,'perLocaleLimit':100,'totalLimit':300,'remainingChineseSlots':29,'requestBodyBytesLimit':512*1024,'completePublicationUTF8Bytes':size},'independentEvidenceStillRequired':['异器盈界独立日程','有效国服兑换码','信用点拟造花萼【鸽川区】','此前材料BWIKI独有的阿合马铁窗集团来源','其他角色倍率与材料数量'],'boundary':'此前34种关联候选已接入对应材料/信用点详情，仅发布交叉印证的来源。并非全量星铁材料库已审计，额外来源与商店即时库存、合成成本仍按正文边界独立核验。'})
(r/'remaining-priorities.json').write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
