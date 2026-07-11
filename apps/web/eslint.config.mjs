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
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

export default config;
