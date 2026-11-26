"""Compare recorded browser tables/ranges against reviewed CMS fields."""
import json,pathlib,re,collections
from decimal import Decimal
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
evidence=read('browser-source-evidence.json');profile=read('batch.json')['creates'][0]['characterData']
for row in evidence['stationSkillCosts']:
 actual=profile['skills'][row['skill']]['upgrades'][row['to']-2]['materials']
 observed=row.get('quantities') or [int(x.replace(',','')) for x in re.findall(r'- button "([\d,]+)"',row['buttons'])]
 assert sorted(observed)==sorted(c['quantity'] for c in actual),row
nodeOrder=['1502101','1502203','1502204','1502102','1502205','1502206','1502207','1502103','1502208','1502209','1502210','1502201','1502202']
for row in evidence['stationNodes']:
 observed=[int(x.replace(',','')) for x in re.findall(r'- button "([\d,]+)":',row['modal'])][::2]
 node=next(n for n in profile['nodes'] if n['id']==nodeOrder[row['index']])
 assert sorted(observed)==sorted(c['quantity'] for c in node['materials']),node
conflicts=[];matched=0
for i,typ in enumerate(['pugong','zhanji','zhongjieji','tianfu','huanyuji']):
 table=next(p for p in evidence['bwikiPanels'] if p['type']==typ)['tables'][0]
 for level in profile['skills'][i]['levels']:
  for j,value in enumerate(level['values']):
   wiki=table[j+1][level['level']]
   if Decimal(wiki.rstrip('%'))==Decimal(value.rstrip('%')):matched+=1
   else:conflicts.append({'skill':profile['skills'][i]['key'],'level':level['level'],'bwiki':wiki,'adopted':value})
assert conflicts==[{'skill':'elation','level':7,'bwiki':'81.125%','adopted':'81.25%'}]
rows=read('bwiki-ascensions.json')['rows'];cells=rows[1]+rows[3]
for ascension,text in zip(profile['ascensions'],cells):
 for cost in ascension['materials']:assert str(cost['quantity'])+cost['name'] in text
full=collections.Counter()
for a in profile['ascensions']:full.update({c['name']:c['quantity'] for c in a['materials']})
assert all(str(q)+name in rows[-1][0] for name,q in full.items())
result={'status':'passed','stationAdjacentSkillRanges':41,'stationNodes':13,'bwikiAscensions':6,'bwikiMultiplierValuesMatched':matched,'multiplierConflictResolved':conflicts,'costResolution':'Station quantities match pinned data at every range and node; Bwiki generic costs rejected. Displayed third-party sources may share upstream; not independent official evidence.'}
(r/'source-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)
