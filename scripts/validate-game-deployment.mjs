import { readFile } from 'node:fs/promises';

const router = await readFile(new URL('../apps/router/wrangler.jsonc', import.meta.url), 'utf8');
const expectedIndependent = ['nte', 'azur-promilia'];
const failures = [];

for (const game of expectedIndependent) {
  const binding = game === 'nte' ? 'NTE_SITE' : 'AZUR_PROMILIA_SITE';
  const enabled = game === 'nte' ? 'NTE_ENABLED' : 'AZUR_PROMILIA_ENABLED';
  const worker = `gachia-game-${game}`;
  if (!router.includes(`"binding": "${binding}"`) || !router.includes(`"service": "${worker}"`)) failures.push(`${game}: missing production service binding`);
  if (!router.includes(`"${enabled}": "true"`)) failures.push(`${game}: production routing is not enabled`);
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Validated ${expectedIndependent.length} independent game deployments.`);
