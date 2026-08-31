import type { ReactNode } from 'react';

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; code: string; language?: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

const headingClasses = {
  1: 'mb-4 mt-8 text-2xl font-bold text-game-text',
  2: 'mb-3 mt-6 text-xl font-bold text-game-primary',
  3: 'mb-2 mt-4 text-lg font-semibold text-game-text',
} satisfies Record<1 | 2 | 3, string>;

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdown(content);

  return (
    <div className="prose prose-invert max-w-none">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseMarkdown(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? '')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      blocks.push({ type: 'code', code: codeLines.join('\n'), language: fence[1] });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const marker = heading[1] ?? '#';
      blocks.push({
        type: 'heading',
        level: marker.length as 1 | 2 | 3,
        text: heading[2] ?? '',
      });
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index] ?? '');
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index] ?? '')) {
        rows.push(splitTableRow(lines[index] ?? ''));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const marker = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items: string[] = [];
      while (index < lines.length && marker.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(marker, '').trim());
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? '')) {
        quoteLines.push((lines[index] ?? '').replace(/^\s*>\s?/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && shouldContinueParagraph(lines, index)) {
      paragraphLines.push((lines[index] ?? '').trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function shouldContinueParagraph(lines: string[], index: number): boolean {
  const line = lines[index] ?? '';
  if (!line.trim()) return false;
  if (/^```/.test(line)) return false;
  if (/^(#{1,3})\s+/.test(line)) return false;
  if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return false;
  if (/^\s*>\s?/.test(line)) return false;
  return !isTableStart(lines, index);
}

function isTableStart(lines: string[], index: number): boolean {
  const header = lines[index] ?? '';
  const divider = lines[index + 1] ?? '';
  return /^\s*\|.*\|\s*$/.test(header) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider);
}

function splitTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Heading = `h${block.level}` as 'h1' | 'h2' | 'h3';
      return (
        <Heading key={index} className={headingClasses[block.level]}>
          {renderInline(block.text)}
        </Heading>
      );
    }
    case 'paragraph':
      return (
        <p key={index} className="mb-4 leading-7 text-game-text">
          {renderInline(block.text)}
        </p>
      );
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List
          key={index}
          className={`mb-4 ml-6 space-y-1 text-game-text ${block.ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} className="leading-7">
              {renderInline(item)}
            </li>
          ))}
        </List>
      );
    }
    case 'quote':
      return (
        <blockquote
          key={index}
          className="mb-4 border-l-4 border-game-primary bg-game-surface-alt py-2 pl-4 italic text-game-text-muted"
        >
          {renderInline(block.text)}
        </blockquote>
      );
    case 'code':
      return (
        <pre key={index} className="mb-4 overflow-x-auto rounded-lg bg-game-surface-alt p-4">
          <code className={`block text-sm text-game-text ${block.language ? `language-${block.language}` : ''}`}>
            {block.code}
          </code>
        </pre>
      );
    case 'table':
      return (
        <div key={index} className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-game-border text-sm">
            <thead>
              <tr>
                {block.headers.map((header, headerIndex) => (
                  <th
                    key={headerIndex}
                    className="border border-game-border bg-game-surface-alt px-3 py-2 text-left font-semibold text-game-text"
                  >
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-game-border px-3 py-2 text-game-text">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!?\[[^\]]*]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(renderToken(match[0], nodes.length));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderToken(token: string, key: number): ReactNode {
  if (token.startsWith('**') && token.endsWith('**')) {
    return (
      <strong key={key} className="font-bold text-game-text">
        {token.slice(2, -2)}
      </strong>
    );
  }

  if (token.startsWith('`') && token.endsWith('`')) {
    return (
      <code key={key} className="rounded bg-game-surface-alt px-1.5 py-0.5 text-sm text-game-primary">
        {token.slice(1, -1)}
      </code>
    );
  }

  const link = token.match(/^(!?)\[([^\]]*)]\(([^)]+)\)$/);
  if (!link) return token;

  const [, imageMarker = '', label = '', url = ''] = link;
  const safeUrl = normalizeUrl(url);
  if (!safeUrl) return label;

  if (imageMarker) {
    return (
      <img key={key} src={safeUrl} alt={label} className="mx-auto my-4 max-w-full rounded-lg" loading="lazy" />
    );
  }

  return (
    <a
      key={key}
      href={safeUrl}
      className="text-game-primary underline hover:text-game-accent"
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

function normalizeUrl(url: string): string | null {
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#')) return trimmedUrl;

  try {
    const parsedUrl = new URL(trimmedUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.toString() : null;
  } catch {
    return null;
  }
}
