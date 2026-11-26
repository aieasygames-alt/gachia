"""Build the reviewed character from a pinned extract; no CMS/cloud writes."""
import pathlib,json,hashlib,collections
from decimal import Decimal
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
write=lambda n,v:(r/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
items=read('reviewed-items.json');skills=read('silverwolf-character_skills.json');trees=read('silverwolf-character_skill_trees.json');promo=read('silverwolf-character_promotions.json')['1506']
costs=lambda rows:[{'name':items[c['id']]['name'],'quantity':c['num']} for c in rows]
pct=lambda x:format(Decimal(str(x))*100,'f').rstrip('0').rstrip('.')+'%' if '.' in format(Decimal(str(x))*100,'f') else str(int(Decimal(str(x))*100))+'%'
notes=[
 '普通普攻对指定单体造成攻击力倍率伤害。强化普攻「奖励关：狼尊时刻」的弹射总倍率均分为100段，期间触发3次头号补给盲盒，最后一击按单独倍率由全敌均分。强化普攻不恢复战技点；每60隐藏分使其期间伤害提高原伤害15%，最多2层。持有好活当赏时强化普攻的技能伤害改为相同倍率的欢愉伤害。三列分别列出普通普攻、强化弹射总量、强化最后一击；强化形态共用普攻等级，不重复收取培养材料。',
 '获得5笑点，对敌方全体造成表内攻击力倍率的虚数伤害。',
 '进入无敌玩家状态并行动提前100%，展开结界。持有好活当赏时，我方目标每消耗1战技点有概率触发头号补给盲盒：表内欢愉伤害由全敌均分，并随机触发大剑（对生命值最高敌人额外造成总伤害20%的真实伤害）、炸蛋（恢复2战技点）或怪味豆（获得3笑点）。触发初始固定概率100%，成功后降至当前概率20%；这不是每次减20个百分点。终结技由60隐藏分激活，不按普通回能循环估算。',
 '60隐藏分激活终结技，达到上限后还可溢出240点；获得笑点时获得等量隐藏分。每点隐藏分提供表中暴击率，达到100%暴击率后的其余隐藏分改为提供表中暴击伤害。无敌玩家期间免疫控制、不能施放终结技，完整施放3次强化普攻后退出并清空隐藏分。持有好活当赏时，普攻和战技额外造成表内欢愉倍率，强化普攻则转换伤害类型。Lv7/Lv9欢愉倍率采用32.5%/37.5%，未采用BWIKI的32%/37%。',
 '普通欢愉技「殿堂级操作回放」固定获得15隐藏分。无敌玩家期间强化为「崩坏级伤害演示」：随机单体弹射6次，每次造成表内虚数欢愉伤害，并将头号补给盲盒触发概率重置为初始值。两形态共用欢愉技等级和培养材料。'
]
keys=['basic','skill','ultimate','talent','elation'];ids=['150601','150602','150603','150604','150621'];tids=['1506001','1506002','1506003','1506004','1506420']
indices=[[0],[0],[2],[3,5,2],[0]];columns=[['普通单体攻击力倍率','强化弹射总倍率','强化最后一击倍率'],['群体攻击力倍率'],['盲盒均分欢愉倍率'],['每点隐藏分暴击率','每点隐藏分暴击伤害','普攻战技附加欢愉倍率'],['强化弹射每次欢愉倍率']]
profile={'id':'silver-wolf-lv999','name':'银狼LV.999','identity':'5星 · 虚数 · 欢愉 · 星核猎手','materialNote':'默认目标为六次晋阶、普攻6级、战技/终结技/天赋/欢愉技各10级、三个额外能力和十个属性节点。仅计算尚未完成的目标；不含角色经验书及喂经验信用点、光锥、遗器或星魂获取成本。星魂加级不消耗升级材料。需解锁的前置节点请一并选入，本计算不替代游戏内解锁条件判断。','skills':[],'ascensions':[{'stage':i+1,'atLevel':20+i*10,'materials':costs(c)} for i,c in enumerate(promo['materials'][:6])],'nodes':[]}
for i,(key,sid,tid) in enumerate(zip(keys,ids,tids)):
 s=skills[sid];t=trees[tid]
 profile['skills'].append({'key':key,'label':s['type_text'],'name':('殿堂级操作回放 / 崩坏级伤害演示' if i==4 else s['name']),'trainableMax':t['max_level'],'note':notes[i], 'columns':columns[i],'levels':[{'level':j+1,'values':([pct(row[0]),pct(skills['150608']['params'][j][0]),pct(skills['150608']['params'][j][3])] if i==0 else [({6:'73.125%',8:'84.375%'}[j] if i in [2,4] and j in [6,8] else pct(row[k])) for k in indices[i]])} for j,row in enumerate(s['params'][:7 if i==0 else 12])],'upgrades':[{'toLevel':j+2,'materials':costs(row['materials'])} for j,row in enumerate(t['levels'][1:])]})
for tid,t in trees.items():
 if tid.startswith('15061') or tid.startswith('15062'):
  row=t['levels'][0];req=f"晋阶{row['promotion']}" if row['promotion'] else f"等级{row['level']}"
  name=t['name']
  if row['properties']:
   prop=row['properties'][0];v=prop['value'];name += ' +'+(str(v) if prop['type']=='SpeedDelta' else pct(v))
  profile['nodes'].append({'id':tid,'name':name+'（'+req+'）','materials':costs(row['materials'])})
assert len(profile['nodes'])==13
facts=[
 '等级口径：普攻及强化普攻列出1—7级，其余四项列出1—12级，覆盖本体与星魂加级可达范围；材料计算上限6/10/10/10/10。普通与强化形态共享对应技能等级，升级只计算一次。表格未叠加星魂和命途升格效果。',
 '秘技「朋友，这才是T0级秘技」召唤怪怪怪味豆；召唤不消耗秘技点，自动消灭普通敌人时消耗1点，0点时解除且无法使用。随从在场时，每波战斗开始触发1次怪味豆盲盒，欢愉伤害固定计入99点好活当赏。',
 '专属效果「999安全卫士」：获取角色后或当前队伍存在角色时，战斗中敌方施加控制类负面状态后，我方全体获得1回合防火墙、免疫敌方施加的控制类负面状态；每波最多触发1次。',
 '额外能力「假结局速通攻略」：速度≥160时欢愉度提高50%，之后每超出1点速度再提高2%，最多计入100点超出速度。',
 '额外能力「真结局解锁条件」：欢愉技计入笑点≥20时额外获得20隐藏分；≥40时再额外获得20隐藏分。',
 '额外能力「隐藏关卡全成就」：进入无敌玩家后获得20隐藏分。十个属性节点合计暴击率18.7%、速度9、欢愉度10%。',
 '1魂：结界中敌人受到伤害提高20%；退出无敌玩家时改为保留20%隐藏分。',
 '2魂：进入无敌玩家后自身增益效果延长1回合；本次状态每使隐藏分提高120点（含初始隐藏分），获得1额外回合并恢复1次强化普攻次数。',
 '3魂：战技+2、普攻+1、欢愉技+1；星魂加级不额外计费。',
 '4魂：崩坏级伤害演示造成的欢愉伤害额外计入5倍笑点；不改写基础技能倍率。',
 '5魂：终结技+2、天赋+2、欢愉技+1，与3魂合计欢愉技+2。',
 '6魂：强化普攻期间欢愉伤害增笑50%；入场敌人被植入禁限弱点，具有全属性弱点且全属性基础抗性降至0；原基础抗性为0的属性改为对应抗性降低20%。',
 '六次晋阶合计：信用点308,000、纷争先兆65、童真蜡笔15、造梦蘸钢15、梦现管锥15。',
 '材料采用逐档记录：普攻1→2为信用点4,000、手绘分镜稿2、童真蜡笔5；战技1→2为信用点2,000、童真蜡笔2。Station逐档与固定数据一致；BWIKI通用模板及部分额外能力材料有冲突，未沿用模板。',
 '欢愉技7→10独立合计：信用点435,000、《绒绒号》典藏版合集22、梦现管锥12，不需要灭流绝溢的缄默或命运的足迹。战技、终结技、天赋各自7→10另需缄默3、足迹2。',
 '精度口径：终结技与强化欢愉技7级、9级采用BWIKI的73.125%、84.375%，Station分别显示四舍五入后的73.13%、84.38%；固定数据在这些格中仅保留四位小数，未将其截断值当作更高精度依据。',
 '天赋倍率差异：7级、9级普攻战技附加欢愉倍率采用Station及固定参数支持的32.5%、37.5%；BWIKI表格分别显示32%、37%。',
 '命途升格附加效果「欢愉万相★全息幻象」的固定数据存在两档隐藏分溢出与转化参数；本次未独立核准两档切换条件，未并入基础倍率与材料计算。'
]
totals=collections.Counter()
for rows in [profile['ascensions'],profile['nodes'],*[s['upgrades'] for s in profile['skills']]]:
 for row in rows:
  for c in row['materials']:totals[c['name']]+=c['quantity']
assert totals['信用点']==3308000
facts.append('默认完整目标材料合计：'+ '、'.join(f'{k}{v:,}' for k,v in totals.items())+'。不含经验喂养信用点。')
base='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/'
sources=['https://wiki.biligame.com/sr/%E9%93%B6%E7%8B%BCLV.999','https://starrailstation.com/cn/character/silverwolflv999']+[base+n+'.json' for n in ['characters','character_skills','character_skill_trees','character_promotions','items']]
doc={'gameId':'starrail','slug':'silver-wolf-lv999-character-data','locale':'zh','kind':'character','title':'银狼LV.999技能倍率、行迹与养成材料','summary':'虚数·欢愉银狼LV.999的普通与强化技能逐级倍率、六次晋阶、十三个行迹节点和分段材料计算。区分隐藏分机制、盲盒效果及星魂加级，保留第三方数据差异说明。','facts':[{'text':x} for x in facts],'boundary':'适用于截至2026-11-26的中文角色资料核验。BWIKI、Star Rail Station及固定版本StarRailRes均为第三方资料；Station与结构化数据可能共享游戏数据上游，本文不把它们算作两份独立官方证据。BWIKI部分倍率及材料表存在冲突，已在说明中记录取舍。未核准命途升格附加效果两档切换条件；不提供未经核验的配装排行或通用攻击力模型欢愉伤害结果。实际以游戏内当前显示为准。','region':'国服（中文资料；第三方数据核验）','checkedAt':'2026-11-26','sources':[{'url':u} for u in sources],'characterData':profile,'_status':'published'}
write('batch.json',{'updates':[],'creates':[doc]});write('verified-totals.json',dict(totals))
print(dict(totals))
