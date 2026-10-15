import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// Next owns these plugins; resolve them from its package under strict pnpm layouts.
const resolvePluginsRelativeTo = dirname(require.resolve('eslint-config-next/package.json'));
const compat = new FlatCompat({ baseDirectory, resolvePluginsRelativeTo });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'cloudflare-env.d.ts', 'next-env.d.ts'],
  },
  {
    rules: {
      // Existing content modules intentionally retain precomputed branches and use raw
      // image elements because Cloudflare image optimization is disabled.
      '@typescript-eslint/no-unused-vars': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
