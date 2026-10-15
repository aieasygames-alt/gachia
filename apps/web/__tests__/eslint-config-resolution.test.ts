import { test, expect } from 'vitest';
import { mkdtempSync, realpathSync, readFileSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('ESLint loads Next-owned plugins outside repository ancestry and enforces hooks', () => {
  const web = fileURLToPath(new URL('../', import.meta.url));
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-eslint-resolution-')));
  try {
    mkdirSync(join(directory, 'pages'));
    writeFileSync(join(directory, 'eslint.config.mjs'), readFileSync(join(web, 'eslint.config.mjs')));
    symlinkSync(realpathSync(join(web, 'node_modules')), join(directory, 'node_modules'), 'dir');
    const script = `import {createRequire} from 'node:module';
      const require=createRequire(new URL('./eslint.config.mjs',import.meta.url));
      const {ESLint}=require('eslint');
      const eslint=new ESLint({cwd:${JSON.stringify(directory)}});
      const config=await eslint.calculateConfigForFile('fixture.tsx');
      if(!config.plugins['react-hooks']||!config.plugins['@next/next'])throw Error('Missing plugins');
      const [result]=await eslint.lintText('import {useState} from "react"; function Example({flag}: {flag: boolean}) { if(flag) useState(0); return null; }', {filePath:'fixture.tsx'});
      if(!result.messages.some(m=>m.ruleId==='react-hooks/rules-of-hooks'&&m.severity===2))throw Error('Hooks rule not enforced');
      console.log('isolated-config-and-hooks-pass');`;
    writeFileSync(join(directory, 'check.mjs'), script);
    expect(execFileSync(process.execPath, [join(directory, 'check.mjs')], { cwd: directory, encoding: 'utf8', timeout: 30000 }))
      .toContain('isolated-config-and-hooks-pass');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}, 40000);
