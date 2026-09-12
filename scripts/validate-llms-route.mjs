import fs from 'node:fs';

const source = fs.readFileSync('apps/web/app/llms.txt/route.ts', 'utf8');
const required = [
  "const BASE_URL = 'https://gachia.com'",
  'const body = `# ',
  '${BASE_URL}/en/nte/guides',
  '${BASE_URL}/en/genshin/guides',
];
const missing = required.filter((value) => !source.includes(value));
if (missing.length) {
  console.error(`llms route missing required content: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('llms route validation passed');
