# -*- coding: utf-8 -*-
"""Check all observed browser ranges, nodes, multiplier cells and ascensions."""
import pathlib,json,re,hashlib
from decimal import Decimal, ROUND_HALF_UP
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
p=read('batch.json')['creates'][0]['characterData'];e=read('browser-source-evidence.json')
for row in e['stationSkillCosts']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)"',row['buttons'])]
 assert sorted(observed)==sorted(c['quantity'] for c in p['skills'][row['skill']]['upgrades'][row['to']-2]['materials']),row
order=['1506101','1506203','1506204','1506102','1506205','1506206','1506207','1506103','1506208','1506209','1506210','1506201','1506202']
for row in e['stationNodes']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)":',row['modal'])][::2]
 node=next(n for n in p['nodes'] if n['id']==order[row['index']])
 assert sorted(observed)==sorted(c['quantity'] for c in node['materials']),node
conflicts=[];matched=0
for i,typ in enumerate(['pugong','zhanji','zhongjieji','tianfu','huanyuji']):
 panel=next(n for n in e['bwikiPanels'] if n['type']==typ)
 tables=panel['tables'];rows=([tables[0][1],tables[1][1],tables[1][2]] if i==0 else tables[0][1:])
 for level in p['skills'][i]['levels']:
  station=next(x for x in e['stationLevels'] if x['skill']==i and x['level']==level['level'])['snapshot']
  marker='- img "'+(['拳头硬了！','Shoot属性大爆发','无敌玩家，启动！','有我在，把把都是顺风局','殿堂级操作回放'][i])+'"'
  section=station[station.index(marker):].split('- slider')[0]
  for j,value in enumerate(level['values']):
   stationValue = str(Decimal(value.rstrip('%')).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP)).rstrip('0').rstrip('.')+'%' if value in ['73.125%','84.375%'] else value
   assert stationValue in section,(i,level['level'],value)
   wiki=rows[j][level['level']]
   if Decimal(wiki.rstrip('%'))==Decimal(value.rstrip('%')):matched+=1
   else:conflicts.append({'skill':p['skills'][i]['key'],'level':level['level'],'bwiki':wiki,'adopted':value})
assert conflicts==[{'skill':'talent','level':7,'bwiki':'32%','adopted':'32.5%'},{'skill':'talent','level':9,'bwiki':'37%','adopted':'37.5%'}],conflicts
rows=next(t['rows'] for t in e['bwikiTables'] if t['rows'][0]==['20级','30级','40级'])
for asc,text in zip(p['ascensions'],rows[1]+rows[3]):
 for cost in asc['materials']:assert str(cost['quantity'])+cost['name'] in text,(asc,text)
result={'status':'passed','stationAdjacentSkillRanges':41,'stationNodes':13,'bwikiAscensions':6,'stationMultiplierCells':matched+len(conflicts),'bwikiMultiplierValuesMatched':matched,'multiplierConflictsResolved':conflicts,'costResolution':'Station adjacent ranges and nodes match pinned data. Bwiki generic cost templates and extra ability costs rejected.','precisionResolution':{'ultimateAndElationLv7':{'bwiki':'73.125%','station':'73.13%','pinned':'73.12%','adopted':'73.125%'},'ultimateAndElationLv9':{'bwiki':'84.375%','station':'84.38%','pinned':'84.38%','adopted':'84.375%'}},'independence':'Third-party displays and extracted game data may share upstream; no independent official confirmation claim.'}
(r/'source-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
old=r.parent/'starrail-yaoguang-2026-11-26'
source={'checkedAt':'2026-11-26','pin':'03907e798b46f9eb109a1f882055cdf49ce3d374','urls':read('batch.json')['creates'][0]['sources'],'sourceSHA256':{n:hashlib.sha256((old/('data-'+n+'.json')).read_bytes()).hexdigest() for n in ['characters','character_skills','character_skill_trees','character_promotions','items']},'thirdParty':True,'comparison':result}
(r/'sources.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n');print(result)
