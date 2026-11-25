import { getPayload } from 'payload';
import config from '../payload.config';
import seed from '../../../packages/data/cms/starrail-snapshot.json';
import { importUpdates } from '../lib/import-updates';

const publish = process.argv.includes('--publish');
const payload = await getPayload({ config });
try {
  for (const result of await importUpdates(payload, seed, publish)) console.log(`${result.action} ${result.status ?? ''} ${result.key}`);
} finally {
  await payload.destroy();
}
