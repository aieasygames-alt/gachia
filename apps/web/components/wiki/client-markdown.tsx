'use client';

import dynamic from 'next/dynamic';

const MarkdownRenderer = dynamic(
  () => import('./markdown-renderer').then((mod) => mod.MarkdownRenderer),
  { ssr: false, loading: () => <div className="animate-pulse min-h-[200px] bg-game-surface-alt rounded" /> }
);

export function ClientMarkdown({ content }: { content: string }) {
  return <MarkdownRenderer content={content} />;
}
