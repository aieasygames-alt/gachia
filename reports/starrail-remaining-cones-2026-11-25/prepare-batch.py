"""Build the reviewed editorial batch and repair scoped compatibility snapshots."""
import json,pathlib,collections,math,re,decimal
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent;repo=root.parent.parent
read=lambda n:json.loads((root/'.private'/n).read_text())
identity=read('light_cones.json');ranks=read('light_cone_ranks.json');promotions=read('light_cone_promotions.json');items=read('items.json')
secondary=json.loads((root/'secondary-source-reads.json').read_text());primary=json.loads((root/'source-reads.json').read_text())
ids=[('21020','geniuses-repose'),('21047','shadowed-by-night'),('23024','along-the-passing-shore'),('23015','brighter-than-the-sun'),('23010','before-dawn'),('21042','indelible-promise'),('20009','shattered-home'),('20008','fine-fruit'),('21002','day-one-of-my-new-life')]
paths={'Mage':('智识','erudition'),'Rogue':('巡猎','hunt'),'Warrior':('毁灭','destruction'),'Warlock':('虚无','nihility'),'Priest':('丰饶','abundance'),'Knight':('存护','preservation'),'Elation':('欢愉','elation')}
official='https://act.mihoyo.com/puzzle/hkrpg/e20261024version_2142940ddd/index.html'
notes={
'21020':'暴击伤害加成需要装备者消灭敌方目标后触发，持续3回合；不按全队任意击杀自动常驻处理。',
'21047':'进入战斗时或造成击破伤害后触发速度提高，持续2回合，每回合只可触发1次；不将持续时间误写成永久速度。',
'23024':'【泡影】持续1回合，每次攻击对每个目标只触发1次。对【泡影】目标的伤害提高与终结技额外伤害提高均保留，不能只保留常驻暴伤。',
'23015':'触发【龙吟】的是普攻，每次获得1层，持续2回合，最多2层。下列攻击与回能加成均为每层数值，不把施放战技当作触发条件。',
'23010':'施放战技或终结技后获得【梦身】，触发追加攻击时消耗【梦身】，提高该追加攻击伤害；不将其解释为所有追加攻击无条件常驻加成。',
'21042':'原旧条目误名为余生的第一天。本光锥属于毁灭；施放终结技后提高暴击率，持续2回合，不能写成战技触发攻击力提高。',
'20009':'原旧条目误名为嘉果。乐圮属于毁灭，判断的是目标当前生命值百分比严格大于50%；恰好50%不满足该条件，不按精英或首领身份判定。',
'20008':'嘉果属于丰饶，战斗开始时立即为全队恢复能量；不提高攻击力，不按每回合开始重复恢复处理。',
'21002':'防御力提高属于装备者；入战后全队提高的是全属性抗性，同类技能无法重复生效，不是效果抵抗。',
}
precision={
 '21042':'BWIKI正文将叠影2/3/4暴击率显示为18%/22%/26%；StarRailRes公开参数为0.1875/0.225/0.2625。本页保留18.75%/22.5%/26.25%的参数精度，尚未进行客户端实测。',
 '20008':'BWIKI正文将叠影2/4恢复能量显示为7/10点；StarRailRes公开参数为7.5/10.5。本页保留7.5/10.5点参数精度，尚未进行客户端实测。',
}
def render(desc,params):
 def sub(m):
  value=decimal.Decimal(str(params[int(m[1])-1]))*(100 if m[2] else 1)
  return format(value.normalize(),'f')+m[2]
 return re.sub(r'#(\d+)\[(?:i|f\d+)\](%?)',sub,desc)
rows=[];proof=[]
for id,slug in ids:
 meta=identity[id];rank=ranks[id];pr=promotions[id];name=meta['name'];path=paths[meta['path']][0]
 soup=BeautifulSoup((root/'.private'/(name+'.html')).read_text(),'html.parser');main=soup.select_one('.mw-parser-output').get_text(' ',strip=True)
 assert f"{meta['rarity']}星.png" in str(soup)
 stats=[math.floor(pr['values'][6][k]['base']+79*pr['values'][6][k]['step']+1e-7) for k in ['hp','atk','def']]
 assert all(str(n) in main for n in stats)
 facts=[f'装备身份与80级面板\n{meta["rarity"]}星{path}光锥，技能「{rank["skill"]}」。80级生命值{stats[0]}、攻击力{stats[1]}、防御力{stats[2]}，采用整数显示口径；技能效果仅对{path}命途生效。','机制与旧资料校正\n'+notes[id]]
 if id in precision:facts+=['显示精度说明\n'+precision[id]]
 for i,params in enumerate(rank['params'],1):facts+=[f'叠影{i}\n'+render(rank['desc'],params)]
 if id in ['23024','23015','23010']:
  facts+=['获取与第二期复刻\n限定跃迁。国服4.7官方专题列本轮第二期为2026/12/02 12:00至2026/12/22 15:00。核验日2026/11/25时尚未开始；专题未标注时区，不推导其他区服时间。']
 elif id in ['21020','21047']:
  facts+=['获取与当前UP\n获取途径为跃迁，4.7官方专题列为本轮光锥跃迁四星UP之一；不据此推算单件概率、保底或限定性，实际范围以游戏内跃迁详情为准。']
 elif id=='20008':facts+=['获取途径\nBWIKI列为跃迁和「行动摘要（三）」任务奖励。本次只核对奖励来源名称，未核准当前账号任务解锁资格及奖励领取状态。']
 else:facts+=['获取途径\nBWIKI列为跃迁；本页未核准2026/11/25是否在具体卡池UP，不把历史跃迁记录表述为当前限时推荐。']
 table=soup.find(id='晋阶材料').find_next('table');names=[a['title'] for a in table.select('a[title]')];numbers=[int(x.replace(',','')) for x in table.stripped_strings if x.replace(',','').isdigit()]
 expected_names=[];expected_nums=[];totals=collections.Counter()
 for level,mats in zip([20,30,40,50,60,70],pr['materials'][:6]):
  ordered=[m for m in mats if m['id']!='2']+[m for m in mats if m['id']=='2']
  expected_names.extend(items[m['id']]['name'] for m in ordered);expected_nums.extend(m['num'] for m in ordered)
  facts+=[f'{level}级晋阶\n'+'；'.join(f'{items[m["id"]]["name"]}×{m["num"]:,}' for m in ordered)+'。']
  for m in mats:totals[m['id']]+=m['num']
 assert names==expected_names,(name,names,expected_names)
 assert numbers==expected_nums,(name,numbers,expected_nums)
 facts+=['六次晋阶合计\n'+'；'.join(f'{items[k]["name"]}×{v:,}' for k,v in totals.items())+'。仅计晋阶，不含升级经验、喂经验信用点与叠影获取成本。']
 sources=[{'url':next(s['url'] for s in primary if s['name']==name)}]+[{'url':s['url']} for s in secondary]
 if id in ['23024','23015','23010','21020','21047']:sources+=[{'url':official}]
 boundary='名称、命途、叠影效果、整数面板与六次晋阶材料对照BWIKI和固定版本StarRailRes公开数据；两者可能使用共同游戏数据，不代表官方逐项确认或客户端实测。'
 if id in precision:boundary+='正文保留公开参数的小数精度，并说明与百科整数显示的差异。'
 if id in ['23024','23015','23010','21020','21047']:boundary+='官方专题仅用于本轮跃迁名单与日程。'
 boundary+='不推断专属、配装排名、最终伤害收益或抽取建议；未核准账号领取资格或当前商店库存。核验日期为2026/11/25。'
 summary=f'{meta["rarity"]}星{path}光锥：补齐叠影1—5、触发条件、80级整数面板、六次晋阶材料与合计。'+('说明公开参数与百科整数显示差异。' if id in precision else '')
 rows.append(dict(gameId='starrail',locale='zh',kind='equipment',slug=slug,title=name+'：叠影效果与晋阶材料',summary=summary,region='国服名称；公开数据交叉核对',checkedAt='2026-11-25',facts=[{'text':t} for t in facts],boundary=boundary,sources=sources,_status='published'))
 effect=main[main.index('技能名称'):main.index('获取途径',main.index('技能名称'))]
 proof.append(dict(id=id,slug=slug,name=name,rarity=meta['rarity'],path=path,level80IntegerStats=stats,bwikiSkillText=effect,params=rank['params'],ascensions=pr['materials'][:6],materialSourcesAgree=True,precisionDifference=precision.get(id)))
(root/'batch.json').write_text(json.dumps({'updates':[],'creates':rows},ensure_ascii=False,indent=2)+'\n')
(root/'source-comparison.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
# Compatibility data is repaired only for reviewed identities, including three from the prior batch.
# The live CMS routes remain authoritative; these snapshots do not serve as withdrawal fallback.
en=read('en-light_cones.json');enr=read('en-light_cone_ranks.json')
repairs={slug:id for id,slug in ids}|{'trend-of-the-universal-market':'21016','she-already-shut-her-eyes':'23011','welcome-to-the-cosmic-city':'23057'}
p=repo/'packages/data/games/starrail/raw-light-cones.json';data=json.loads(p.read_text());receipt=[]
for row in data:
 if row['id'] not in repairs:continue
 before=dict(row);id=repairs[row['id']];meta=identity[id];pr=promotions[id]
 stats=[math.floor(pr['values'][6][k]['base']+79*pr['values'][6][k]['step']+1e-7) for k in ['hp','atk','def']]
 row.update(name=meta['name'],nameEn=en[id]['name'],rarity=meta['rarity'],path=paths[meta['path']][1],baseHp=stats[0],baseAtk=stats[1],baseDef=stats[2],effectName=ranks[id]['skill'],effectNameEn=enr[id]['skill'],effectDescription=render(ranks[id]['desc'],ranks[id]['params'][0]),effectDescriptionEn=render(enr[id]['desc'],enr[id]['params'][0]))
 if id=='23011':row['signatureCharacter']=None
 receipt.append({'id':row['id'],'sourceId':id,'before':before,'after':dict(row)})
assert len(receipt)==9
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');(repo/'apps/web/public/data/starrail/raw-light-cones.json').write_bytes(p.read_bytes())
(root/'compatibility-repairs.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(rows),'CMS records; repaired',len(receipt),'compatibility entries; all ascensions crosschecked')
