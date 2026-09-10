import Link from 'next/link';

type Block = { type: 'heading'; level: 2 | 3; text: string } | { type: 'paragraph'; text: string } | { type: 'list'; ordered: boolean; items: string[] } | { type: 'table'; headers: string[]; rows: string[][] };

function parseTable(lines: string[], start: number) {
  const rows: string[][] = [];
  let index = start;
  while (index < lines.length && /^\|.*\|\s*$/.test(lines[index] ?? '')) {
    const cells = (lines[index] ?? '').split('|').slice(1, -1).map((cell) => cell.trim());
    if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
    index += 1;
  }
  return { rows, next: index };
}

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';
    if (!line) { index += 1; continue; }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading?.[1] && heading[2]) { blocks.push({ type: 'heading', level: heading[1].length as 2 | 3, text: heading[2] }); index += 1; continue; }
    if (/^\|.*\|\s*$/.test(line)) {
      const { rows, next } = parseTable(lines, index);
      if (rows.length > 1 && rows[0]) blocks.push({ type: 'table', headers: rows[0], rows: rows.slice(1) });
      index = next;
      continue;
    }
    const listItem = line.match(/^(?:[-*]\s+|(\d+)\.\s+)(.+)$/);
    if (listItem) {
      const ordered = Boolean(listItem[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const match = (lines[index]?.trim() ?? '').match(ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!match) break;
        if (match[1]) items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index]?.trim() ?? '';
      if (!next || /^(#{2,3}\s+|\|.*\|\s*$|[-*]\s+|\d+\.\s+)/.test(next)) break;
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function InlineText({ text, locale }: { text: string; locale: string }) {
  const parts = text.split(/(\[[^\]]+\]\(\/nte\/[^)]+\))/g);
  return <>{parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(\/nte\/([^)]+)\)$/);
    if (match) return <Link key={index} href={`/${locale}/nte/${match[2]}`}>{match[1]}</Link>;
    return <span key={index}>{part.replace(/\*\*/g, '')}</span>;
  })}</>;
}

export function GuideContent({ content, locale }: { content: string; locale: string }) {
  return <div className="guide-content">{parseBlocks(content).map((block, index) => {
    if (block.type === 'heading') return block.level === 2 ? <h2 key={index}><InlineText text={block.text} locale={locale}/></h2> : <h3 key={index}><InlineText text={block.text} locale={locale}/></h3>;
    if (block.type === 'list') {
      const Tag = block.ordered ? 'ol' : 'ul';
      return <Tag key={index}><>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineText text={item} locale={locale}/></li>)}</></Tag>;
    }
    if (block.type === 'table') return <div className="guide-table-wrap" key={index}><table><thead><tr>{block.headers.map((header, headerIndex) => <th key={headerIndex}><InlineText text={header} locale={locale}/></th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineText text={cell} locale={locale}/></td>)}</tr>)}</tbody></table></div>;
    return <p key={index}><InlineText text={block.text} locale={locale}/></p>;
  })}</div>;
}
