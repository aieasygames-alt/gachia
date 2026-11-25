"""Editorial batch from reviewed public snapshots; never writes CMS or cloud."""
import json,pathlib,collections,math
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((root/'.private'/n).read_text())
identity=read('light_cones.json');ranks=read('light_cone_ranks.json');promotions=read('light_cone_promotions.json');items=read('items.json')
secondary=json.loads((root/'secondary-source-reads.json').read_text());primary=json.loads((root/'source-reads.json').read_text())
ids=[('23057','welcome-to-the-galactic-city'),('23053','dazzling-world'),('23054','when-she-decided-to-see'),('21016','trend-of-the-universal-market'),('23011','she-already-shut-her-eyes')]
official='https://act.mihoyo.com/puzzle/hkrpg/e20261024version_2142940ddd/index.html'
window='国服4.7官方专题列出本轮复刻从4.7更新后至2026/12/02 11:59。BWIKI卡池栏写至12月22日，与专题不一致，本页采用官方专题的第一期结束时间。专题未标注时区；其他区服须独立核对。'
rows=[];proof=[]
for id,slug in ids:
 meta=identity[id];rank=ranks[id];pr=promotions[id];name=meta['name'];path='欢愉' if meta['path']=='Elation' else '存护'
 soup=BeautifulSoup((root/'.private'/(name+'.html')).read_text(),'html.parser')
 main=soup.select_one('.mw-parser-output').get_text(' ',strip=True)
 assert meta['path'] in ['Elation','Knight'];assert f"{meta['rarity']}星.png" in str(soup)
 stats=[math.floor(pr['values'][6][k]['base']+79*pr['values'][6][k]['step']+1e-7) for k in ['hp','atk','def']]
 assert all(str(n) in main for n in stats)
 facts=[f'装备身份与80级面板\n{meta["rarity"]}星{path}光锥，技能「{rank["skill"]}」。80级生命值{stats[0]}、攻击力{stats[1]}、防御力{stats[2]}，采用百科整数显示值；技能效果仅对{path}命途生效。']
 if id=='23057':
  facts+=['触发条件\n速度加成为百分比。装备者对自身单体施放终结技时获得笑点，该效果最多触发1次；施放3次普攻后重置可触发次数。无视防御仅限装备者造成的欢愉伤害。']
  for i,(speed,ignore,laugh,reset) in enumerate(rank['params'],1):
   assert reset==3
   facts+=[f'叠影{i}\n速度提高{speed*100:g}%；欢愉伤害无视目标{ignore*100:g}%防御力；满足自身单体终结技条件时获得{laugh}点笑点。']
 elif id=='23053':
  facts+=['战技点与推流条件\n装备者在场时，队伍每有1名欢愉角色，战技点上限提高1点，最多提高3点。每消耗1个战技点叠加1层无视防御效果，最多4层；同一回合消耗≥4个战技点使装备者获得【推流】。持有【推流】时提高全队欢愉度，同类光锥效果无法叠加。来源文本未注明层数或【推流】的持续/重置规则，本页不额外推定。']
  for i,(crit,sp,cap,elation,stacks,ignore,threshold) in enumerate(rank['params'],1):
   assert (sp,cap,stacks,threshold)==(1,3,4,4)
   facts+=[f'叠影{i}\n装备者暴击伤害提高{crit*100:g}%；每层使自身欢愉伤害无视敌方目标{ignore*100:g}%防御力，最多4层；持有【推流】时我方全体欢愉度提高{elation*100:g}%。']
 elif id=='23054':
  facts+=['上上签与能量条件\n进入战斗或对我方目标施放终结技时，装备者获得【上上签】，持续3回合。持有时全队获得暴击率与暴击伤害加成，能量恢复效率仅提高装备者自身。每个波次开始时，装备者固定恢复15点能量。', '暴伤精度说明\nBWIKI正文将叠影2/4的暴击伤害加成显示为37%/52%；StarRailRes公开参数为0.375/0.525。本页保留参数精度，列为37.5%/52.5%，不将百科整数显示视作精确值；尚未进行客户端实测。']
  for i,(speed,crit,cd,duration,err,energy) in enumerate(rank['params'],1):
   assert duration==3 and energy==15
   facts+=[f'叠影{i}\n速度提高{speed*100:g}%；持有【上上签】时我方全体暴击率提高{crit*100:g}%、暴击伤害提高{cd*100:g}%，装备者自身能量恢复效率提高{err*100:g}%。']
 elif id=='21016':
  facts+=['灼烧条件\n装备者受到攻击后判定灼烧，持续2回合；每回合持续伤害以装备者防御力为基准。下列概率均为基础概率，不能当作无视效果抵抗的最终命中率。']
  for i,(defence,chance,dot,duration) in enumerate(rank['params'],1):
   assert duration==2
   facts+=[f'叠影{i}\n装备者防御力提高{defence*100:g}%；受击后有{chance*100:g}%基础概率使敌方目标灼烧，每回合造成等同装备者{dot*100:g}%防御力的持续伤害，持续2回合。']
 else:
  facts+=['触发与治疗基准\n装备者生命值降低时触发全队伤害提高，持续2回合。治疗发生在每个波次开始时，以各自已损失生命值为基准；不是施放终结技时治疗，也不是按生命上限直接回复。']
  for i,(hp,damage,heal,err,duration) in enumerate(rank['params'],1):
   assert duration==2
   facts+=[f'叠影{i}\n装备者生命上限提高{hp*100:g}%、能量恢复效率提高{err*100:g}%；生命值降低时使我方全体伤害提高{damage*100:g}%，持续2回合；每波次开始为全队回复各自已损失生命值的{heal*100:g}%。']
 if id in ['23057','23053','23054']:facts+=['获取与本轮复刻\n限定跃迁。'+window]
 elif id=='21016':facts+=['获取与当前UP\n获取途径为跃迁。4.7官方专题列为当前光锥跃迁四星UP之一；具体概率、保底及跃迁范围以游戏内详情为准。']
 else:facts+=['获取范围\nBWIKI列为限定跃迁、商店兑换；本次未核准当前商店库存、货币与资格，不将历史获取方式表述为2026/11/25正在开放。官方4.7本轮复刻名单未列该光锥。']
 table=soup.find(id='晋阶材料').find_next('table');names=[a['title'] for a in table.select('a[title]')];numbers=[int(x.replace(',','')) for x in table.stripped_strings if x.replace(',','').isdigit()]
 # Material cells contain their linked identity and numeric quantity; independently compare source order.
 expected_names=[];expected_nums=[];totals=collections.Counter()
 for level,mats in zip([20,30,40,50,60,70],pr['materials'][:6]):
  ordered=[m for m in mats if m['id']!='2']+[m for m in mats if m['id']=='2']
  expected_names.extend(items[m['id']]['name'] for m in ordered);expected_nums.extend(m['num'] for m in ordered)
  facts+=[f'{level}级晋阶\n'+'；'.join(f'{items[m["id"]]["name"]}×{m["num"]:,}' for m in ordered)+'。']
  for m in mats:totals[m['id']]+=m['num']
 assert names==expected_names,(name,names,expected_names)
 assert numbers==expected_nums,(name,numbers,expected_nums)
 facts+=['六次晋阶合计\n'+'；'.join(f'{items[k]["name"]}×{v:,}' for k,v in totals.items())+'。仅计晋阶，不含升级经验、喂经验信用点与叠影获取成本。']
 summary={'23057':'5星欢愉光锥：叠影1—5速度、欢愉伤害无视防御、笑点与3次普攻重置条件，附80级面板及六次晋阶材料。','23053':'5星欢愉光锥：叠影1—5暴伤、战技点上限、四层无视防御与推流条件，附80级面板及晋阶材料。','23054':'5星欢愉光锥：叠影1—5上上签、全队双暴与自身回能，说明37.5%/52.5%的参数精度，附晋阶材料。','21016':'4星存护光锥：纠正旧条目的名称与面板，补齐叠影1—5防御、灼烧基础概率、持续伤害与晋阶材料。','23011':'5星存护光锥：纠正旧条目命途与触发机制，补齐叠影1—5生命、回能、全队增伤和波次治疗及晋阶材料。'}[id]
 sources=[{'url':next(s['url'] for s in primary if s['name']==name)}]+[{'url':s['url']} for s in secondary]
 if id!='23011':sources+=[{'url':official}]
 boundary='名称、星级、命途、叠影参数与晋阶材料对照BWIKI及固定版本StarRailRes公开数据；两者可能使用共同游戏数据，不代表官方逐项确认或客户端实测。80级面板按整数口径列示。'
 if id=='23054':boundary+='叠影2/4暴伤保留StarRailRes参数精度，BWIKI正文整数差异见专节。'
 boundary+='官方专题仅用于本轮跃迁名单与日程；不据同命途或故事角色推导专属、适配排名、最终伤害收益或抽取建议。核验日期为2026/11/25。'
 rows.append(dict(gameId='starrail',locale='zh',kind='equipment',slug=slug,title=name+'：叠影效果与晋阶材料',summary=summary,region='国服名称；公开数据交叉核对',checkedAt='2026-11-25',facts=[{'text':t} for t in facts],boundary=boundary,sources=sources,_status='published'))
 proof.append(dict(id=id,slug=slug,name=name,rarity=meta['rarity'],path=path,level80IntegerStats=stats,params=rank['params'],ascensions=pr['materials'][:6],materialSourcesAgree=True,precisionDifference='S2 37.5%, S4 52.5%; BWIKI displays 37%,52%' if id=='23054' else None))
(root/'batch.json').write_text(json.dumps({'updates':[],'creates':rows},ensure_ascii=False,indent=2)+'\n')
(root/'source-comparison.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(rows),'records; all six ascension rows matched both sources')
