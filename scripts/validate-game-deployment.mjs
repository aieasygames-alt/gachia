import { readFile } from 'node:fs/promises';

const router = await readFile(new URL('../apps/router/wrangler.jsonc', import.meta.url), 'utf8');
const generated = await readFile(new URL('../apps/router/src/generated-game-deployments.ts', import.meta.url), 'utf8');
const deployments = [...generated.matchAll(/"id": "([^"]+)",[\s\S]*?"worker": "([^"]+)",[\s\S]*?"status": "(preview|live)",[\s\S]*?"binding": "([^"]+)",[\s\S]*?"enabled": "([^"]+)"/g)]
  .map(([, id, worker, status, binding, enabled]) => ({ id, worker, status, binding, enabled }));
const failures = [];

for (const deployment of deployments) {
  if (!router.includes(`"binding": "${deployment.binding}"`) || !router.includes(`"service": "${deployment.worker}"`)) {
    failures.push(`${deployment.id}: missing production service binding`);
  }
  const enabledValue = router.match(new RegExp(`"${deployment.enabled}": "(true|false)"`))?.[1];
  if (deployment.status === 'preview' && enabledValue !== 'false') {
    failures.push(`${deployment.id}: preview deployment must explicitly set ${deployment.enabled}=false`);
  }
  if (deployment.status === 'live' && enabledValue === 'false') {
    failures.push(`${deployment.id}: live deployment must not disable ${deployment.enabled}`);
  }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Validated ${deployments.length} Router game deployment(s).`);
