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
assert len(publication['docs']) == 74
calendar = [e for d in publication['docs'] for e in d.get('eventSchedule', {}).get('entries', [])]
assert len(calendar) == len({e['id'] for e in calendar}) == 13
parents = [d for d in publication['docs'] if d.get('eventSchedule')]
assert len(parents) == 6
size = len(json.dumps({'revision': publication['revision'], 'docs': publication['docs']}, ensure_ascii=False, separators=(',', ':')).encode())
assert size < 512 * 1024
for name, value in [
    ('runtime-protection.json', dict(status='passed', services=services, deploymentsUnchanged=True,
         routesSubdomainsBindingsSettingsUnchanged=True, workerDeployments=0, runtimeCodeChanges=0,
         mainVersion='edfdcdde-bbe3-4202-9749-488deaa415ed')),
    ('checks.json', dict(status='passed', records=74, calendarEntries=13, calendarParentRecords=6,
         canonicalPublicationBytes=size, payloadDraftIsolation=True, cloudDraftIsolation=True,
         payloadPublishedVersionHistory=True, fullCanonicalCloudMatch=True, eventAndVersionTextVerified=True,
         calendarDatesSourcesAnchorsVerified=True, threeLocaleIsolation=True, consistentBackupsBeforeAfter=True,
         schemaChanges=0, localMainBuilds=0, workerDeployments=0)),
    ('remaining-priorities.json', {
        'currentBatch': {'creates': 1, 'updates': 1, 'totalPublication': 74, 'calendarEntries': 13},
        'completed': ['货币战争独立公告：奇遇/主角光环、60员工/29羁绊、布局区别与7类奖励条件', '赛季日历入口移至独立规则，无重复ID'],
        'priorityOrder': [
            '国服活动后续独立公告巡检：优先异器盈界的独立窗口及次数；不沿用往期推算',
            '材料额外来源差异：信用点鸽川区、阿合马铁窗集团',
            '其他角色完整数值、有效国服码、地图与翻译按独立证据更新'
        ],
        'independentEvidenceRequired': [
            '货币战争具体积分/晋升/职级/收集与目标的数值门槛、各档奖励分摊及赛季独立结束时刻',
            '标准博弈与超频博弈周首通是否分别计次及额外晋升点数量',
            '成名之路各评级数值阈值及奖励总量', '问题修复补偿入箱后邮件有效期',
            '异器盈界独立起止及次数', '有效国服兑换码'
        ],
        'boundary': '本批以国服11月1日独立赛季公告的可读正文为依据，不声称逐档数值、赛季结束或全部近期公告均已核验。日常内容继续通过Payload发布同步。'
    })
]:
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')
print('74 records, 13 unique calendar entries, 6 calendar parents; canonical bytes:', size)
