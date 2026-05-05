'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-8 text-2xl font-bold text-game-text">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-xl font-bold text-game-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold text-game-text">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-7 text-game-text">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc space-y-1 text-game-text">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-1 text-game-text">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-game-primary underline hover:text-game-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse border border-game-border text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-game-border bg-game-surface-alt px-3 py-2 text-left font-semibold text-game-text">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-game-border px-3 py-2 text-game-text">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-game-primary bg-game-surface-alt py-2 pl-4 italic text-game-text-muted">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="rounded bg-game-surface-alt px-1.5 py-0.5 text-sm text-game-primary" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className ?? ''} block rounded bg-game-surface-alt p-4 text-sm text-game-text`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-lg bg-game-surface-alt p-4">{children}</pre>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-game-text">{children}</strong>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ''}
              className="mx-auto my-4 max-w-full rounded-lg"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
