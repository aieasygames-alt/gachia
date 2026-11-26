# -*- coding: utf-8 -*-
"""Prepare three existing event updates; no cloud or Payload mutations."""
import json,pathlib,copy
r=pathlib.Path(__file__).resolve().parent
before=json.loads((r/'cloud-before.json').read_text())['docs']
main='https://www.miyoushe.com/sr/article/79482327'
planar='https://www.miyoushe.com/sr/article/79712872'
def after():return {'kind':'after-update','date':'2026-11-11','version':'4.7'}
def at(value):return {'kind':'at','value':value}
def entry(id,title,category,start,end,eligibility,note,source=main):
 return dict(id=id,title=title,category=category,start=start,end=end,eligibility=eligibility,note=note,sourceUrl=source)
limited=at('2026-12-23T03:59')
rows=[
 entry('v4-7-cn-gifts','开场好礼先抱走','gift',after(),{'kind':'version-end','version':'4.7'},'开拓等级≥4级','公告范围为4.7版本持续期间；各好礼需按对应入口与签到进度领取，不能把累计签到20张专票写成登录即领。'),
 entry('v4-7-cn-kitchen','剧场版绒绒号：欢闹厨房','limited',after(),limited,'开拓等级≥21级；支持「终末视界」提前体验','此处截止为限时活动窗口；限时奖励与收录「常时传略」后的常驻奖励分开核对。建议完成「二相乐园」—「此刻，将群星付之一笑」后体验，建议剧情不是额外强制门槛。'),
 entry('v4-7-cn-fame','星际和平盛典：成名之路','limited',after(),limited,'开拓等级≥21级','按国服版本更新说明列示活动窗口与等级要求；关卡开放、任务进度及奖励领取状态以游戏内为准。'),
 entry('v4-7-cn-relic-vault','奇库寻遗','limited',after(),limited,'开拓等级≥21级','按活动任务取得权限卡，开箱与暂存规则见下方已核验条目；6个部位不等于只有6次开箱。'),
 entry('v4-7-cn-fashion','寰宇美学·幻乐秀场','limited',after(),limited,'开拓等级≥4级','使用时装邀请函抽取；不把时装抽取活动写成免费登录领取，也不推算未核验的总抽取成本。'),
 entry('v4-7-cn-resonance','万象和鸣','limited',after(),limited,'公告未另列等级门槛；按活动入口和累计回响规则核对','累计消耗活动跃迁专票或时装邀请函获取回响；两档奖励按累计1600、3200分别领取，不能视为登录即领。'),
 entry('v4-7-cn-currency-war','货币战争·入画奇航','season',after(),{'kind':'not-announced'},'开拓等级≥21级；支持「终末视界」提前体验','这是新赛季更新时间；所查更新说明未公告独立结束时刻，不套用12月23日03:59。建议完成「匹诺康尼」—「异乡异客」后体验。'),
]
challenges=[
 entry('v4-7-cn-apocalyptic-shadow','末日幻影·领航冥茫','challenge',at('2026-11-16T04:00'),at('2026-12-28T03:59'),'按游戏内「末日幻影」入口及当前账号解锁状态核对','每轮保留自己的公告截止时间，不统一截断到4.7版本结束；本条不新增未核验的解锁等级或敌人配置。'),
 entry('v4-7-cn-pure-fiction','虚构叙事·虚事成理','challenge',at('2026-11-30T04:00'),at('2027-01-11T03:59'),'按游戏内「虚构叙事」入口及当前账号解锁状态核对','2026年11月26日核验时尚未开启；此轮持续至2027年，不能省略年份或套用版本结束日。'),
 entry('v4-7-cn-memory-of-chaos','混沌回忆·漆黑残响','challenge',at('2026-12-14T04:00'),at('2027-01-25T03:59'),'按游戏内「忘却之庭·混沌回忆」入口及当前账号解锁状态核对','2026年11月26日核验时尚未开启；关卡与奖励需按对应轮次另行核验。'),
]
planars=[entry('v4-7-cn-planar-fissure','位面分裂','limited',at('2026-11-23T04:00'),at('2026-12-07T03:59'),'解锁「位面饰品」','双倍次数在活动期间不会重置；具体次数上限和个人剩余次数以活动界面为准，不沿用往期数字。',planar)]
patches=[]
for slug,entries in [('v4-7-events-and-rewards',rows),('v4-7-cn-endgame-calendar',challenges),('v4-7-cn-planar-fissure',planars)]:
 original=next(d for d in before if d['slug']==slug)
 assert all(e['sourceUrl'] in [s['url'] for s in original['sources']] for e in entries)
 data={'checkedAt':'2026-11-26','eventSchedule':{'region':'cn','clock':'announcement','entries':entries},'facts':[{'text':f['text'].replace('11月25日','11月26日')} for f in original['facts']],'summary':original['summary'].replace('11月25日','11月26日')}
 if slug=='v4-7-events-and-rewards':
  data['summary']='已按国服正式更新说明整理7项活动与赛季窗口；版本好礼、限时活动和未公告独立截止的赛季分开显示。异器盈界仍待独立公告核验。'
 patches.append({'slug':slug,'data':data})
expected=[{**d,**next((p['data'] for p in patches if p['slug']==d['slug']),{})} for d in before]
assert len(expected)==71 and sum(len(d.get('eventSchedule',{}).get('entries',[])) for d in expected)==11
for name,value in [('batch.json',{'creates':[],'updates':patches}),('expected-publication.json',{'docs':expected})]:
 with (r/name).open('x') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
print('Prepared three updates with eleven calendar entries; total remains 71')
