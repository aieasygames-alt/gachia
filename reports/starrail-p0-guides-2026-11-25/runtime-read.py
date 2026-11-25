import sys,json,re,pathlib,urllib.request,concurrent.futures,datetime
root=pathlib.Path(__file__).resolve().parent
text=(pathlib.Path.home()/'.wrangler/config/default.toml').read_text()
token=json.loads(re.search(r'^oauth_token\s*=\s*("[^"\r\n]*")',text,re.M)[1])
api='https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/'
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
services=['gachia','gachia-router','gachia-game-genshin','gachia-game-nte','gachia-game-azur-promilia','gachia-game-lvmeng','gachia-staging']
def get(endpoint):
 req=urllib.request.Request(api+endpoint,headers={'Authorization':'Bearer '+token})
 with client.open(req,timeout=35) as r: body=json.load(r)
 assert body.get('success'),endpoint
 return body['result']
def capture(service):
 result={name:get('workers/scripts/'+service+'/'+name) for name in ['deployments','settings','routes','subdomain']}
 for row in result['settings'].get('bindings',[]):
  if row['type']=='secret_text':
   for k in list(row):
    if k not in ['name','type']:del row[k]
 return service,result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: state=dict(pool.map(capture,services))
state['capturedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
name=sys.argv[1] if len(sys.argv)>1 else 'runtime-before.json'
assert name in ['runtime-before.json','runtime-prepromotion.json','runtime-after.json']
if (root/name).exists():raise RuntimeError('Preserve existing cloud evidence: '+name)
(root/name).write_text(json.dumps(state,indent=2)+'\n')
for s in services:
 latest=sorted(state[s]['deployments']['deployments'],key=lambda d:d['created_on'])[-1]
 print(s,latest['versions'])
