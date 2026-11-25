import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('.data', { recursive: true });
try {
  await writeFile('.env', [
    `PAYLOAD_SECRET=${randomBytes(48).toString('hex')}`,
    'DATABASE_URL=file:./.data/payload.db',
    'CMS_SERVER_URL=http://127.0.0.1:4320',
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Created local .env and .data. Open /admin to create your own administrator.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Existing .env preserved.');
}
