// Read-only, complete public acceptance after Genshin's already committed
// deployment. Never uploads or recreates that deployment.
import {readFileSync} from 'node:fs';
import {migrationSave} from '../../scripts/genshin-migration-http.mjs';
import {recheckNteReferences,verifyNteHTTP} from '../../scripts/nte-release-http.mjs';
import {createGenshinPublicNetwork} from '../../scripts/unified-preview-network.mjs';
const root=import.meta.dirname,s=JSON.parse(readFileSync(root+'/sealed-public.json'));
const network=await createGenshinPublicNetwork('http://127.0.0.1:18646');
try{
 const result=await verifyNteHTTP({origin:'https://gachia.com',references:recheckNteReferences(s.publicReferences.genshin),
  directory:root+'/public-genshin-routed',request:network.request,owner:'router'});
 migrationSave(root,'genshin-public-requalified.json',{path:root+'/public-genshin-routed/result.json',pin:result.evidenceSHA256});
 console.log(JSON.stringify({genshinPublicAccepted:true,deploymentReplayed:false}));
}finally{await network.close()}
