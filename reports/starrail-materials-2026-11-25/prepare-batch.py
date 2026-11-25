import json,pathlib,hashlib,urllib.parse,re
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent;repo=root.parent.parent
read=lambda p:json.loads(p.read_text())
def write(name,data):(root/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
registry=read(root/'material-registry.json');items=read(root/'.private/cn-items.json');english=read(root/'.private/en-items.json')
previous=read(root.parent/'starrail-remaining-cones-2026-11-25/cloud-after.json')['docs'];reads=[];comparison=[];creates=[]
pinned='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/items.json'
for slug,entry in registry.items():
 sid=entry['sourceId'];item=items[sid];name=item['name'];data=(root/'.private'/f'{name}.html').read_bytes();soup=BeautifulSoup(data,'html.parser')
 table={th.get_text(strip=True):th.find_next_sibling() for th in soup.select('th') if th.find_next_sibling()}
 bwikiRoutes=table['获取途径'].get_text(' ',strip=True);rarity=table['稀有度'].select_one('img')['alt'];assert rarity==str(item['rarity'])+'星.png'
 assert all(route in bwikiRoutes for route in item['come_from']),name
 description=table['类型'].get_text(' ',strip=True)
 sources=[{'url':'https://wiki.biligame.com/sr/'+urllib.parse.quote(name)},{'url':pinned}]
 reads.append({'name':name,'url':sources[0]['url'],'status':200,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'transport':'ordinary HTTPS proxy read after initial direct 567' if sid=='110113' else 'ordinary direct public HTTPS'})
 extra=bwikiRoutes
 for route in item['come_from']:extra=extra.replace(route,'')
 comparison.append({'id':sid,'slug':slug,'name':name,'rarity':item['rarity'],'bwikiRarity':rarity,'bwikiType':description,'pinnedRoutes':item['come_from'],'bwikiRoutesText':bwikiRoutes,'allPinnedRoutesAppearInBwiki':True,'bwikiAdditionalNotCrossVerified':extra.strip(),'relatedPublishedCones':entry['equipment']})
 family='永寿' if sid.startswith('113') else '残刃' if sid.startswith('11011') else '钥匙'
 kind='通用敌人掉落材料，可用于部分角色晋阶、行迹及部分光锥晋阶；不是某一种命途角色通用的全部需求。' if family=='永寿' else ('毁灭' if family=='残刃' else '智识')+'行迹与光锥晋阶材料；仅对应使用该系列的具体角色或光锥，不把同命途所有新旧装备视为共用同一系列。'
 facts=[{'text':f'材料身份\n{name}，{item["rarity"]}星。{kind}'},{'text':'已交叉核对的获取途径\n'+'；'.join(item['come_from'])+'。'}]
 if family=='永寿':
  scope='幼芽有委托、余烬兑换和拟造花萼（金）来源；不据此推断天华、荣枝也从同一关卡直接掉落。天华和荣枝的丰饶孽物掉落分别要求突破至均衡等级2、4后；具体敌人、关卡和可得数量以当前客户端为准。'
  correction='旧资料把三种永寿材料的拟造花萼来源统一写作（赤），本次撤下该通用说法；保留上述逐种来源及均衡条件。'
 else:
  place='收容舱段' if family=='残刃' else '铆钉镇'
  scope=f'刷取入口为拟造花萼【{place}】；不能据材料同命途就混用其他地区的新系列。稀有度较高的材料是否直接掉落、开放难度和每次产出须查看当前客户端，本页不提供固定掉率或保底次数。'
  correction='旧材料库未收录本条独立记录；新增稳定详情与已核验光锥之间的获取途径入口。'
 facts.extend([{'text':'获取条件与刷取边界\n'+scope},{'text':'商店、合成与置换\n来源列表中的余烬兑换不代表当前商店库存、兑换价格或剩余次数已核准；合成与置换按列表分别保留，本批未核准转换比例、信用点消耗或解锁等级，不自行补写。'},{'text':'旧资料修正\n'+correction}])
 # Quote only previously reviewed six-stage ascension totals for related cones.
 uses=[]
 for d in previous:
  if d['slug'] not in entry['equipment']:continue
  totals=[f['text'] for f in d['facts'] if ('合计' in f['text'].split('\n')[0]) and name in f['text']]
  if totals:
   match=re.search(re.escape(name)+r'[×x]\s*([\d,]+)',totals[0]);assert match,(name,d['slug'],totals)
   uses.append(d['title'].split('：')[0]+'：'+name+'×'+match[1])
 if uses:facts.append({'text':'已核验光锥的六次晋阶用量示例\n'+'；'.join(uses)+'。这里只汇总光锥六次晋阶，不含升级经验、喂经验信用点或角色行迹用量；单件完整材料见关联光锥详情。'})
 boundary='截至2026-11-25，以BWIKI材料详情与StarRailRes固定提交交叉核对身份、稀有度和上述主要来源；两站可能共用游戏数据，不代表官方逐项认证或客户端实测。未核准全部角色用量、刷取掉率、具体关卡难度、合成/置换成本及商店即时库存。'
 if extra.strip():boundary+='BWIKI还列出「'+extra.strip()+'」，本批未完成独立核对，未纳入已核验获取途径。'
 creates.append({'gameId':'starrail','locale':'zh','kind':'material','slug':slug,'title':name+'：用途与获取途径','summary':f'{item["rarity"]}星{name}材料，整理主要获取来源、适用条件与关联光锥晋阶用量；不推断掉率、合成成本或商店即时库存。','region':'国服材料名称；公开数据交叉核对','checkedAt':'2026-11-25','facts':facts,'boundary':boundary,'sources':sources,'_status':'published'})
for d in creates:
 if d['slug'] not in ['immortal-scionette','immortal-flower','immortal-leaf']: d['facts']=[f for f in d['facts'] if not f['text'].startswith('旧资料修正')]
 for f in d['facts']: f['text']=f['text'].replace('不自行补写。','请以当前客户端配方和解锁条件为准。')
write('source-reads.json',reads);write('source-comparison.json',comparison);write('batch.json',{'updates':[],'creates':creates})
# Compatibility only: preserve the three existing stable IDs and add six reviewed names.
rawpath=repo/'packages/data/games/starrail/raw-materials.json';rows=read(rawpath);repairs=[]
for slug,entry in registry.items():
 sid=entry['sourceId'];cn=items[sid];en=english[sid];before=next((r for r in rows if r['id']==slug),None)
 after={**(before or {}),'id':slug,'name':cn['name'],'nameEn':en['name'],'type':'common' if sid.startswith('113') else 'trace','rarity':cn['rarity'],'source':'；'.join(cn['come_from']),'sourceEn':'; '.join(en['come_from'])}
 if before:rows[rows.index(before)]=after
 else:rows.append(after)
 repairs.append({'id':slug,'sourceId':sid,'before':before,'after':after})
write('compatibility-repairs.json',repairs)
text=json.dumps(rows,ensure_ascii=False,indent=2)+'\n';rawpath.write_text(text);(repo/'apps/web/public/data/starrail/raw-materials.json').write_text(text)
print('Prepared nine material records; eight sources direct, one ordinary proxy; three compatibility corrections and six additions')
