import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function needsConsumerVerification(paths) {
  return paths.length === 0 || paths.some(path => !/^(?:docs|plans|reports)\/.*\.md$/.test(path) && !/^(?:[^/]+\/)*README\.md$/.test(path));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let verify = true;
  const before = process.env.PAYLOAD_BEFORE;
  if (process.env.GITHUB_EVENT_NAME === 'push' && /^[a-f0-9]{40}$/.test(before ?? '') && !/^0+$/.test(before)) {
    try {
      const paths = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', before, 'HEAD'], { encoding: 'utf8' }).split('\0').filter(Boolean);
      verify = needsConsumerVerification(paths);
    } catch { /* Missing history must run the full verification. */ }
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `consumers=${verify}\n`);
  console.log(JSON.stringify({ consumers: verify, cloudWrites: false }));
}
