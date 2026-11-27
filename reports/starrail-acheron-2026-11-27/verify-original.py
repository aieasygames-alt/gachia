# -*- coding: utf-8 -*-
"""Read-only check of existing Silver Wolf and Sparkle bodies across deployment."""
import json,pathlib,urllib.request,concurrent.futures,sys,hashlib
from bs4 import BeautifulSoup
r=pathlib.Path(__file__).resolve().parent;phase=sys.argv[1];assert phase in ['before','after']
c=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
def one(args):
 locale,cid=args;path='/'+locale+'/starrail/characters/'+cid
 with c.open(urllib.request.Request('https://gachia.com'+path,headers={'User-Agent':'GachiaCMS/1.0'}),timeout=45) as f:
  assert f.status==200;page=BeautifulSoup(f.read(),'html.parser')
 main=page.find('main');assert main
 for el in main.select('script,style'):el.decompose()
 text=main.get_text(' ',strip=True)
 return {'locale':locale,'path':path,'h1':main.find('h1').get_text(' ',strip=True),'mainTextSHA256':hashlib.sha256(text.encode()).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(one,[(l,cid) for l in ['zh','en','ja'] for cid in ['silver-wolf','sparkle']]))
if phase=='after':assert rows==json.loads((r/'original-characters-before.json').read_text())['checks']
(r/('original-characters-'+('acceptance' if phase=='after' else 'before')+'.json')).write_text(json.dumps({'status':'passed','checks':rows,'originalCharactersPreserved':True},ensure_ascii=False,indent=2)+'\n');print('Original Silver Wolf and Sparkle:',phase,'all six pages passed')
