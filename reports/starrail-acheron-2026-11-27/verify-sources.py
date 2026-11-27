# -*- coding: utf-8 -*-
import pathlib,json,re,hashlib
from decimal import Decimal
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
p=read('batch.json')['creates'][0]['characterData'];e=read('browser-source-evidence.json')
for row in e['stationSkillCosts']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)"',row['buttons'])]
 assert sorted(observed)==sorted(c['quantity'] for c in p['skills'][row['skill']]['upgrades'][row['to']-2]['materials']),row
for row in e['stationSkillCosts']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)"',row['buttons'])]
 pairs=[]
 for nameRow in [x for x in e['materialNames'] if x['skill']==row['skill'] and x['to']==row['to']]:
  name=re.findall(r'- generic: ([^\n]+)\n- button "Close":',nameRow['snapshot'])[-1]
  pairs.append((name,observed[nameRow['index']]))
 assert sorted(pairs)==sorted((c['name'],c['quantity']) for c in p['skills'][row['skill']]['upgrades'][row['to']-2]['materials']),pairs
order=['1308101','1308202','1308203','1308204','1308102','1308205','1308206','1308207','1308103','1308208','1308209','1308201','1308210']
for row in e['stationNodes']:
 observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)":',row['modal'])][::2]
 node=next(n for n in p['nodes'] if n['id']==order[row['index']]);assert sorted(observed)==sorted(c['quantity'] for c in node['materials']),node
for row in e['stationNodes']:
 node=next(n for n in p['nodes'] if n['id']==order[row['index']]);observed=[int(n.replace(',','')) for n in re.findall(r'- button "([\d,]+)":',row['modal'])][::2]
 pairs=[]
 for nameRow in [x for x in e['nodeMaterialNames'] if x['node']==row['index']]:
  name=re.findall(r'- generic: ([^\n]+)\n- button "Close":',nameRow['snapshot'])[-1]
  pairs.append((name,observed[nameRow['index']]))
 assert sorted(pairs)==sorted((c['name'],c['quantity']) for c in node['materials']),(node,pairs)
conflicts=[];matched=0
markers=['三途枯榷','八雷飞渡','残梦尽染，一刀缭断','红叶时雨，万倾一空']
for i,typ in enumerate(['pugong','zhanji','zhongjieji','tianfu']):
 rows=next(x for x in e['bwikiPanels'] if x['type']==typ)['tables'][0][1:]
 for level in p['skills'][i]['levels']:
  station=next(x['snapshot'] for x in e['stationLevels'] if x['skill']==i and x['level']==level['level']);section=station[station.index('- img "'+markers[i]+'"'):].split('- slider')[0]
  observed=[Decimal(x) for x in re.findall(r'- generic: ([\d.]+)%',section)];wanted=[Decimal(v.rstrip('%')) for v in level['values']]
  assert observed==wanted,(i,level['level'],observed,wanted)
  for j,v in enumerate(wanted):
   wiki=rows[j][level['level']];w=Decimal(wiki.split('%')[0])
   if w==v:matched+=1
   else:conflicts.append({'skill':p['skills'][i]['key'],'column':j,'level':level['level'],'bwiki':wiki,'adopted':level['values'][j]})
rows=next(t['rows'] for t in e['bwikiTables'] if t['rows'][0]==['20级','30级','40级'])
for asc,text in zip(p['ascensions'],rows[1]+rows[3]):
 for c in asc['materials']:assert str(c['quantity'])+c['name'] in text,(asc,text)
for key,text in [('ewai1','赤鬼'),('ewai2','奈落'),('ewai3','雷心')]:
 panel=next(x['text'] for x in e['bwikiPanels'] if x['type']==key);node=next(n for n in p['nodes'] if n['name'].startswith(text))
 for c in node['materials']:assert str(c['quantity'])+c['name'] in panel,(node,c)
result={'status':'passed','stationAdjacentSkillRanges':len(e['stationSkillCosts']),'stationSkillMaterialIdentities':len(e['materialNames']),'stationNodes':len(e['stationNodes']),'stationNodeMaterialIdentities':len(e['nodeMaterialNames']),'bwikiAscensions':6,'stationMultiplierCells':matched+len(conflicts),'bwikiMultiplierValuesMatched':matched,'multiplierDifferencesRecorded':conflicts,'costResolution':'All adjacent ranges, individual material names and 13 nodes match pinned data. BWIKI ascensions and three major node costs also agree.','precisionResolution':'Station visible decimals agree exactly with pinned Acheron params; BWIKI one-decimal truncations recorded.','independence':'Third-party displays and extracted data may share upstream; no independent official confirmation claim.'}
assert result['stationMultiplierCells']==115
(r/'source-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
old=r.parent/'starrail-yaoguang-2026-11-26';source={'checkedAt':'2026-11-27','pin':'03907e798b46f9eb109a1f882055cdf49ce3d374','urls':read('batch.json')['creates'][0]['sources'],'sourceSHA256':{n:hashlib.sha256((old/('data-'+n+'.json')).read_bytes()).hexdigest() for n in ['characters','character_skills','character_skill_trees','character_promotions','items']},'thirdParty':True,'comparison':result}
(r/'sources.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
