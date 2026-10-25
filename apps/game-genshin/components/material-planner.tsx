'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { MATERIAL_WATCHLIST_KEY, parseMaterialWatchlist } from '../lib/material-watchlist';

type Material = { id: string; name: string; nameEn: string; type: string; rarity: number; source: string; sourceEn: string };

export function MaterialPlanner({ materials, locale }: { materials: Material[]; locale: SupportedLocale }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [pinned, setPinned] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [sort, setSort] = useState<'recent' | 'name' | 'rarity'>('recent');
  const [feedback, setFeedback] = useState('');
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const copy = locale === 'zh'
    ? { search: '搜索材料', type: '材料分类', rarity: '稀有度', all: '全部', results: '条材料', add: '加入清单', remove: '移出清单', list: '本地刷取清单', empty: '从材料结果中加入近期需要刷取的项目。', noResults: '没有匹配的材料，试试调整关键词或筛选条件。', source: '来源', saved: '清单仅保存在当前浏览器。', count: '项', sort: '排序方式', recent: '最近加入', nameSort: '按名称', raritySort: '按稀有度', clear: '清空清单', cleared: '已清空本地刷取清单。' }
    : locale === 'ja'
      ? { search: '素材を検索', type: '素材分類', rarity: 'レアリティ', all: 'すべて', results: '件の素材', add: 'リストに追加', remove: 'リストから削除', list: 'ローカル周回リスト', empty: '素材結果から近日中に集めたい項目を追加してください。', noResults: '該当する素材がありません。検索語または絞り込みを調整してください。', source: '入手先', saved: 'リストはこのブラウザだけに保存されます。', count: '件', sort: '並び順', recent: '追加順', nameSort: '名前順', raritySort: 'レアリティ順', clear: 'リストをクリア', cleared: 'ローカル周回リストをクリアしました。' }
      : { search: 'Search materials', type: 'Material type', rarity: 'Rarity', all: 'All', results: 'materials', add: 'Add to list', remove: 'Remove', list: 'Local farming list', empty: 'Add materials you want to farm soon from the results.', noResults: 'No materials match these filters. Try changing the search or filters.', source: 'Source', saved: 'The list is saved only in this browser.', count: 'items', sort: 'Sort list', recent: 'Recently added', nameSort: 'By name', raritySort: 'By rarity', clear: 'Clear list', cleared: 'Local farming list cleared.' };
  useEffect(() => {
    try { setPinned(parseMaterialWatchlist(window.localStorage.getItem(MATERIAL_WATCHLIST_KEY))); }
    catch { setStorageUnavailable(true); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(MATERIAL_WATCHLIST_KEY, JSON.stringify(pinned)); }
    catch { setStorageUnavailable(true); }
  }, [hydrated, pinned]);
  const storageNotice = storageUnavailable
    ? locale === 'zh' ? '浏览器存储不可用；本次清单在关闭页面后不会保留。'
      : locale === 'ja' ? 'ブラウザ保存を利用できません。このリストはページを閉じると失われます。'
        : 'Browser storage is unavailable; this list will not survive closing the page.'
    : copy.saved;
  const name = (material: Material) => locale === 'zh' ? material.name : material.nameEn;
  const source = (material: Material) => locale === 'zh' ? material.source : material.sourceEn;
  const types = useMemo(() => [...new Set(materials.map((material) => material.type))].sort(), [materials]);
  const filtered = useMemo(() => materials.filter((material) => {
    const text = `${material.name} ${material.nameEn}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (type === 'all' || material.type === type) && (rarity === 'all' || String(material.rarity) === rarity);
  }), [materials, query, rarity, type]);
  const watchlist = useMemo(() => {
    const entries = pinned.map((id) => materials.find((material) => material.id === id)).filter(Boolean) as Material[];
    return sort === 'recent' ? entries : [...entries].sort((a, b) => sort === 'rarity' ? b.rarity - a.rarity || name(a).localeCompare(name(b)) : name(a).localeCompare(name(b)));
  }, [materials, pinned, sort]);
  const toggle = (id: string) => { setFeedback(''); setPinned((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); };

  const clear = () => { setPinned([]); setFeedback(copy.cleared); };

  return <section className="material-planner"><div className="material-planner__filters"><label>{copy.search}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></label><label>{copy.type}<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">{copy.all}</option>{types.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label><label>{copy.rarity}<select value={rarity} onChange={(event) => setRarity(event.target.value)}><option value="all">{copy.all}</option>{[2, 3, 4, 5].map((entry) => <option key={entry} value={entry}>{entry}★</option>)}</select></label></div><div className="material-planner__meta"><span>{filtered.length} {copy.results}</span><span role={storageUnavailable ? 'status' : undefined}>{storageNotice}</span></div><div className="material-planner__layout"><div className="material-planner__results">{filtered.length ? filtered.map((material) => <article className="material-row" key={material.id}><div><strong>{name(material)}</strong><span>{material.type} · {material.rarity}★</span><small>{copy.source}: {source(material)}</small></div><button type="button" onClick={() => toggle(material.id)}>{pinned.includes(material.id) ? copy.remove : copy.add}</button></article>) : <p className="material-planner__empty" role="status">{copy.noResults}</p>}</div><aside className="material-planner__watchlist"><div className="material-planner__watchlist-head"><h2>{copy.list}</h2><strong>{watchlist.length} {copy.count}</strong></div>{watchlist.length ? <><label className="material-planner__sort"><span>{copy.sort}</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">{copy.recent}</option><option value="name">{copy.nameSort}</option><option value="rarity">{copy.raritySort}</option></select></label><ul>{watchlist.map((material) => <li key={material.id}><span><strong>{name(material)}</strong><small>{source(material)}</small></span><button type="button" onClick={() => toggle(material.id)}>{copy.remove}</button></li>)}</ul><button className="material-planner__clear" type="button" onClick={clear}>{copy.clear}</button></> : <p>{copy.empty}</p>}{feedback && <p className="material-planner__feedback" role="status">{feedback}</p>}</aside></div></section>;
}
