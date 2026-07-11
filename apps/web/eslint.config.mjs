import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', '.open-next/**', 'cloudflare-env.d.ts', 'next-env.d.ts'],
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
