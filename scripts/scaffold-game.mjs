import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const [gameId, displayName, workerName = `gachia-game-${gameId}`] = process.argv.slice(2);
if (!gameId || !displayName || !/^[a-z0-9-]+$/.test(gameId)) {
  console.error('Usage: pnpm scaffold:game <game-id> <display-name> [worker-name]');
  process.exit(1);
}

const root = resolve(`apps/game-${gameId}`);
try { await access(root); console.error(`Refusing to overwrite existing directory: ${root}`); process.exit(1); } catch {}

const files = {
  'README.md': `# ${displayName}\n\n独立 Worker 游戏站点骨架。请先补充数据、SEO、导航和部署配置，再将游戏加入 packages/core/deployments.ts。\n`,
  'wrangler.jsonc': JSON.stringify({ name: workerName, main: '.open-next/worker.js', assets: { directory: '.open-next/assets', binding: 'ASSETS' }, compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'], workers_dev: true, vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com', [`${gameId.toUpperCase().replaceAll('-', '_')}_DEPLOYMENT_MODE`]: 'production' } }, null, 2) + '\n',
  'app/layout.tsx': `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = { title: '${displayName} — Gachia', description: '${displayName} game information on Gachia.' };\n\nexport default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }\n`,
  'app/robots.ts': `import type { MetadataRoute } from 'next';\nexport default function robots(): MetadataRoute.Robots { return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://gachia.com/sitemaps/${gameId}/index.xml' }; }\n`,
  'app/sitemap.ts': `import type { MetadataRoute } from 'next';\nexport default function sitemap(): MetadataRoute.Sitemap { return [{ url: 'https://gachia.com/zh/${gameId}', lastModified: new Date() }, { url: 'https://gachia.com/en/${gameId}', lastModified: new Date() }, { url: 'https://gachia.com/ja/${gameId}', lastModified: new Date() }]; }\n`,
  'app/[lang]/page.tsx': `import Link from 'next/link';\nexport default async function Home({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; return <main><h1>${displayName}</h1><p>Replace this scaffold with verified ${displayName} content.</p><Link href={\`/\${lang}/${gameId}\`}>Open ${displayName}</Link></main>; }\n`,
};

for (const [file, content] of Object.entries(files)) {
  const target = resolve(root, file);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, content);
}
console.log(`Scaffolded ${displayName} at ${root}`);
