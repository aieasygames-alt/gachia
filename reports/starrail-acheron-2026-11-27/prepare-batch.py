# -*- coding: utf-8 -*-
"""Build Acheron from pinned data; verify independently against saved browser tables."""
import pathlib,json,collections
from decimal import Decimal
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
write=lambda n,v:(r/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
old=r.parent/'starrail-yaoguang-2026-11-26'
items=json.loads((old/'data-items.json').read_text());skills=read('acheron-character_skills.json');trees=read('acheron-character_skill_trees.json');promo=read('acheron-character_promotions.json')['1308']
costs=lambda rows:[{'name':items[c['id']]['name'],'quantity':c['num']} for c in rows]
def pct(x):
 s=format(Decimal(str(x))*100,'f');return (s.rstrip('0').rstrip('.') if '.' in s else s)+'%'
notes=[
 '对指定敌方单体造成雷属性攻击力伤害。普攻本身不直接获得残梦；若其他效果使敌人陷入负面效果，按天赋每次技能最多触发一次。培养上限6级，3魂加1级后展示至7级。',
 '获得1点残梦，为指定敌方单体附上1层集真赤；两列分别为指定单体与相邻目标的雷属性攻击力倍率。7/9级相邻倍率采用Station与固定数据一致的48.75%/56.25%，BWIKI显示截至一位小数。',
 '消耗9点残梦，依次施放3次啼泽雨斩和1次黄泉返渡。前两列为三次斩击均消去3层集真赤、集中攻击同一目标时的基础累计上限，不含雷心额外6段、奈落独立倍率、增伤、星魂或其他效果。后四列为每次斩击单体、消去集真赤时的群体基础、该次群体倍率最高提高至的总倍率（不是额外再相加）、收刀群体倍率。10级每次群体最高60%，由基础15%提高至60%；累计单体3×24%＋3×60%＋120%＝372%，其他目标300%。无集真赤时不触发该次群体伤害；终结技期间不能附上集真赤，收刀移除全部集真赤。所有分段共用一项终结技升级费用。',
 '残梦达到9点可激活终结技；终结技期间无视弱点属性削韧，并降低全敌全属性抗性至终结技结束，表中为降低幅度。任意单位施放技能期间使敌方陷入负面效果，获得1残梦并附1层集真赤，每次技能最多触发1次；多目标时附给集真赤最多者。敌人离场或被消灭后，其集真赤转给场上层数最多者。'
]
cols=[['单体攻击力倍率'],['单体攻击力倍率','相邻攻击力倍率'],['指定目标累计上限','其他目标累计上限','每斩单体倍率','每斩群体基础倍率','每斩群体最高总倍率','返渡群体倍率'],['全属性抗性降低']]
indices=[[0],[0,1],[5,6,0,1,4,2],[1]]
p={'id':'acheron','name':'黄泉','identity':'5星 · 雷 · 虚无 · 自称巡海游侠的旅人','materialNote':'默认目标为六次晋阶、普攻6级、战技/终结技/天赋各10级、三个额外能力和十个属性节点。仅计算尚未完成的目标；不含角色经验书及喂经验信用点、光锥、遗器、星魂获取或奇缘星魂成本。星魂加级不消耗升级材料；终结技的斩击和收刀不重复计费。需解锁的前置节点请一并选入，本计算不替代游戏内解锁条件判断。','skills':[],'ascensions':[{'stage':i+1,'atLevel':20+i*10,'materials':costs(c)} for i,c in enumerate(promo['materials'][:6])],'nodes':[]}
for i,key in enumerate(['basic','skill','ultimate','talent']):
 s=skills[str(130801+i)];t=trees[str(1308001+i)]
 p['skills'].append({'key':key,'label':s['type_text'],'name':s['name'],'trainableMax':t['max_level'],'note':notes[i],'columns':cols[i],'levels':[{'level':j+1,'values':[pct(row[k]) for k in indices[i]]} for j,row in enumerate(s['params'][:7 if i==0 else 12])],'upgrades':[{'toLevel':j+2,'materials':costs(row['materials'])} for j,row in enumerate(t['levels'][1:])]})
for tid,t in trees.items():
 if tid.startswith('13081') or tid.startswith('13082'):
  row=t['levels'][0];name=t['name'];req=f"晋阶{row['promotion']}" if row['promotion'] else f"等级{row['level']}"
  if row['properties']:name+=' +'+pct(row['properties'][0]['value'])
  p['nodes'].append({'id':tid,'name':name+'（'+req+'）','materials':costs(row['materials'])})
assert len(p['nodes'])==13
totals=collections.Counter()
for rows in [p['ascensions'],p['nodes'],*[s['upgrades'] for s in p['skills']]]:
 for row in rows:
  for c in row['materials']:totals[c['name']]+=c['quantity']
facts=[
 '黄泉为雷属性虚无角色，本页补齐普攻1—7级和战技、终结技、天赋1—12级，共115格倍率。材料培养上限为6/10/10/10；星魂3为终结技+2、普攻+1，星魂5为战技+2、天赋+2，故展示至7/12/12/12，不将描述中的理论最高10/15级当作材料培养目标。',
 '残梦达到9点可施放终结技，使用残梦机制。战技本身获得1点残梦并附1层集真赤；天赋的负面效果触发每次技能最多1次，不能把一次多目标负面效果当作多次充能。',
 '10级战技指定单体160%、相邻目标60%攻击力雷伤；普攻6级100%，3魂后7级110%。天赋10级在终结技期间降低全敌全属性抗性20%，12级22%，持续至终结技结束。',
 '终结技依次发动3次啼泽雨斩和1次黄泉返渡。10级每斩单体24%，消去集真赤时群体基础15%，消去最多3层时该次群体倍率提高至60%，返渡全敌120%；不能误算成15%再加60%。',
 '三次斩击均消去3层集真赤且集中同一目标时，10级指定目标基础累计上限372%，其他目标300%。这些累计值不含雷心额外6段、奈落、增伤或星魂，实际伤害随层数、攻击对象和其他效果变化；并非无条件每次都达到上限。',
 '秘技四相断我：每个波次开始获得四相断我，对全敌造成200%攻击力雷伤，无视弱点属性削韧；持有效果施放终结技后获得1残梦并给随机敌方1层集真赤。攻击普通敌人可直接消灭而不进入战斗，未命中不消耗秘技点。',
 '额外能力赤鬼：战斗开始获得5残梦并给随机敌人5层集真赤；残梦满后每溢出1点获得1层四相断我，最多3层。',
 '额外能力奈落：队伍中除黄泉外有1/2名虚无角色时，普攻、战技、终结技造成的伤害为原伤害115%/160%；这是原伤害倍率，不是另加115%/160%的普通增伤。',
 '额外能力雷心：啼泽雨斩击中带集真赤敌人后，自身造成伤害提高30%，最多3层，持续3回合；返渡额外造成6次随机单体伤害，每次25%攻击力，视为终结技伤害。十个属性节点合计攻击力28%、暴击伤害24%、雷属性伤害8%。',
 '1魂：对处于负面效果的目标造成伤害时暴击率提高18%。2魂：奈落最高数值需求的虚无角色减少1名，回合开始获得1残梦并给集真赤最多者1层。',
 '3魂：终结技+2、普攻+1；5魂：战技+2、天赋+2。4魂：敌方进入战斗时陷入终结技伤害易伤，受到终结技伤害提高8%。6魂：终结技伤害全属性抗性穿透提高20%，普攻和战技伤害同时视为终结技伤害并无视弱点属性削韧，击破触发雷属性效果。',
 '六次晋阶合计：信用点308,000、蓄梦元件15、流梦阀门15、造梦马达15、炼形者雷枝65。普攻五段及其余三项各九段升级逐档独立核验，终结技内部四次攻击不重复收取材料。',
 '终结技7→10独立合计：信用点540,000、焚天之魔27、造梦马达4、命运的足迹2、蛀星孕灾的旧恶3；战技和天赋相同范围同量。雷心节点另需信用点160,000、焚天之魔8、命运的足迹1、蛀星孕灾的旧恶1。',
 '精度采用Station可见数值与固定数据一致的记录，例如战技7级相邻48.75%、天赋7级减抗16.25%、终结技2级指定目标累计238.08%。BWIKI有一位小数截断，已记录差异，不据此压低原参数。',
 '本批覆盖基础技能、常规星魂与行迹。BWIKI另列奇缘星魂，当前适用模式和解锁条件尚未独立核准，未混入基础倍率和材料目标。',
 '默认完整目标合计：'+'、'.join(f'{k}{v:,}' for k,v in totals.items())+'；不含经验喂养信用点。'
]
base='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/'
sources=['https://wiki.biligame.com/sr/%E9%BB%84%E6%B3%89','https://starrailstation.com/cn/character/acheron']+[base+n+'.json' for n in ['characters','character_skills','character_skill_trees','character_promotions','items']]
doc={'gameId':'starrail','slug':'acheron-character-data','locale':'zh','kind':'character','title':'黄泉技能倍率、行迹与养成材料','summary':'雷·虚无黄泉四项技能逐级倍率、终结技分段与残梦机制，六次晋阶、十三个行迹节点及完整/分段材料预算。','facts':[{'text':x} for x in facts],'boundary':'适用于截至2026-11-27核验的中文基础角色资料。BWIKI、Star Rail Station与固定StarRailRes数据均为第三方，可能共享游戏数据上游，不算独立官方确认。部分倍率展示精度有差异，已记录采用口径。奇缘星魂适用模式及解锁条件待独立核准，未并入基础倍率与材料；不提供未经核验的配装排行，实际以当前游戏内显示为准。','region':'国服（中文资料；第三方数据核验）','checkedAt':'2026-11-27','sources':[{'url':u} for u in sources],'characterData':p,'_status':'published'}
write('batch.json',{'updates':[],'creates':[doc]});write('verified-totals.json',dict(totals));used={c['id'] for t in trees.values() for row in t['levels'] for c in row['materials']}|{c['id'] for row in promo['materials'] for c in row};write('reviewed-items.json',{k:items[k] for k in sorted(used)});print(dict(totals))
