"""Prepare reviewed CMS content only; no Payload or cloud mutations."""
import copy
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent
before = json.loads((root / 'cloud-before.json').read_text())['docs']
main = 'https://www.miyoushe.com/sr/article/79482327'
fame = 'https://www.miyoushe.com/sr/article/79469420'
after = {'kind': 'after-update', 'date': '2026-11-11', 'version': '4.7'}
overview = copy.deepcopy(next(d for d in before if d['slug'] == 'v4-7-events-and-rewards'))
fame_entry = next(e for e in overview['eventSchedule']['entries'] if e['id'] == 'v4-7-cn-fame')
overview['eventSchedule']['entries'] = [e for e in overview['eventSchedule']['entries'] if e['id'] != 'v4-7-cn-fame']
fame_entry['sourceUrl'] = fame
fame_entry['note'] = '共5关，逐日开放；活动期间全部关卡均达成SS评级后，在「纪念奖章」领取「秀场明星」奖章。指定挑战目标的奖励在「限时奖励」领取。'
overview['summary'] = '已按国服正式公告整理活动与赛季窗口；成名之路的独立日历及奖励条件见专条，补偿邮件的两种期限另列。异器盈界仍待独立公告核验。'
patch = {'slug': overview['slug'], 'data': {k: overview[k] for k in ['summary', 'checkedAt', 'eventSchedule']}}

def record(slug, title, summary, boundary, facts, source, entries):
    return dict(gameId='starrail', slug=slug, locale='zh', kind='event', title=title,
                summary=summary, region='国服；时刻按国服正式公告原文', boundary=boundary,
                checkedAt='2026-11-26', facts=[{'text': t} for t in facts], sources=[{'url': source}],
                eventSchedule={'region': 'cn', 'clock': 'announcement', 'entries': entries}, _status='published')

creates = [record(
    'v4-7-cn-fame-reward-rules', '国服成名之路：5关挑战、SS评级与秀场明星奖章',
    '12月23日03:59前参与；逐日开放5关，预热破盾积攒热度并将增益带入决赛。全部关卡均达成SS评级后，可领取「秀场明星」奖章。',
    '依据国服独立活动公告；保留原文时刻，不外推其他区服。公告正文未列各关具体开放时刻、各评级数值阈值或奖励总量，本条不推算；限时奖励图示中的数量未在本批独立核验。',
    [
        '活动窗口与参与条件\n2026/11/11 4.7版本更新后至2026/12/23 03:59，开拓等级≥21级。该期限是本活动窗口，不能套用好礼或补偿邮件的截止时间。',
        '关卡开放与两个阶段\n活动开启后逐日开放新挑战关卡，共5关。每个挑战关分为「预热阶段」和「决赛阶段」；本条不把逐日开放推算为固定每日04:00解锁。',
        '预热阶段：破盾积攒热度\n破除敌方护盾可积攒热度，热度可激活增益效果。这些增益在预热阶段生效，也可带入决赛阶段。',
        '决赛阶段与评级奖励\n进入决赛阶段后，尽可能多地击穿强敌生命值即可获得对应的「评级奖励」。各关具体评级数值要求按活动界面核对。',
        '试用角色与临时强化\n可使用指定试用角色，或更换已有相同角色出战。拥有角色的等级、行迹、遗器、星魂及光锥等级未达养成标准时，系统将自动强化；该强化仅在活动中生效。',
        '指定挑战目标：限时奖励\n活动期间，在关卡内达成指定挑战目标后，可以在「限时奖励」中领取命运的足迹等奖励。具体目标、奖励数量与领取状态请查看活动界面。',
        '全部关卡SS：纪念奖章\n活动期间，全部关卡均达成SS评级后，可以在「纪念奖章」中领取收藏展柜道具「秀场明星」奖章。全部关卡SS是奖章的条件，不应写成参与活动或领取全部其他奖励的统一门槛。',
    ], fame, [fame_entry]),
    record(
        'v4-7-cn-compensation-mail', '国服4.7补偿邮件：12月11日收信与版本结束前领取',
        '停服更新补偿和问题修复补偿各为星琼300，资格相同、期限不同：前者在4.7版本结束前领取，后者需于12月11日23:59前上线收取邮件。',
        '依据国服4.7正式更新说明，不外推其他区服。12月11日23:59是问题修复补偿的上线收信要求，公告未在此处明确该邮件入箱后的有效期；不得据此推断邮件过期或领取按钮截止。公告时刻不转换为倒计时。',
        [
            '两项补偿的共同资格\n停服更新补偿与问题修复补偿的对象均为2026/11/11 06:00前，开拓等级≥4级的开拓者。更新后才达到4级不等同于满足公告资格。',
            '停服更新补偿：星琼300\n领取时间截至4.7版本结束前。国服版本更新说明给出的4.7版本持续时间为2026/11/11更新后至2026/12/23 06:00；请在版本结束前领取，不把活动的12月23日03:59截止套用于此。',
            '问题修复补偿：星琼300\n请于2026/12/11 23:59前上线收取邮件。这是上线收取邮件的要求，不是本批已核验的入箱后邮件有效期或领取按钮截止；具体邮件状态与有效期需查看游戏内邮件。',
            '发放方式与时间范围\n以上补偿将在更新完成后的5小时内，以游戏内邮件形式发放。公告未给实际更新完成的精确时刻；维护预计5小时不应转写成固定11:00发放或所有账号同一时刻收到。',
            '领取前核对\n分别检查两封邮件、公告资格和对应期限，及时领取。本站未读取个人游戏账号或邮件，不能保证某个账号仍有未领取补偿。',
        ], main, [
            dict(id='v4-7-cn-maintenance-compensation', title='停服更新补偿：版本结束前领取', category='gift',
                 start=after, end={'kind': 'version-end', 'version': '4.7'},
                 eligibility='2026/11/11 06:00前开拓等级≥4级',
                 note='星琼300；更新完成后的5小时内通过游戏邮件发放，领取截至4.7版本结束前。日历起点表示更新后发放，不代表精确到账时刻。', sourceUrl=main),
            dict(id='v4-7-cn-fix-compensation-mail', title='问题修复补偿：上线收信期限', category='gift',
                 start=after, end={'kind': 'at', 'value': '2026-12-11T23:59'},
                 eligibility='2026/11/11 06:00前开拓等级≥4级',
                 note='星琼300；须在所列截止前上线收取邮件。更新完成后的5小时内发放；此截止不是已核验的入箱后有效期或领取按钮期限，具体以游戏内邮件为准。', sourceUrl=main),
        ]),
]
expected = [{**d, **(patch['data'] if d['slug'] == patch['slug'] else {})} for d in before] + creates
entries = [e for d in expected for e in d.get('eventSchedule', {}).get('entries', [])]
assert len(expected) == 73 and len(entries) == 13
assert len({e['id'] for e in entries}) == len(entries)
for name, value in [('batch.json', {'creates': creates, 'updates': [patch]}), ('expected-publication.json', {'docs': expected})]:
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')
print('Prepared: two creates, one update, 73 records, 13 unique calendar entries')
