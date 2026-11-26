# -*- coding: utf-8 -*-
"""Build reviewed Sparxie profile from pinned extract and recorded browser tables."""
import pathlib,json,collections
from decimal import Decimal
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
write=lambda n,v:(r/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
items=read('reviewed-items.json');skills=read('sparxie-character_skills.json');trees=read('sparxie-character_skill_trees.json');promo=read('sparxie-character_promotions.json')['1501'];e=read('browser-source-evidence.json')
costs=lambda rows:[{'name':items[c['id']]['name'],'quantity':c['num']} for c in rows]
def pct(x):
 s=format(Decimal(str(x))*100,'f');return (s.rstrip('0').rstrip('.') if '.' in s else s)+'%'
notes=[
 '普通普攻「哑火了吗」与强化普攻「百花齐放，胜者独享！」共享等级和培养材料。三列分别列出普通单体、强化单体及强化相邻目标的攻击力倍率；强化普攻结算直播连线结果，互动陷阱的倍率增量另列于战技，不在本表预叠加。',
 '开启直播连线并发动1次互动陷阱，同次技能内可重复发动，最多20次；施放该技能及互动陷阱不视为使用战技。两列列出每次互动陷阱对强化普攻单体/相邻目标增加的倍率。随机礼物红红火火提供2笑点及2战技点，恍恍惚惚提供1笑点。战技本体与互动陷阱共用一次升级费用。7/9级相邻增量按Station及固定数据展示8.13%/9.38%，未推算更高精度。',
 '获得2笑点，消耗160能量。全敌攻击力倍率为（0.6×欢愉度＋表中基础倍率）；0.6为固定系数，表中未将其误写成单独60%攻击力伤害。好活当赏期间的额外欢愉伤害另见天赋，不把两类伤害直接混算。',
 '以下四列均为持有好活当赏时的火属性欢愉倍率：强化普攻单体、强化普攻相邻、每次互动陷阱附加的随机受击目标单次伤害，以及终结技全敌附加伤害。采用Station及固定数据的小数精度，BWIKI的部分整数/一位小数展示有差异。',
 '对全敌造成表中群体欢愉伤害，再额外造成20次随机单体欢愉伤害，每次按第二列计算；获得2爆点抵扣自身战技点消耗，消耗爆点视为消耗战技点。未叠加6魂额外次数或命途升格。7/8/9级的小数精度采用BWIKI明列数值，Station显示为两位小数。'
]
ids=['150101','150109','150103','150104','150120'];tids=['1501001','1501002','1501003','1501004','1501420'];indices=[[0],[3,4],[1],[2,3,0,1],[1,0]]
columns=[['普通单体攻击力倍率','强化单体攻击力倍率','强化相邻攻击力倍率'],['每次单体倍率增量','每次相邻倍率增量'],['群体攻击力基础倍率'],['强化单体欢愉倍率','强化相邻欢愉倍率','每次陷阱附加欢愉倍率','终结技附加欢愉倍率'],['全敌欢愉倍率','额外每次欢愉倍率']]
p={'id':'sparxie','name':'火花','identity':'5星 · 火 · 欢愉 · 假面愚者','materialNote':'默认目标为六次晋阶、普攻6级、战技/终结技/天赋/欢愉技各10级、三个额外能力和十个属性节点。仅计算尚未完成的目标；不含角色经验书及喂经验信用点、光锥、遗器或星魂获取成本。星魂加级不消耗升级材料。需解锁的前置节点请一并选入，本计算不替代游戏内解锁条件判断。','skills':[],'ascensions':[{'stage':i+1,'atLevel':20+i*10,'materials':costs(c)} for i,c in enumerate(promo['materials'][:6])],'nodes':[]}
for i,(key,sid,tid) in enumerate(zip(['basic','skill','ultimate','talent','elation'],ids,tids)):
 s=skills[sid];t=trees[tid];levels=[]
 for j,row in enumerate(s['params'][:7 if i==0 else 12]):
  values=[pct(row[k]) for k in indices[i]]
  if i==0:values=[pct(row[0]),*[pct(x) for x in skills['150108']['params'][j][:2]]]
  if i==4:
   table=next(x for x in e['bwikiPanels'] if x['type']=='huanyuji')['tables'][0]
   values=[table[1][j+1],table[2][j+1]]
  levels.append({'level':j+1,'values':values})
 p['skills'].append({'key':key,'label':skills['150102']['type_text'] if i==1 else s['type_text'],'name':'尖叫！火花花连线中 / 互动陷阱' if i==1 else s['name'],'trainableMax':t['max_level'],'note':notes[i],'columns':columns[i],'levels':levels,'upgrades':[{'toLevel':j+2,'materials':costs(row['materials'])} for j,row in enumerate(t['levels'][1:])]})
for tid,t in trees.items():
 if tid.startswith('15011') or tid.startswith('15012'):
  row=t['levels'][0];req=f"晋阶{row['promotion']}" if row['promotion'] else f"等级{row['level']}";name=t['name']
  if row['properties']:name+=' +'+pct(row['properties'][0]['value'])
  p['nodes'].append({'id':tid,'name':name+'（'+req+'）','materials':costs(row['materials'])})
assert len(p['nodes'])==13
facts=[
 '火花（Sparxie）为火属性欢愉角色，和量子同谐角色花火（Sparkle）使用独立资料入口。本页列出普攻及强化普攻1—7级、其余四项1—12级；材料培养上限6/10/10/10/10，强化形态不重复计费。',
 '直播连线可在同次技能内最多发动20次互动陷阱；每次提高强化普攻倍率并获得随机礼物。红红火火为2笑点与2战技点，恍恍惚惚为1笑点；没有把礼物随机结果作为固定收益。',
 '终结技消耗160能量并获得2笑点，攻击力倍率为0.6×欢愉度加逐级基础倍率；10级基础为50%。好活当赏期间另附加天赋欢愉伤害，不能只看50%便当作完整终结技。',
 '欢愉技对全敌造成一次伤害并额外造成20次随机单体伤害，获得2爆点；爆点可抵扣火花战技点消耗，且消耗爆点视为消耗战技点。10级全敌50%、额外每次25%。',
 '秘技「流量变现」使一定区域内敌人进入10秒拉黑、无法发现我方。主动攻击被拉黑敌人进入战斗后，对全敌造成50%攻击力火伤并恢复2战技点。',
 '额外能力「甜蜜！笑点签售会」：攻击力超过2000后，每超出100点使自身欢愉度提高5%，最多80%。',
 '额外能力「炫目！人设万花筒」：队内欢愉角色数为1/2/3或以上时，终结技额外获得2/4/8笑点及1/1/4爆点。',
 '额外能力「沸腾！真伪调色盘」：当前每个笑点使我方全体暴击伤害提高8%，最多80%。十个属性节点合计欢愉度28%、暴击率12%、暴击伤害13.3%。',
 '1魂：阿哈时刻结束获得5笑点；当前每个笑点使全队全属性抗性穿透提高1.5%，最多15%。',
 '2魂：阿哈时刻结束获得1额外回合和2爆点；每消耗1爆点自身暴击伤害提高10%，持续2回合，最多4层。',
 '3魂：战技+2、普攻+1、欢愉技+1；5魂：终结技+2、天赋+2、欢愉技+1。对应展示上限为7/12/12/12/12，星魂加级不额外计费。',
 '4魂：终结技额外获得5笑点，使自身欢愉度提高36%、持续3回合。6魂：全属性抗性穿透提高20%；欢愉技每计入1笑点使额外伤害次数增加1次，最多增加至40次，未改写基础技能表。',
 '六次晋阶合计：信用点308,000、明辉日珥65、童真蜡笔15、造梦蘸钢15、梦现管锥15。',
 '逐档材料采用与固定数据一致的Station控件：普攻1→2为信用点4,000、手绘分镜稿2、童真蜡笔5；战技1→2为信用点2,000、童真蜡笔2。BWIKI通用技能材料模板及部分节点成本有差异，未直接套用。',
 '欢愉技7→10独立合计信用点435,000、典藏版合集22、梦现管锥12，不需要灭流绝溢的缄默或命运的足迹；战技、终结技和天赋各自7→10另需缄默3、足迹2。',
 '精度说明：天赋7/9级单体采用32.5%/37.5%，终结技附加欢愉伤害保留26.4%等小数；BWIKI部分表格为整数或一位小数。战技7/9级相邻增量按Station与固定数据的8.13%/9.38%展示，未推算更长小数。',
 '欢愉技7/8/9级采用BWIKI明列群体40.625%/43.75%/46.875%、额外每次20.3125%/21.875%/23.4375%；Station显示40.63%/43.75%/46.88%及20.31%/21.88%/23.44%，固定数据仅保留四位小数，已记录精度边界。',
 '命途升格附加效果「欢愉万相★兔子戏法」固定数据有两档参数，本批未独立核准档位适用条件，未并入基础倍率和材料预算。'
]
totals=collections.Counter()
for rows in [p['ascensions'],p['nodes'],*[s['upgrades'] for s in p['skills']]]:
 for row in rows:
  for c in row['materials']:totals[c['name']]+=c['quantity']
assert totals['信用点']==3308000
facts.append('默认完整培养材料合计：'+'、'.join(f'{k}{v:,}' for k,v in totals.items())+'；不含经验喂养信用点。')
base='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/'
sources=['https://wiki.biligame.com/sr/%E7%81%AB%E8%8A%B1',e['stationUrl']]+[base+n+'.json' for n in ['characters','character_skills','character_skill_trees','character_promotions','items']]
doc={'gameId':'starrail','slug':'sparxie-character-data','locale':'zh','kind':'character','title':'火花技能倍率、行迹与养成材料','summary':'火·欢愉火花的普通与强化普攻、互动陷阱、终结技和欢愉技逐级倍率，六次晋阶与十三个行迹节点材料；支持完整及分段预算，独立于原版花火。','facts':[{'text':x} for x in facts],'boundary':'适用于截至2026-11-26核验的中文角色资料。BWIKI、Star Rail Station及固定版本StarRailRes均为第三方资料，可能共享游戏数据上游，不算作独立官方确认。部分倍率精度、通用材料表与节点费用有差异，已记录采用口径。命途升格两档条件仍待独立核准；不提供未经核验的配装排行或通用攻击力模型欢愉伤害结果，实际以当前游戏内显示为准。','region':'国服（中文资料；第三方数据核验）','checkedAt':'2026-11-26','sources':[{'url':u} for u in sources],'characterData':p,'_status':'published'}
write('batch.json',{'updates':[],'creates':[doc]});write('verified-totals.json',dict(totals));print(dict(totals))
