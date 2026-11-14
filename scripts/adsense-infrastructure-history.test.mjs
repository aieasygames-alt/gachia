import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAdsenseSourceTransition, assertAdsensePreviewMatch } from './adsense-infrastructure-history.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0');
function fixture() {
 const names=['genshin','nte','azur-promilia','lvmeng','main'],service=o=>o==='main'?'gachia':'gachia-game-'+o;
 const baseline={services:Object.fromEntries(SERVICES.map((s,i)=>[s,{id:uuid(i+1),strategy:'percentage',versions:[{version_id:uuid(i+10),percentage:100}]}])),settings:{},bindings:{},subdomains:{},scripts:[],routes:[],domains:[]};
 const active={path:'/protected/active.json',pin:'a'.repeat(64)},router={versionId:uuid(3)},previous={value:{active},router,baseline};
 const promoted=Object.fromEntries(names.map((o,i)=>[service(o),uuid(100+i)])),after=structuredClone(baseline);
 for(const [name,version_id] of Object.entries(promoted))after.services[name]={id:uuid(200+SERVICES.indexOf(name)),strategy:'percentage',versions:[{version_id,percentage:100}]};
 const parent={path:'/protected/source-index.json',pin:'b'.repeat(64)},commit='c'.repeat(40);
 const completed={status:'production_accepted',policy:'adsense-five-owner-infrastructure-v1',commit,parent,active,promoted,baseline,after,ci:{headSha:commit,status:'completed',conclusion:'success',runID:123,jobs:[{conclusion:'success'}]}};
 const value={kind:'nte_adsense_infrastructure_source_index',status:'published_sources_observed',cloudWrites:false,newPublicationAuthorized:false,sourceCommit:commit,previousSourceIndex:parent,active,router,owners:Object.fromEntries(names.map(o=>[o,{}])),baseline:after};
 return {value,previous,completed};
}
test('advertising infrastructure rebind preserves content inputs and Router while advancing five owners',()=>{const f=fixture();assertAdsenseSourceTransition(f.value,f.previous,f.completed);});
for(const fault of ['content','router','staging','binding','missing-owner','ci','parent'])test('reject infrastructure source drift: '+fault,()=>{
 const f=fixture();
 if(fault==='content')f.value.active={...f.value.active,pin:'d'.repeat(64)};
 if(fault==='router')f.value.router={versionId:uuid(999)};
 if(fault==='staging'){f.value.baseline=structuredClone(f.value.baseline);f.value.baseline.services['gachia-staging'].versions[0].version_id=uuid(999);}
 if(fault==='binding'){f.value.baseline=structuredClone(f.value.baseline);f.value.baseline.bindings={unexpected:[]};}
 if(fault==='missing-owner')delete f.value.owners.nte;
 if(fault==='ci')f.completed.ci.jobs[0].conclusion='skipped';
 if(fault==='parent')f.value.previousSourceIndex={...f.value.previousSourceIndex,pin:'e'.repeat(64)};
 assert.throws(()=>assertAdsenseSourceTransition(f.value,f.previous,f.completed));
});

function previewFixture() {
 const html={title:'Page',text:'Protected content',media:[['img',[['src','/rendered.webp'],['alt','Protected image']]]],resources:[['link',[['rel','stylesheet'],['href','/protected.css']]]],links:['/protected']};
 const expected={path:'/en',status:200,html};
 const actual=structuredClone(expected);actual.html.resources.unshift(['link',[['rel','preload'],['as','image'],['href','/rendered.webp'],['fetchpriority','high']]]);
 return {actual,expected};
}
test('source preview accepts only existing protected rendered-image preload policy',()=>{const {actual,expected}=previewFixture();assertAdsensePreviewMatch(actual,expected);});
for(const fault of ['text','image','stylesheet','unrendered-preload','json'])test('source preview still rejects '+fault,()=>{
 const {actual,expected}=previewFixture();
 if(fault==='text')actual.html.text='Changed';
 if(fault==='image')actual.html.media[0][1][1][1]='Changed image';
 if(fault==='stylesheet')actual.html.resources[1][1][1][1]='/changed.css';
 if(fault==='unrendered-preload')actual.html.resources[0][1][2][1]='/unrendered.webp';
 if(fault==='json'){delete actual.html;delete expected.html;actual.sha256='a'.repeat(64);expected.sha256='b'.repeat(64);}
 assert.throws(()=>assertAdsensePreviewMatch(actual,expected));
});
