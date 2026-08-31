'use client';

import { MarkdownRenderer } from './markdown-renderer';

export function ClientMarkdown({ content }: { content: string }) {
  return <MarkdownRenderer content={content} />;
}
