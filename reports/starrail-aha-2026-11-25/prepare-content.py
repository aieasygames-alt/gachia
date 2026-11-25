import json,pathlib,collections,decimal,hashlib
R=pathlib.Path(__file__).resolve().parent
load=lambda p:json.loads((R/p).read_text())
x=load('.private/station.json'); wiki=load('.private/traces.json'); costs=load('.private/point-costs.json')
refs=x['itemReferences']; skills={s['name']:s for s in x['skills']}
D=decimal.Decimal
def pct(v):return format((D(str(v))*100).normalize(),'f')+'%'
def mats(items):
 c=collections.Counter()
 for i in items:c[refs[str(i['id'])]['name']]+=i['count']
 return dict(c)
def cm(items):
 c=collections.Counter()
 for i in items:c[i['item_name']]+=i['num']
 return dict(c)
def fmt(c):return '、'.join(f'{k}×{v:,}' for k,v in c.items())
def rows(s):return [{'level':l['level'],'params':l['params'],'materials':mats(l['cost']),'promotionReq':l['promotionReq']} for l in s['levelData']]
def walk(ns):
 for n in ns:
  yield n
  yield from walk(n['children'])
nodes=list(walk(x['skillTreePoints'])); node_by_name={}
for n in nodes:
 if 'embedBonusSkill' in n:
  s=n['embedBonusSkill'];node_by_name[s['name']]=mats(s['levelData'][0]['cost'])
# Independently compare each known node cost to the community Wiki's public compute endpoint.
for i,p in enumerate(wiki['points'][:18],1):
 api=costs[str(i)];assert api['retcode']==0
 if i<=4:
  actual=rows(skills[p['name'].split('/')[0].replace('宇宙笑点太爆炸','宇宙笑点大爆炸')])
  assert [v['materials'] for v in actual if v['level']<=len(api['data']['list'])]==[cm(l['list']) for l in api['data']['list']]
 elif i==5:assert not any(l['list'] for l in api['data']['list'])
 elif i in [6,7,8]:assert node_by_name[p['name']]==cm(api['data']['list'][0]['list'])
assert sorted(json.dumps(mats(n['embedBuff']['cost']),sort_keys=True,ensure_ascii=False) for n in nodes if 'embedBuff' in n)==sorted(json.dumps(cm(costs[str(i)]['data']['list'][0]['list']),sort_keys=True,ensure_ascii=False) for i in range(9,19))
# Full skill precision comes from Station, while Wiki's table truncates to integer percent.
checks=[(0,'点星，开幕！',[0]),(1,'此乃令使，阿哈认证™',[1,0]),(2,'啊哈！宇宙笑点大爆炸',[1,3]),(3,'与祂共演，奇迹新篇',[8]),(18,'满月，是神在的时间',[0])]
for wi,name,indices in checks:
 for wr,sr in zip(wiki['points'][wi]['tableData']['rows'],skills[name]['levelData']):
  for shown,pi in zip(wr[1:],indices):assert int(D(str(sr['params'][pi]))*100)==int(shown.rstrip('%')),(name,wr,sr)
trace=collections.Counter(); normalized={}
for _,name,_ in checks:
 normalized[name]=rows(skills[name])
 for l in normalized[name]:trace.update(l['materials'])
node_data=[]
for n in nodes:
 if 'embedBuff' in n:
  s=n['embedBuff'];c=mats(s['cost']);node_data.append({'node':n['id'],'name':s['name'],'materials':c});trace.update(c)
 if 'embedBonusSkill' in n:
  s=n['embedBonusSkill'];c=mats(s['levelData'][0]['cost']);node_data.append({'node':n['id'],'name':s['name'],'materials':c});trace.update(c)
asc=mats([v for l in x['levelData'] for v in l.get('cost',[])])
assert asc=={'信用点':308000,'童真蜡笔':15,'造梦蘸钢':15,'嗤笑丑面':65,'梦现管锥':15}
assert trace=={'信用点':3000000,'《绒绒号》手绘分镜稿':18,'童真蜡笔':41,'《绒绒号》连载纪念刊':69,'造梦蘸钢':56,'《绒绒号》典藏版合集':139,'梦现管锥':58,'伪觉者的期许':12,'命运的足迹':8}
normalized.update({'ascension':[{'atLevel':l['maxLevel'],'materials':mats(l.get('cost',[]))} for l in x['levelData'] if l.get('cost')], 'traceNodes':node_data,'ascensionTotal':asc,'traceTotal':dict(trace)})
(R/'verified-data.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2)+'\n')
W='https://bbs.mihoyo.com/sr/wiki/content/8099/detail';S='https://starrailstation.com/cn/character/nihilux';B='https://wiki.biligame.com/sr/%E6%98%9F%E7%A5%9E%E2%98%85%E9%98%BF%E5%93%88'
def record(slug,title,summary,facts,boundary,sources):return {'gameId':'starrail','locale':'zh','kind':'character','slug':slug,'title':title,'summary':summary,'facts':[{'text':f} for f in facts],'boundary':boundary,'region':'4.7角色资料；第三方数据库参考，国服名称','checkedAt':'2026-11-25','sources':[{'url':u} for u in sources],'_status':'published'}
def series(name,indices,labels,limit):
 s=skills[name]
 return name+'（'+ ' / '.join(labels)+'）：'+'；'.join('Lv'+str(l['level'])+' '+ ' / '.join(pct(l['params'][i]) for i in indices) for l in s['levelData'] if l['level']<=limit)+'。'
skillfacts=[
 '等级范围：普攻可培养至6级，战技、终结技、天赋、欢愉技可培养至10级。3魂使普攻+1、终结技+2、欢愉技+1；5魂使战技/天赋+2、欢愉技再+1。下列完整表覆盖普攻1—7级、其他技能1—12级；7级/11—12级是星魂加级结果，不需额外材料升至该级。',
 series('点星，开幕！',[0],['对指定单体的量子欢愉伤害'],7),
 series('此乃令使，阿哈认证™',[1,0],['追加攻击全体量子欢愉伤害','令使欢愉度提升'],12),
 '战技选定自身以外的我方单体为「欢愉」令使，状态持续至切换目标；令使回合开始时为阿哈提供1愿力。战技后立即发动上述追加攻击，倍率不能当作攻击力倍率。',
 series('啊哈！宇宙笑点大爆炸',[1,3],['全体量子欢愉伤害','每段随机单体量子欢愉伤害'],12),
 '终结技消耗8愿力，使阿哈时刻行动提前20%，并获得持续3回合的「欢愉万相」，自身回合开始时减1回合；先全体伤害，再造成5段随机单体伤害。仅剩单个敌人且5段全部命中时，Lv10数值合计200%+5×60%=500%，这只是该技能段数合计。',
 series('与祂共演，奇迹新篇',[8],['全队暴击伤害提升'],12),
 '天赋：愿力达到8可开大，可储存至10；施放普攻、战技或欢愉技后获得1愿力。我方笑点首次达到40时，再获得1愿力并触发上述持续3回合的全队暴伤提升；阿哈时刻回合结束后可再次触发。',
 series('满月，是神在的时间',[0],['全体量子欢愉伤害'],12),
 '欢愉技始终在阿哈时刻最后施放：除上述全体欢愉伤害外，按本次阿哈时刻我方非真实伤害总和的20%结算真实伤害，由全体敌人均分；20%不随技能等级变化。4魂使该真实伤害倍率提高原倍率的25%，即20%×1.25=25%，并非45%。',
 '秘技「ABRACADABRA！」：领域持续20秒，敌人陷入视错；入战后阿哈时刻立即获得1个固定计入20笑点且不消耗笑点的额外回合；我方领域至多存在1个。',
 '固有行迹「欢愉万相★无中生有」：升格笑点/好活当赏为爽点/绝活共赏；阿哈时刻结束返还消耗爽点的10%。0魂欢愉万相期间自身暴击率+12%、伤害无视30%防御；2魂后分别变成20%和60%，不要混入0魂面板。',
 '星神权能「阿哈正传」：我方造成伤害时，按敌方损失生命值的25%施加欢愉负债；阶段转换时保留的负债不超过目标生命上限10%。6魂另设至少20%生命上限的负债，并在首次终结技后使阿哈时刻提前100%、获得100笑点。',
 '额外能力：晋阶2的「愚弄众神的玩笑」使战技追加攻击额外计入令使对应属性20%欢愉伤害、恢复1战技点；晋阶4的「戏中人的异想国」在受到队友治疗或护盾时获得1愿力，每次终结技后重置一次机会；晋阶6的「盒中蕴藏的世界」在速度≥125/150时提高欢愉度120%/150%，入战行动提前30%。'
]
skill=record('v4-7-aha-skill-multipliers','阿哈完整技能倍率：逐级数值与星魂加级','按 Star Rail Station 的小数精度整理，并与开拓者笔记的整数展示交叉核对。提供普攻1—7级、其余技能1—12级及固定机制数值。',skillfacts,'第三方资料，核验日2026/11/25；不代表官方逐项确认或实测伤害。百科会截断部分小数（如战技Lv7写40%，数据库为40.625%），本表采用数据库精度；数据库含更高理论等级，本页只列当前星魂可达范围。削韧口径在站点间不同，未混入本倍率表。',[S,W,'https://www.miyoushe.com/sr/article/79485999'])
def costline(name):return name+'：'+'；'.join(f"{l['level']-1}→{l['level']}级：{fmt(l['materials'])}" for l in normalized[name] if l['materials'])+'。'
matfacts=['统计范围：角色1→80的6次晋阶；普攻1→6，战技/终结技/天赋/欢愉技各1→10，解锁3个额外能力和10个属性节点。均为所需总量，不扣背包库存，不含光锥、遗器、星魂获取成本；等级经验另计。', '角色晋阶合计：'+fmt(asc)+'。']
matfacts += [f"{a['atLevel']}级晋阶：{fmt(a['materials'])}。" for a in normalized['ascension']]
matfacts += [costline('点星，开幕！'),costline('此乃令使，阿哈认证™').replace('此乃令使，阿哈认证™','战技、终结技、天赋分别适用（每一项独立消耗）'),costline('满月，是神在的时间'),
 '3个额外能力：'+'；'.join(n['name']+'：'+fmt(n['materials']) for n in node_data if n['name'] in node_by_name)+'。',
 '10个属性节点：'+'；'.join(str(i+1)+' '+n['name']+'：'+fmt(n['materials']) for i,n in enumerate(n for n in node_data if n['name'] not in node_by_name))+'。',
 '全行迹合计（包括欢愉技与全部节点）：'+fmt(trace)+'。欢愉技7→10级与常规技能不同，不消耗周本材料或命运的足迹，不能把常规技能成本简单乘4。',
 '晋阶+全行迹合计：'+fmt(dict(collections.Counter(asc)+trace))+'。不含角色经验及喂经验产生的信用点。',
 '角色1→80另需经验5,797,920；若全部使用20,000经验的漫游指南，向上取整需290本，经验溢出2,080。混用经验书可以减少溢出；这不是额外的晋阶材料。']
mat=record('v4-7-aha-material-quantities','阿哈养成材料数量：晋阶、逐级技能与全行迹','按明确的6/10/10/10/10技能目标复算，完整列出6次晋阶、欢愉技独立消耗及13个行迹节点；总量不扣背包库存。',matfacts,'第三方数据库备料参考。Star Rail Station 与开拓者笔记公开材料计算的常规技能和节点相符；BWIKI通用技能模板显示不同消耗，未混用。晋阶造梦蘸钢采用数据库与BWIKI的6+9=15，开拓者笔记50级分表写8、与其总表15矛盾。周本材料按角色数据库记为伪觉者的期许×12；4.7新增饥饿的乳牙不据此自动替换。经验书信用点消耗未获独立核对，因此没有把它并入总信用点。',[S,W,B])
before=load('cms-before.json')['docs'];live=next(d for d in before if d['slug']=='v4-7-live')
facts=[{'text':f['text']} for f in live['facts'][:10]]+[{'text':'阿哈的逐级倍率、星魂条件及材料数量已另列第三方角色资料条目。官方前瞻仍只作为机制概述；第三方数据与官方公告分开标识。'}]
batch={'updates':[{'slug':'v4-7-live','data':{'facts':facts,'boundary':'热修依据国服官方客服问题说明，所查公告最后编辑于2026/11/18，不据11/25核验日声称出现新热修。阿哈数值与材料另见第三方角色条目，存在的来源差异均在对应条目说明；此官方条目不将社区数据标为官方确认。'}}],'creates':[skill,mat]}
assert all(len(d['facts'])<=20 and all(len(f['text'])<=4000 for f in d['facts']) for d in batch['creates'])
(R/'batch.json').write_text(json.dumps(batch,ensure_ascii=False,indent=2)+'\n')
(R/'source-comparison.json').write_text(json.dumps({'checkedAt':'2026-11-25','skillsCompared':5,'regularSkillCostSequencesCompared':4,'bonusNodesCompared':3,'ascensionMediumMaterial':'Station + BWIKI 6+9=15; community Wiki detail 6+8 conflicts with total15','precision':'Station decimal values; community Wiki integer truncation confirmed at all shared levels','rejected':'Prydwen unresolved placeholders and swapped ascension quantities; BWIKI basic detailed multiplier and generic skill cost differ','sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (R/'.private').iterdir() if p.is_file() and p.suffix in ['.json','.html','.jpg']}},ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(batch['creates']),'new records;',len(matfacts),'material facts; all source comparisons passed')
