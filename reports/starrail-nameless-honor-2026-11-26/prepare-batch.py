"""Prepare one reviewed event and its two distinct announcement windows."""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent
before = json.loads((root / 'cloud-before.json').read_text())['docs']
source = 'https://www.miyoushe.com/sr/article/79401975'
eligibility = '开拓等级≥12级，且完成「雅利洛-Ⅵ」—「她等待刀尖已经太久」'
start = {'kind': 'after-update', 'date': '2026-11-11', 'version': '4.7'}
facts = [
    '活动窗口与领奖截止\n2026/11/11 4.7版本更新后至2026/12/21 03:59。购买关闭后仍可完成勋礼任务并领取奖励，但须留意本期活动结束时间；不要套用其他活动12月23日03:59或版本结束时刻。',
    '参与条件：等级与剧情均需满足\n开拓等级≥12级，且完成开拓任务「雅利洛-Ⅵ」—「她等待刀尖已经太久」。本公告将剧情完成列为参与条件，不是仅供参考的建议剧情顺序。',
    '自动解锁的无名客赠礼\n「无名勋礼」开启后，「无名客的赠礼」自动解锁。完成本周任务、本期任务可获得经验、提升勋礼等级；达到指定等级可获取星轨通票、自塑尘脂、命运的足迹等奖励。自动解锁不等于全部等级奖励立即到账。',
    '等级上限与任务刷新\n本期勋礼等级上限为70级，达到上限后不能继续通过任务获取经验。本周任务每周一04:00（服务器时间）刷新；这里不换算成设备时区，也不把本期任务写成同样每周刷新。',
    '无名客的荣勋：付费档位奖励\n解锁「无名客的荣勋」后可立即获得星琼×680。提升勋礼等级还可额外获得光锥碎忆×1、星轨专票×4、自选4星光锥、变量骰子×1、自塑尘脂×2、遗器残骸和通用命途材料「梦之珠泪」等奖励。除立即获得的星琼外，等级奖励仍需达到对应等级，不能全部列为免费或解锁即领。',
    '无名客的奖章：额外等级与奖励\n解锁「无名客的奖章」后，除荣勋所列奖励外将立即提升10级勋礼等级，还可获得头像「虚照•巡游」、头像「星神★阿哈•巡游」、光锥碎忆×1、星琼×200及燃料奖励。公告本段没有列出燃料数量，本条不补猜测。',
    '已解锁荣勋的升级方式\n已解锁「无名客的荣勋」的开拓者，如有需要，可通过购买「荣勋授章」升级至「无名客的奖章」。这是一项付费升级方式，不是完成任务后自动升级；当前购买资格和价格按游戏内显示核对。',
    '购买窗口比活动提前一小时关闭\n2026/12/21 02:59关闭本次「无名客的荣勋」「无名客的奖章」「荣勋授章」购买。购买关闭后仍可完成勋礼任务并领取奖励，活动窗口至当日03:59；这两个时刻分别对应购买和活动结束，不能互相替代。',
    '特殊重复购买的处理\n如因特殊情况重复购买「无名客的荣勋」或「无名客的奖章」，「无名客的经验」无法累加，公告说明直接返还对应的古老梦华×750或×1410。特殊重复购买「荣勋授章」时，直接返还古老梦华×860。这是公告的特殊重复购买处理，不表示可以叠加经验，也不是现金退款或本条已核验的现价表。',
]
entries = [
    dict(id='v4-7-cn-nameless-honor', title='无名勋礼：任务与奖励窗口', category='limited', start=start,
         end={'kind': 'at', 'value': '2026-12-21T03:59'}, eligibility=eligibility,
         note='活动至所列03:59结束；付费购买在同日02:59提前关闭。购买关闭后仍可完成任务、领取奖励；赠礼、荣勋与奖章的解锁及等级条件见正文。', sourceUrl=source),
    dict(id='v4-7-cn-nameless-honor-purchase', title='无名勋礼：付费档位及升级购买窗口', category='limited', start=start,
         end={'kind': 'at', 'value': '2026-12-21T02:59'}, eligibility=eligibility + '；购买或升级按个人解锁状态核对',
         note='此截止仅对应荣勋、奖章、荣勋授章的购买；关闭后仍可在本期活动结束前完成任务并领奖，不能把02:59当成全部奖励领取截止。', sourceUrl=source),
]
created = dict(
    gameId='starrail', slug='v4-7-cn-nameless-honor-rules', locale='zh', kind='event',
    title='国服无名勋礼：12月21日购买关闭与领奖截止',
    summary='12月21日02:59关闭荣勋、奖章与荣勋授章购买，活动至03:59结束。补齐等级12与剧情门槛、70级上限、周任务刷新，以及赠礼和两种付费档位的奖励条件。',
    region='国服；起止时刻按公告原文，周任务刷新为服务器时间', checkedAt='2026-11-26',
    boundary='依据国服4.7无名勋礼独立公告，购买期限和活动期限分别保留，不外推其他区服或换算倒计时。荣勋与奖章属于付费档位；本条未核验各等级完整奖励表、自选光锥具体名单、燃料数量、个人解锁进度或当前商店价格。特殊重复购买返还古老梦华的说明不作为现金退款承诺。',
    facts=[{'text': text} for text in facts], sources=[{'url': source}],
    eventSchedule={'region': 'cn', 'clock': 'announcement', 'entries': entries}, _status='published')
expected = before + [created]
calendar = [entry for doc in expected for entry in doc.get('eventSchedule', {}).get('entries', [])]
assert len(expected) == 75
assert len(calendar) == len({entry['id'] for entry in calendar}) == 15
for name, value in [('batch.json', {'creates': [created], 'updates': []}), ('expected-publication.json', {'docs': expected})]:
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')
print('Prepared: one create, no updates, 75 records, 15 unique calendar entries')
