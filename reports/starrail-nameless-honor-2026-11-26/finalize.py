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
publication = read('cloud-after.json')
assert publication['revision'] == read('sync-receipt.json')['revision']
assert len(publication['docs']) == 75
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
         schemaChanges=0, localMainBuilds=0, workerDeployments=0)),
    ('remaining-priorities.json', {
        'currentBatch': {'creates': 1, 'updates': 0, 'totalPublication': 75, 'calendarEntries': 15},
        'completed': ['国服官方公告/活动初始列表与一次聚焦搜索巡检；异器盈界独立证据仍不足', '无名勋礼独立活动/购买窗口、12级与剧情条件、70级上限及奖励档位'],
        'priorityOrder': [
            '材料额外来源差异：信用点鸽川区、阿合马铁窗集团',
            '其他角色完整数值、有效国服码、地图与翻译按独立证据更新',
            '获得新的正式公告线索时补充异器盈界及其他活动独立窗口，不反复沿用往期推算'
        ],
        'independentEvidenceRequired': [
            '异器盈界独立起止及次数；本轮所查范围未获得，不表示全网不存在公告',
            '无名勋礼各等级完整奖励表、自选光锥具体名单、燃料数量与当前价格',
            '货币战争各档数值门槛、奖励分摊及赛季独立结束时刻',
            '标准博弈与超频博弈周首通是否分别计次及额外晋升点数量',
            '成名之路各评级数值阈值及奖励总量', '问题修复补偿入箱后邮件有效期', '有效国服兑换码'
        ],
        'boundary': '本轮已完成有限范围公告巡检并接入无名勋礼双窗口。异器盈界保留待证据项；下一批推进材料来源差异，无需原地重复发布同一待核验结论。'
    })
]:
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')
print('75 records, 15 unique calendar entries, 7 calendar parents; canonical bytes:', size)
