# -*- coding: utf-8 -*-
import pathlib,json,re,hashlib
from decimal import Decimal,ROUND_HALF_UP
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
p=read('batch.json')['creates'][0]['characterData'];e=read('browser-source-evidence.json')
for row in e['stationSkillCosts']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)"',row['buttons'])]
 assert sorted(observed)==sorted(c['quantity'] for c in p['skills'][row['skill']]['upgrades'][row['to']-2]['materials']),row
order=['1501101','1501203','1501204','1501102','1501205','1501206','1501207','1501103','1501208','1501209','1501210','1501201','1501202']
for row in e['stationNodes']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)":',row['modal'])][::2]
 node=next(n for n in p['nodes'] if n['id']==order[row['index']]);assert sorted(observed)==sorted(c['quantity'] for c in node['materials']),node
for row in e['materialNames']:
 names=[c['name'] for c in p['skills'][row['skill']]['upgrades'][row['to']-2]['materials']]
 assert any('- generic: '+name+'\n- button \"Close\":' in row['snapshot'] for name in names),row
conflicts=[];matched=0;precision=[]
markers=['哑火了吗','尖叫！火花花连线中','万我狂欢，镜头不要停','幕后花手','信号溢出：好戏返场！']
for i,typ in enumerate(['pugong','zhanji','zhongjieji','tianfu','huanyuji']):
 tables=next(x for x in e['bwikiPanels'] if x['type']==typ)['tables'];rows=([tables[0][1],tables[1][1],tables[1][2]] if i==0 else tables[0][1:])
 for level in p['skills'][i]['levels']:
  station=next(x['snapshot'] for x in e['stationLevels'] if x['skill']==i and x['level']==level['level']);section=station[station.index('- img "'+markers[i]+'"'):].split('- slider')[0]
  observed=[Decimal(x) for x in re.findall(r'- generic: ([\d.]+)%',section)]
  wanted=[Decimal(v.rstrip('%')) for v in level['values']]
  rounded=[v.quantize(Decimal('.01'),rounding=ROUND_HALF_UP) for v in wanted]
  assert observed==rounded,(i,level['level'],observed,rounded)
  for j,v in enumerate(wanted):
   wiki=rows[j][level['level']];w=Decimal(wiki.rstrip('%'))
   if w==v:matched+=1
   else:conflicts.append({'skill':p['skills'][i]['key'],'column':j,'level':level['level'],'bwiki':wiki,'adopted':level['values'][j]})
   if v!=rounded[j]:precision.append({'skill':p['skills'][i]['key'],'level':level['level'],'column':j,'adopted':level['values'][j],'station':str(observed[j])+'%'})
rows=next(t['rows'] for t in e['bwikiTables'] if t['rows'][0]==['20级','30级','40级'])
for asc,text in zip(p['ascensions'],rows[1]+rows[3]):
 for c in asc['materials']:assert str(c['quantity'])+c['name'] in text,(asc,text)
result={'status':'passed','stationAdjacentSkillRanges':len(e['stationSkillCosts']),'stationNodes':len(e['stationNodes']),'bwikiAscensions':6,'stationMultiplierCells':matched+len(conflicts),'bwikiMultiplierValuesMatched':matched,'multiplierDifferencesRecorded':conflicts,'higherPrecisionFromBwiki':precision,'costResolution':'Station adjacent ranges and all 13 nodes match pinned data. BWIKI generic costs and differing node templates not used.','precisionResolution':'Use recorded Station/pinned precision for skill/talent; BWIKI explicit longer decimals for elation. Fixed JSON keeps four decimal places; no inferred extra skill precision.','independence':'Third-party displays and extracted data may share upstream; no independent official confirmation claim.'}
assert result['stationMultiplierCells']==129
(r/'source-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
old=r.parent/'starrail-yaoguang-2026-11-26';source={'checkedAt':'2026-11-26','pin':'03907e798b46f9eb109a1f882055cdf49ce3d374','urls':read('batch.json')['creates'][0]['sources'],'sourceSHA256':{n:hashlib.sha256((old/('data-'+n+'.json')).read_bytes()).hexdigest() for n in ['characters','character_skills','character_skill_trees','character_promotions','items']},'thirdParty':True,'comparison':result}
(r/'sources.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
