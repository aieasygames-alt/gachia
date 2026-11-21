import json,sys,re
from pathlib import Path
from html.parser import HTMLParser
class Materials(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.inside=False;self.current=None;self.rows=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='section' and attrs.get('id')=='character-materials':self.inside=True
  if self.inside and tag=='li':self.current={'id':None,'text':''}
  if self.current is not None and tag=='a':self.current['id']=attrs.get('href','').split('/')[-1]
 def handle_data(self,data):
  if self.current is not None:self.current['text']+=data
 def handle_endtag(self,tag):
  if tag=='li' and self.current is not None:
   text=self.current['text']; name,quantity=text.rsplit('×',1)
   self.rows.append([self.current['id'] or name.strip(),int(quantity.strip())]);self.current=None
  if tag=='section':self.inside=False
checks=json.loads(Path(sys.argv[1]).read_text());count=0
for row in checks:
 parser=Materials();parser.feed(Path(row['htmlFile']).read_text());assert parser.rows==row['expected'],row['path'];count+=len(parser.rows)
print(json.dumps({'pages':len(checks),'references':count,'everyMaterialIdAndQuantityMatches':True}))
