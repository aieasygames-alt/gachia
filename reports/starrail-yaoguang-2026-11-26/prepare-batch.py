"""Build the reviewed character from a pinned extract; no CMS/cloud writes."""
import pathlib,json,hashlib,collections
from decimal import Decimal
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
write=lambda n,v:(r/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
items=read('data-items.json');skills=read('yaoguang-character_skills.json');trees=read('yaoguang-character_skill_trees.json');promo=read('yaoguang-character_promotions.json')['1502']
costs=lambda rows:[{'name':items[c['id']]['name'],'quantity':c['num']} for c in rows]
pct=lambda x:format(Decimal(str(x))*100,'f').rstrip('0').rstrip('.')+'%' if '.' in format(Decimal(str(x))*100,'f') else str(int(Decimal(str(x))*100))+'%'
notes=[
 '对指定单体与相邻目标造成攻击力倍率的物理伤害；普攻恢复能量提高至30点。',
 '展开3回合结界，自身每回合开始时持续回合数减1；全队欢愉度提高爻光欢愉度×表内倍率。结界期间爻光普攻、战技后获得3笑点。',
 '需要180能量；获得5笑点，使阿哈立即获得固定计入20笑点的额外回合且不消耗笑点；全队全属性抗性穿透提高表内数值，持续3回合。表格为未计入星魂的基础效果。',
 '爻光持有【好活当赏】时，我方攻击后触发【大吉大利】，对随机1个命中目标额外造成对应属性欢愉伤害；该攻击若消耗战技点则额外触发1次。攻击者欢愉度低于爻光时使用爻光欢愉度；该效果不视为1次攻击。',
 '使全敌陷入【凶星低语】3回合，受到的伤害提高16%；造成一次群体物理欢愉伤害，再随机单体造成5次物理欢愉伤害。表中单次随机伤害不能直接按群攻目标数累加。Lv7群攻81.25%采用固定参数0.8125与Station展示，未采用BWIKI的81.125%。'
]
keys=['basic','skill','ultimate','talent','elation'];ids=['150201','150202','150203','150204','150220'];tids=['1502001','1502002','1502003','1502004','1502420']
indices=[[0,1],[1],[1],[0],[1,5]];columns=[['单体攻击力倍率','相邻攻击力倍率'],['爻光欢愉度折算比例'],['全属性抗性穿透'],['大吉大利欢愉伤害倍率'],['群体欢愉伤害倍率','随机单次欢愉伤害倍率']]
profile={'id':'yaoguang','name':'爻光','identity':'5星 · 物理 · 欢愉 · 仙舟「玉阙」','materialNote':'默认目标为六次晋阶、普攻6级、战技/终结技/天赋/欢愉技各10级、三个额外能力和十个属性节点。仅计算尚未完成的目标；不含角色经验书及喂经验信用点、光锥、遗器或星魂获取成本。星魂加级不消耗升级材料。需解锁的前置节点请一并选入，本计算不替代游戏内解锁条件判断。','skills':[],'ascensions':[{'stage':i+1,'atLevel':20+i*10,'materials':costs(c)} for i,c in enumerate(promo['materials'][:6])],'nodes':[]}
for i,(key,sid,tid) in enumerate(zip(keys,ids,tids)):
 s=skills[sid];t=trees[tid]
 profile['skills'].append({'key':key,'label':s['type_text'],'name':s['name'],'trainableMax':t['max_level'],'note':notes[i], 'columns':columns[i],'levels':[{'level':j+1,'values':[pct(row[k]) for k in indices[i]]} for j,row in enumerate(s['params'][:7 if i==0 else 12])],'upgrades':[{'toLevel':j+2,'materials':costs(row['materials'])} for j,row in enumerate(t['levels'][1:])]})
for tid,t in trees.items():
 if tid.startswith('15021') or tid.startswith('15022'):
  row=t['levels'][0];req=f"晋阶{row['promotion']}" if row['promotion'] else f"等级{row['level']}"
  name=t['name']
  if row['properties']:
   prop=row['properties'][0];v=prop['value'];name += ' +'+(str(v) if prop['type']=='SpeedDelta' else pct(v))
  profile['nodes'].append({'id':tid,'name':name+'（'+req+'）','materials':costs(row['materials'])})
assert len(profile['nodes'])==13
facts=[
 '等级口径：普攻列出1—7级，其余四项列出1—12级，覆盖本体培养和星魂加级可达范围；材料计算上限为6/10/10/10/10。倍率表按未计入星魂与命途升格的基础技能记录，增益按各技能说明计算。',
 '秘技「浮光过隙，百无禁忌」：下次战斗开始自动触发1次战技，不消耗战技点；爻光在队伍时，击碎可破坏物可获得红包，每个地球周最多8个。秘技不作为可升级技能计费。',
 '额外能力「开屏有礼」：速度≥120时欢愉度提高30%，之后每超过1点速度，欢愉度再提高1%，最多计入200点超出速度。',
 '额外能力「神闲意满」：自身暴击伤害提高60%，施放欢愉技后为我方恢复1个战技点。',
 '额外能力「鸿运鳞集」：爻光获得【好活当赏】时，使其持续时间增加1回合。十个属性节点合计暴击率18.7%、速度9、欢愉度10%。',
 '1魂：终结技触发的阿哈额外回合固定笑点改为40；我方全体造成的欢愉伤害无视目标20%防御力。',
 '2魂：结界内我方全体速度提高12%，欢愉度额外提高16%。',
 '3魂：战技等级+2、普攻等级+1、欢愉技等级+1；这些等级增加不额外计入养成材料。',
 '4魂：终结技触发的阿哈额外回合中，我方全体欢愉技造成的伤害为原伤害的150%。',
 '5魂：终结技等级+2、天赋等级+2、欢愉技等级+1；与3魂合计使欢愉技最多+2级。',
 '6魂：我方全体欢愉伤害增笑25%，爻光欢愉技伤害倍率提高原倍率的100%；不直接改写本页基础倍率表。',
 '六次晋阶合计：信用点308,000、侵略凝块65、童真蜡笔15、造梦蘸钢15、梦现管锥15。',
 '材料冲突取舍：普攻1→2采用信用点4,000、《绒绒号》手绘分镜稿2、童真蜡笔5；战技1→2采用信用点2,000、童真蜡笔2。Station逐档与固定版本数据一致，未套用BWIKI的通用晋阶材料模板。',
 '欢愉技7→10独立合计：信用点435,000、《绒绒号》典藏版合集22、梦现管锥12，不需要灭流绝溢的缄默或命运的足迹；战技、终结技、天赋各自7→10另需缄默3、足迹2。',
 '命途升格附加效果「欢愉万相★心灵感应」单独处理：固定数据给出大吉大利原倍率的20%/40%增幅、终结技后固定恢复12/30能量与10爽点，但本次未独立核准两档切换条件，因此不并入基础倍率或材料计算。'
]
totals=collections.Counter()
for rows in [profile['ascensions'],profile['nodes'],*[s['upgrades'] for s in profile['skills']]]:
 for row in rows:
  for c in row['materials']:totals[c['name']]+=c['quantity']
assert totals['信用点']==3308000
facts.append('默认完整目标材料合计：'+ '、'.join(f'{k}{v:,}' for k,v in totals.items())+'。不含经验喂养信用点。')
base='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/'
sources=['https://wiki.biligame.com/sr/%E7%88%BB%E5%85%89','https://starrailstation.com/cn/character/yaoguang']+[base+n+'.json' for n in ['characters','character_skills','character_skill_trees','character_promotions','items']]
doc={'gameId':'starrail','slug':'yaoguang-character-data','locale':'zh','kind':'character','title':'爻光技能倍率、行迹与养成材料','summary':'物理·欢愉角色爻光的五项技能逐级倍率、六次晋阶、十三个行迹节点与分段材料计算。按2026-11-26第三方资料核验，区分基础效果、星魂加级及命途升格附加效果。','facts':[{'text':x} for x in facts],'boundary':'适用于截至2026-11-26的中文角色资料核验。BWIKI、Star Rail Station及固定版本StarRailRes均为第三方资料；Station与结构化数据可能共享游戏数据上游，本文不把它们算作两份独立官方证据。BWIKI部分倍率及材料表存在冲突，已在说明中记录取舍。未核准命途升格附加效果两档切换条件；不提供未经核验的配装排行或通用攻击力模型欢愉伤害结果。实际以游戏内当前显示为准。','region':'国服（中文资料；第三方数据核验）','checkedAt':'2026-11-26','sources':[{'url':u} for u in sources],'characterData':profile,'_status':'published'}
write('batch.json',{'updates':[],'creates':[doc]});write('verified-totals.json',dict(totals))
write('sources.json',{'checkedAt':'2026-11-26','pin':'03907e798b46f9eb109a1f882055cdf49ce3d374','urls':sources,'sha256':{n:hashlib.sha256((r/('data-'+n+'.json')).read_bytes()).hexdigest() for n in ['characters','character_skills','character_skill_trees','character_promotions','items']},'independence':'Third-party displays and extracted game data may share upstream; no claim of independent official confirmation.','conflicts':{'elationLv7':{'bwiki':'81.125%','station':'81.25%','pinnedParameter':0.8125,'adopted':'81.25%'},'costs':'Station 41 adjacent skill ranges and 13 nodes agree with pinned costs; Bwiki generic templates rejected.'}})
print(dict(totals))
