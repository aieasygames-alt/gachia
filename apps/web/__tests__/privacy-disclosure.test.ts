import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../app/[lang]/privacy/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
} }).outputText;
type Input = { params: Promise<{ lang: string }> };
const exports: { default?: (input: Input) => Promise<unknown>;
  generateMetadata?: (input: Input) => Promise<{ description: string }> } = {};
const jsx = (type: unknown, props: unknown) => ({ type, props });
new Function('require', 'exports', compiled)(() => ({ jsx, jsxs: jsx }), exports);

function text(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('\n');
  if (node && typeof node === 'object' && 'props' in node) {
    return text((node as { props: { children?: unknown } }).props.children);
  }
  return '';
}

describe('privacy disclosures across supported locales', () => {
  for (const lang of ['zh', 'en', 'ja']) {
    it(`renders the actual providers and updated date in ${lang}`, async () => {
      const params = Promise.resolve({ lang });
      const content = text(await exports.default!({ params }));
      for (const provider of ['Google Analytics', 'Microsoft Clarity', 'Google AdSense', 'Cloudflare']) {
        expect(content).toContain(provider);
      }
      expect(content).toMatch(/2026年10月16日|October 16, 2026/);
      expect(content).not.toMatch(/使用本网站即表示您同意|By using this website, you agree|同意したものとみなされます/);
      expect(content).not.toMatch(/我们不使用这些信息进行广告追踪|We do not use this information for advertising tracking|これらを広告追跡には使用しません/);
      const metadata = await exports.generateMetadata!({ params });
      expect(metadata.description).toContain('Clarity');
      expect(metadata.description).toContain('AdSense');
      expect(content).toContain('gachiawiki@gmail.com');
      expect(content).toMatch(/默认关闭|off by default|初期状態で無効/);
      expect(content).toMatch(/物理删除|physical deletion|物理削除/);
      expect(content).not.toContain('through a GitHub Issue or the contact email');
      expect(content).not.toContain('retained for their validity period');
    });
  }
});
