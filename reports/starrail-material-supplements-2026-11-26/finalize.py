# -*- coding: utf-8 -*-
"""Record content publication and unchanged production runtime evidence."""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent
read = lambda name: json.loads((root / name).read_text())
before, after = read('runtime-before.json'), read('runtime-after.json')
services = [name for name in before if name != 'capturedAt']
assert len(services) == 7
for name in services:
    assert before[name] == after[name], name + ' changed during the content-only publication'
assert read('production-acceptance.json')['status'] == 'passed'
assert read('draft-cloud-isolation.json')['status'] == 'passed'
assert read('draft-cloud-isolation.json')['changedDraftsNotPublic'] == 5
assert read('local-publication.json')['status'] == 'published_and_verified'
assert len(read('local-publication.json')['records']) == 5
assert all(row['versionCount'] >= 2 for row in read('local-publication.json')['records'])
assert read('backup-before.json')['integrity'] == read('backup-after.json')['integrity'] == 'ok'
publication = read('cloud-after.json')
assert publication['revision'] == read('sync-receipt.json')['revision']
assert len(publication['docs']) == 75
old = {row['slug']: row for row in read('cloud-before.json')['docs']}
new = {row['slug']: row for row in publication['docs']}
batch = read('batch.json')
changed = {patch['slug'] for patch in batch['updates']}
assert not batch['creates'] and len(changed) == 5
assert old.keys() == new.keys()
assert {slug for slug in old if old[slug] != new[slug]} == changed
for slug in new:
    assert old[slug]['sources'] == new[slug]['sources'], 'Public citation entry points changed'
    assert old[slug].get('eventSchedule') == new[slug].get('eventSchedule')
for slug in changed:
    assert old[slug]['facts'][1] == new[slug]['facts'][1], 'Cross-verified source list changed'
calendar = [e for d in publication['docs'] for e in d.get('eventSchedule', {}).get('entries', [])]
assert len(calendar) == len({e['id'] for e in calendar}) == 15
parents = [d for d in publication['docs'] if d.get('eventSchedule')]
assert len(parents) == 7
size = len(json.dumps({'revision': publication['revision'], 'docs': publication['docs']}, ensure_ascii=False, separators=(',', ':')).encode())
assert size < 512 * 1024
for name, value in [
    ('runtime-protection.json', dict(status='passed', services=services, deploymentsUnchanged=True,
         routesSubdomainsBindingsSettingsUnchanged=True, workerDeployments=0, runtimeCodeChanges=0,
         mainVersion='edfdcdde-bbe3-4202-9749-488deaa415ed')),
    ('checks.json', dict(status='passed', records=75, calendarEntries=15, calendarParentRecords=7,
         canonicalPublicationBytes=size, payloadDraftIsolation=True, cloudDraftIsolation=True,
         payloadPublishedVersionHistory=True, fullCanonicalCloudMatch=True, eventAndVersionTextVerified=True,
         calendarDatesSourcesAnchorsVerified=True, threeLocaleIsolation=True, consistentBackupsBeforeAfter=True,
         fiveMaterialDetailsAndIndexVerified=True, tenRelatedConesBidirectional=True,
         exactlyFiveContentUpdates=True, otherSeventyRecordsUnchanged=True,
         verifiedRouteListsAndPublicSourcesUnchanged=True,
         schemaChanges=0, localMainBuilds=0, workerDeployments=0)),
    ('remaining-priorities.json', {
        'currentBatch': {'creates': 0, 'updates': 5, 'totalPublication': 75, 'calendarEntries': 15},
        'completed': ['核清阿合马铁窗集团为单个商店名称；四种材料补充同站商店入口与地点、店主、交易物品，明确标单站资料', '信用点补充BWIKI花萼分类差异，区分主产与附带信用点，未将争议地点纳入交叉核验入口'],
        'priorityOrder': [
            '其他角色完整数值与材料：优先核查当前跃迁相关角色，逐个建立完整证据后接入',
            '有效国服兑换码、地图与翻译按独立证据更新',
            '取得新的独立材料/商店证据时再核准鸽川区、绘世学院及阿合马商品数量，不重复发布同站核验结论',
            '获得新的正式公告线索时补充异器盈界及其他活动独立窗口，不反复沿用往期推算'
        ],
        'independentEvidenceRequired': [
            '鸽川区、绘世学院当前国服花萼类型及主产/附带信用点',
            '阿合马四种材料的第二独立来源，以及价格、每日限购、当前库存、解锁任务',
            '异器盈界独立起止及次数；本轮所查范围未获得，不表示全网不存在公告',
            '无名勋礼各等级完整奖励表、自选光锥具体名单、燃料数量与当前价格',
            '货币战争各档数值门槛、奖励分摊及赛季独立结束时刻',
            '标准博弈与超频博弈周首通是否分别计次及额外晋升点数量',
            '成名之路各评级数值阈值及奖励总量', '问题修复补偿入箱后邮件有效期', '有效国服兑换码'
        ],
        'boundary': '本轮完成材料来源文字与证据分级修订，未宣称取得第二独立商店来源或解决信用点全部冲突。后续转到其他角色；新证据出现时再补材料与活动缺口。'
    })
]:
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')
print('75 records, 15 unique calendar entries, 7 calendar parents; canonical bytes:', size)
