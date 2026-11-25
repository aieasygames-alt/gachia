import json,pathlib,hashlib,urllib.parse,re
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent;repo=root.parent.parent
assert not (root/'batch.json').exists(), 'Reviewed batch already exists; preserve receipts and prepare a new batch instead.'
read=lambda p:json.loads(p.read_text())
def write(n,x):(root/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
items=read(root/'.private/cn-items.json');en=read(root/'.private/en-items.json');before=read(root/'cloud-before.json')['docs']
slugs=['extinguished-acorn','kindled-acorn','scorched-acorn','artifexs-module','artifexs-cyberheart','artifexs-gyreheart','dream-collection-plan','dream-fire','dream-element']
ids=['111001','111002','111003','113011','113012','113013','114001','114002','114003']
families=[['shattered-home','day-one-of-my-new-life','cornucopia'],['shadowed-by-night'],['along-the-passing-shore','indelible-promise']]
# Resolve equipment slugs from the already reviewed names, avoiding guessed routes.
names=[['乐圮','余生的第一天','嘉果'],['黑夜如影随行'],['行于流逝的岸','铭记于心的约定']]
families=[[next(d['slug'] for d in before if d['kind']=='equipment' and d['title'].split('：')[0]==n) for n in ns] for ns in names]
registry={slug:{'name':items[sid]['name'],'sourceId':sid,'equipment':families[i//3]} for i,(slug,sid) in enumerate(zip(slugs,ids))}
write('material-registry-new.json',registry)
allregistry={**read(root.parent/'starrail-materials-2026-11-25/material-registry.json'),**registry};write('material-registry.json',allregistry)
(repo/'packages/data/cms/starrail-materials.ts').write_text('// Explicit route ownership and verified light-cone relationships; withdrawal never restores legacy data.\nexport const STARRAIL_CMS_MATERIALS = '+json.dumps(allregistry,ensure_ascii=False,indent=2)+' as const;\nexport function isStarRailCmsMaterial(id: string): id is keyof typeof STARRAIL_CMS_MATERIALS {\n  return Object.hasOwn(STARRAIL_CMS_MATERIALS, id);\n}\n')
creates=[];comparisons=[];repairs=[];rawpath=repo/'packages/data/games/starrail/raw-materials.json';rows=read(rawpath)
pinned='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/items.json'
for slug,entry in registry.items():
 sid=entry['sourceId'];item=items[sid];name=item['name'];s=BeautifulSoup((root/'.private'/f'{name}.html').read_bytes(),'html.parser')
 assert s.select_one('#firstHeading').get_text(strip=True)==name
 t={th.get_text(strip=True):th.find_next_sibling() for th in s.select('th') if th.find_next_sibling()};routes=t['获取途径'].get_text(' ',strip=True)
 assert t['稀有度'].select_one('img')['alt']==str(item['rarity'])+'星.png'
 assert all(x in routes for x in item['come_from']),(name,routes,item['come_from'])
 extra=routes
 for x in item['come_from']:extra=extra.replace(x,'')
 old=next(x for x in rows if x['id']==slug)
 correction=f'旧记录名称「{old["name"]}」修正为「{name}」。' if old['name']!=name else ''
 correction+='旧记录的统一获取来源已改为本页逐种来源；不把拟造花萼（赤）当作本系列通用入口。' if '（赤）' in old['source'] else '旧记录的来源改为逐种核对的敌人类别、宇宙掉落和其他来源。'
 cond='本条为2星基础材料，来源含委托、余烬兑换及拟造花萼（金）；不能据此推断同系列高阶材料也由这些入口直接掉落。' if item['rarity']==2 else f'本条{item["rarity"]}星材料的常规敌人掉落要求突破至均衡等级{2 if item["rarity"]==3 else 4}后；该条件不等同于全部来源共用同一解锁要求。'
 facts=[{'text':f'材料身份\n{name}，{item["rarity"]}星。通用敌人掉落材料，可用于使用该系列的部分角色晋阶、行迹和光锥晋阶；具体需求须按角色或光锥核对。'},{'text':'已交叉核对的获取途径\n'+'；'.join(item['come_from'])+'。'},{'text':'获取条件与刷取边界\n'+cond+'具体敌人、关卡开放难度和可得数量请以当前客户端为准；不提供固定掉率或保底次数。'},{'text':'商店、合成与置换\n来源中的余烬兑换不表示当前库存、价格或限购次数已核准；合成与置换按逐种列表保留，转换比例、信用点消耗和解锁条件以当前客户端配方为准。'},{'text':'旧资料修正\n'+correction}]
 uses=[]
 for d in before:
  if d['slug'] not in entry['equipment']:continue
  total=next((f['text'] for f in d['facts'] if '合计' in f['text'].split('\n')[0] and name in f['text']),None)
  assert total,(name,d['slug'])
  m=re.search(re.escape(name)+r'[×x]\s*([\d,]+)',total);assert m
  uses.append(d['title'].split('：')[0]+'：'+name+'×'+m[1])
 facts.append({'text':'已核验光锥的六次晋阶用量示例\n'+'；'.join(uses)+'。这里只汇总光锥六次晋阶，不含升级经验、喂经验信用点或角色行迹用量；单件完整材料见关联光锥详情。'})
 boundary='截至2026-11-25，以BWIKI材料详情与StarRailRes固定提交交叉核对名称、稀有度和上述主要来源；两站可能共用游戏数据，不代表官方逐项认证或客户端实测。未核准全部角色用量、刷取掉率、具体关卡难度、合成/置换成本及商店即时库存。'
 if extra.strip():boundary+='BWIKI还列出「'+extra.strip()+'」，本批未完成独立核对，未纳入已核验获取途径。'
 creates.append({'gameId':'starrail','locale':'zh','kind':'material','slug':slug,'title':name+'：用途与获取途径','summary':f'{item["rarity"]}星{name}材料，整理敌人掉落、宇宙与其他来源、均衡条件及关联光锥晋阶数量。','region':'国服材料名称；公开数据交叉核对','checkedAt':'2026-11-25','facts':facts,'boundary':boundary,'sources':[{'url':'https://wiki.biligame.com/sr/'+urllib.parse.quote(name)},{'url':pinned}],'_status':'published'})
 comparisons.append({'id':sid,'slug':slug,'name':name,'rarity':item['rarity'],'bwikiHeading':name,'bwikiRarity':t['稀有度'].select_one('img')['alt'],'pinnedRoutes':item['come_from'],'bwikiRoutesText':routes,'allPinnedRoutesAppearInBwiki':True,'bwikiAdditionalNotCrossVerified':extra.strip(),'relatedPublishedCones':entry['equipment']})
 after={**old,'name':name,'nameEn':en[sid]['name'],'type':'common','rarity':item['rarity'],'source':'；'.join(item['come_from']),'sourceEn':'; '.join(en[sid]['come_from'])};rows[rows.index(old)]=after
 repairs.append({'id':slug,'sourceId':sid,'before':old,'after':after})
write('source-comparison.json',comparisons);write('compatibility-repairs.json',repairs);write('batch.json',{'updates':[],'creates':creates})
text=json.dumps(rows,ensure_ascii=False,indent=2)+'\n';rawpath.write_text(text);(repo/'apps/web/public/data/starrail/raw-materials.json').write_text(text)
p=repo/'packages/data/cms/starrail-updates.ts';text=p.read_text();needle='  //';index=text.index("  'https://wiki.biligame.com/sr/")
text=text[:index]+''.join("  '"+d['sources'][0]['url']+"',\n" for d in creates)+text[index:];p.write_text(text)
print('Prepared 9 source-checked material corrections, 18 owned material routes')
