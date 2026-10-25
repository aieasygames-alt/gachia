'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GAMES, type SupportedLocale } from '@gachia/core';
import { loadSearchDataset } from '@/lib/search-dataset';
import { buildSearchItems, searchItems, SEARCH_QUERY_LIMIT, type SearchItem } from '@/lib/search-results';
import { hi3WeaponSearchScope } from '@/lib/hi3-weapon-scope';

const copy = {
  zh: { query: '搜索关键词', submit: '搜索', loading: '正在加载搜索索引…', failed: '搜索暂不可用，请重试。', retry: '重试', empty: '未找到相关结果，试试角色、武器或材料名称。', hint: '输入角色、武器、材料或套装名称。搜索覆盖现有索引，不代表收录所有游戏内容。', count: '条结果（最多30条）', long: '关键词过长，请缩短后重试。' },
  en: { query: 'Search query', submit: 'Search', loading: 'Loading search index…', failed: 'Search is unavailable. Please retry.', retry: 'Retry', empty: 'No results found. Try a character, weapon, or material name.', hint: 'Enter a character, weapon, material, or set name. Search covers the existing index, not every game entry.', count: 'results (up to 30)', long: 'Query is too long. Please shorten it.' },
  ja: { query: '検索キーワード', submit: '検索', loading: '検索データを読み込み中…', failed: '検索を利用できません。再試行してください。', retry: '再試行', empty: '該当する結果がありません。キャラ、武器、素材名で検索してください。', hint: 'キャラ、武器、素材、セット名を入力してください。検索対象は既存の索引で、全ゲームの内容を網羅するものではありません。', count: '件の結果（最大30件）', long: 'キーワードが長すぎます。短くしてください。' },
};

export function SearchPage({ locale }: { locale: SupportedLocale }) {
  const params = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const labels = copy[locale];
  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);
  useEffect(() => {
    let cancelled = false;
    setState('loading'); setIndex([]);
    loadSearchDataset(locale).then((data) => {
      if (!cancelled) { setIndex(buildSearchItems(data)); setState('ready'); }
    }).catch(() => { if (!cancelled) setState('failed'); });
    return () => { cancelled = true; };
  }, [locale, attempt]);
  const results = useMemo(() => searchItems(index, query), [index, query]);

  return <section data-search-page>
    <form action={`/${locale}/search`} method="get" className="my-6 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1">{labels.query}<input name="q" type="search" value={query} maxLength={SEARCH_QUERY_LIMIT} onChange={(event) => setQuery(event.target.value)} className="mt-2 block w-full rounded-lg border border-game-border bg-game-surface p-3" /></label>
      <button type="submit" className="rounded-lg border border-game-border bg-game-surface px-5 py-3">{labels.submit}</button>
    </form>
    {state === 'failed' ? <div role="alert"><p>{labels.failed}</p><button className="my-3 rounded-lg border border-game-border px-4 py-2" onClick={() => setAttempt((value) => value + 1)}>{labels.retry}</button></div> :
      <p role="status" aria-live="polite" aria-atomic="true" className="my-4 text-game-text-muted">{state === 'loading' ? labels.loading : query.length > SEARCH_QUERY_LIMIT ? labels.long : !query.trim() ? labels.hint : results.length ? `${results.length} ${labels.count}` : labels.empty}</p>}
    <ul className="space-y-3">{results.map((result) => <li key={result.id}>
      <a data-search-result href={`/${locale}${result.url}`} className="block min-w-0 rounded-lg border border-game-border bg-game-surface p-4 hover:bg-game-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-game-primary">
        <span className="break-words font-medium">{result.name}</span><span className="ml-3 text-sm text-game-text-muted">{GAMES[result.gameId]?.name[locale] ?? result.gameId}</span>
        {result.nameAlt && <p className="break-words text-sm text-game-text-muted">{result.nameAlt}</p>}
        {result.gameId === 'hi3' && result.type === 'weapon' && <p data-hi3-weapon-search-scope className="mt-1 text-xs text-game-text-muted">{hi3WeaponSearchScope[locale]}</p>}
      </a>
    </li>)}</ul>
  </section>;
}
