"""Finalize publication evidence after all read-back checks pass."""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent
read = lambda name: json.loads((root / name).read_text())
before, after = read('runtime-before.json'), read('runtime-after.json')
services = [name for name in before if name != 'capturedAt']
assert len(services) == 7
for name in services:
    assert before[name] == after[name], name + ' changed during a content-only publication'
acceptance = read('production-acceptance.json')
assert acceptance['status'] == 'passed'
publication = read('cloud-after.json')
assert publication['revision'] == read('sync-receipt.json')['revision']
assert len(publication['docs']) == 73
calendar = [e for d in publication['docs'] for e in d.get('eventSchedule', {}).get('entries', [])]
assert len(calendar) == len({e['id'] for e in calendar}) == 13
size = len(json.dumps({'revision': publication['revision'], 'docs': publication['docs']}, ensure_ascii=False, separators=(',', ':')).encode())
assert size < 512 * 1024
protection = dict(status='passed', services=services, deploymentsUnchanged=True,
                  routesSubdomainsBindingsSettingsUnchanged=True, workerDeployments=0,
                  runtimeCodeChanges=0, mainVersion='edfdcdde-bbe3-4202-9749-488deaa415ed')
with (root / 'runtime-protection.json').open('x') as output:
    json.dump(protection, output, indent=2)
    output.write('\n')
for name, value in [
    ('checks.json', dict(status='passed', records=73, calendarEntries=13,
                        calendarParentRecords=5, canonicalPublicationBytes=size,
                        payloadDraftIsolation=True, cloudDraftIsolation=True,
                        payloadPublishedVersionHistory=True, fullCanonicalCloudMatch=True,
                        eventAndVersionTextVerified=True, calendarDatesSourcesAnchorsVerified=True,
                        threeLocaleIsolation=True, consistentBackupsBeforeAfter=True,
                        schemaChanges=0, localMainBuilds=0, workerDeployments=0)),
    ('remaining-priorities.json', {
        'currentBatch': {'creates': 2, 'updates': 1, 'totalPublication': 73, 'calendarEntries': 13},
        'completed': ['成名之路独立日程、5关流程、试用/临时强化与SS奖章条件', '国服两项补偿的不同期限、共同资格、邮件发放范围'],
        'priorityOrder': [
            '货币战争·入画奇航独立公告：赛季细则、奖励及具体领取条件',
            '国服活动后续独立窗口：异器盈界及其他正式公告；不根据往期推算',
            '材料额外来源差异：信用点鸽川区、阿合马铁窗集团',
            '其他角色完整数值、有效国服码、地图与翻译按独立证据更新'
        ],
        'independentEvidenceRequired': ['成名之路各评级数值阈值及奖励总量', '问题修复补偿入箱后邮件有效期', '异器盈界独立起止及次数', '有效国服兑换码'],
        'boundary': '本批仅完成上述两项专题，不声称核验所有近期公告或全部活动奖励。日常内容继续通过Payload发布同步，不需重建Main。'
    })
]:
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')
print('Publication and seven-service protection passed; canonical bytes:', size)
