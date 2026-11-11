'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { readMapBody } from '@gachia/core/genshin-map';
import { collectedMapPoints, emptyMapProgress, filterMapPoints, parseMapPoints, parseMapTiles, persistMapProgress, progressKey, projectMapPoints, readMapProgress, updateMapProgress } from '@/lib/map-model';
import type { MapCatalog, MapProgress, MapTiles } from '@/lib/map-model';
import { MAP_VENDOR } from '@/lib/map-engine';
import { MapCanvas } from './map-canvas';

const copy = {
  zh: { region: '地图区域', search: '搜索点位或 ID', categories: '点位分类', all: '全选', none: '取消全选', hide: '隐藏已收集', progress: '本机进度', loading: '正在加载地图', error: '地图暂时无法加载。', retry: '重试', storage: '本机记录无法读取或保存，当前更改仅保留在此页面；原记录未覆盖。', empty: '没有符合条件的点位。', list: '点位列表', previous: '上一页', next: '下一页', center: '返回地图中心', collect: '标记已收集', uncollect: '取消收集标记', tileError: '部分地图图像未能加载。', map: '原神地图', shown: '可见点位', open: '定位点位' },
  en: { region: 'Map region', search: 'Search points or ID', categories: 'Point categories', all: 'Select all', none: 'Deselect all', hide: 'Hide collected', progress: 'Local progress', loading: 'Loading map', error: 'The map is temporarily unavailable.', retry: 'Retry', storage: 'Local records could not be read or saved. Changes remain on this page; original records were not overwritten.', empty: 'No matching points.', list: 'Point list', previous: 'Previous page', next: 'Next page', center: 'Return to map center', collect: 'Mark collected', uncollect: 'Mark uncollected', tileError: 'Some map images could not be loaded.', map: 'Genshin map', shown: 'Visible points', open: 'Locate point' },
  ja: { region: 'マップ地域', search: 'ポイント・ID を検索', categories: 'ポイント分類', all: '全選択', none: '全解除', hide: '収集済みを非表示', progress: 'ローカル進捗', loading: 'マップを読み込み中', error: '現在マップを読み込めません。', retry: '再試行', storage: 'ローカル記録を読み込み・保存できません。変更はこのページ内のみ有効で、元の記録は上書きされていません。', empty: '条件に一致するポイントはありません。', list: 'ポイント一覧', previous: '前のページ', next: '次のページ', center: 'マップ中央に戻る', collect: '収集済みにする', uncollect: '収集済みを解除', tileError: '一部のマップ画像を読み込めませんでした。', map: '原神マップ', shown: '表示ポイント', open: 'ポイントを表示' },
} as const;
type Loaded = { tiles: MapTiles; projection: ReturnType<typeof projectMapPoints> };
export function InteractiveMap({ catalog, locale }: { catalog: MapCatalog; locale: SupportedLocale }) {
  const labels = copy[locale], [mapId, setMapId] = useState(catalog.maps[0]!.id), [revision, setRevision] = useState(0);
  const map = catalog.maps.find(row => row.id === mapId)!;
  const [data, setData] = useState<Loaded | null>(null), [failed, setFailed] = useState(false), [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(new Set<string>()), [query, setQuery] = useState(''), [hide, setHide] = useState(false), [page, setPage] = useState(0);
  const [progress, setProgress] = useState<MapProgress>(emptyMapProgress), [storageWarning, setStorageWarning] = useState(false), [progressReady, setProgressReady] = useState(false);
  const [focus, setFocus] = useState<{ id: string; revision: number } | null>(null);
  const unsaved = useRef(new Map<string, MapProgress>());
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    let current = true; const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    setData(null); setFailed(false); setFocus(null);
    const json = async (path: string) => {
      const response = await fetch(path, { signal: controller.signal, credentials: 'omit', redirect: 'error' });
      if (response.status !== 200 || response.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new Error('Map unavailable');
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readMapBody(response, 8 * 1024 * 1024, controller.signal)));
    };
    void Promise.all([json(`/api/map?map_id=${map.hoyolabMapId}`), json(`/api/map/points?map_id=${map.hoyolabMapId}&labels=${map.labelIds.join(',')}`)])
      .then(([rawTiles, rawPoints]) => {
        const tiles = parseMapTiles(rawTiles, map.hoyolabMapId), points = parseMapPoints(rawPoints, map.hoyolabMapId);
        const projection = projectMapPoints(points, map, catalog.categories);
        if (current) { setData({ tiles, projection }); setActive(new Set(projection.categories.map(category => category.id))); }
      }).catch(() => { controller.abort(); if (current) setFailed(true); }).finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [map, catalog, revision]);
  useEffect(() => {
    setProgressReady(false);
    const load = () => {
      let state: MapProgress;
      try { state = unsaved.current.get(mapId) ?? readMapProgress(localStorage, mapId); } catch { state = { ...emptyMapProgress(), writable: false, error: true }; }
      setProgress(state); setStorageWarning(state.error || unsaved.current.has(mapId)); setProgressReady(true);
    };
    load();
    const synchronize = (event: StorageEvent) => {
      if (unsaved.current.has(mapId)) return;
      try { if (event.storageArea === localStorage && [null, progressKey(mapId), `gachia:map-progress:${mapId}`, 'gachia:map-progress:teyvat'].includes(event.key)) load(); } catch { setStorageWarning(true); }
    };
    window.addEventListener('storage', synchronize); return () => window.removeEventListener('storage', synchronize);
  }, [mapId]);
  const collected = useMemo(() => collectedMapPoints(progress), [progress]);
  const matching = useMemo(() => filterMapPoints(data?.projection.points ?? [], active, query, collected, false), [data, active, query, collected]);
  const visible = useMemo(() => hide ? matching.filter(point => !collected.has(point.id)) : matching, [matching, hide, collected]);
  const completed = matching.filter(point => collected.has(point.id)).length;
  const counts = useMemo(() => {
    const values = new Map<string, number>(); for (const point of data?.projection.points ?? []) values.set(point.category, (values.get(point.category) ?? 0) + 1); return values;
  }, [data]);
  const all = Boolean(data?.projection.categories.length) && data!.projection.categories.every(category => active.has(category.id));
  const pages = Math.max(1, Math.ceil(visible.length / 30)), currentPage = Math.min(page, pages - 1);
  const locate = (id: string) => setFocus(current => ({ id, revision: (current?.revision ?? 0) + 1 }));
  const toggleProgress = (id: string) => {
    if (!progressReady || !data?.projection.points.some(point => point.id === id)) return;
    let base = progress;
    if (!storageWarning) { try { base = readMapProgress(localStorage, mapId); } catch { base = { ...progress, writable: false, error: true }; } }
    const next = updateMapProgress(base, id, !collectedMapPoints(base).has(id));
    let saved = false; try { saved = persistMapProgress(localStorage, mapId, next); } catch {}
    if (saved) unsaved.current.delete(mapId); else unsaved.current.set(mapId, next);
    setProgress(next); setStorageWarning(!saved); locate(id);
  };
  return <section className="map-tool" data-hydrated={mounted ? 'true' : undefined} data-map-id={map.id} data-visible-points={visible.length}>
    <div className="map-toolbar">
      <label>{labels.region}<select aria-label={labels.region} value={mapId} disabled={!mounted} onChange={event => { setMapId(event.target.value); setQuery(''); setPage(0); setActive(new Set()); }}>
        {catalog.maps.map(row => <option key={row.id} value={row.id}>{locale === 'zh' ? row.nameZh : locale === 'ja' ? row.nameJa : row.nameEn}</option>)}
      </select></label>
      <label>{labels.search}<input type="search" value={query} disabled={!data} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
      <label className="map-toggle"><input type="checkbox" checked={hide} disabled={!data} onChange={event => { setHide(event.target.checked); setPage(0); }} />{labels.hide}</label>
    </div>
    {storageWarning && <p className="map-storage-warning" role="alert">{labels.storage}</p>}
    <div className="map-workspace">
      <aside className="map-filters" aria-label={labels.categories}>
        <div className="map-progress"><span>{labels.progress}</span><strong data-map-progress>{completed} / {matching.length}</strong><meter min={0} max={matching.length || 1} value={completed} aria-label={labels.progress} /></div>
        <header><h2>{labels.categories}</h2><button type="button" disabled={!data} onClick={() => { setActive(all ? new Set() : new Set(data!.projection.categories.map(category => category.id))); setPage(0); }}>{all ? labels.none : labels.all}</button></header>
        <div className="map-categories">{data?.projection.categories.map(category => <label key={category.id}>
          <input type="checkbox" checked={active.has(category.id)} onChange={() => { setActive(previous => { const next = new Set(previous); if (!next.delete(category.id)) next.add(category.id); return next; }); setPage(0); }} />
          <span className="map-swatch" style={{ background: category.color }} aria-hidden="true" /><span>{category.name}</span><small>{counts.get(category.id) ?? 0}</small>
        </label>)}</div>
      </aside>
      {data ? <MapCanvas key={map.id} tiles={data.tiles} points={visible} map={map} collected={collected} copy={labels} onToggle={toggleProgress} focus={focus} />
        : <div className="map-load-state" role={failed ? 'alert' : 'status'}><p>{failed ? labels.error : labels.loading}</p>{failed && <button type="button" onClick={() => setRevision(value => value + 1)}><img src={`${MAP_VENDOR}/retry.svg`} alt="" width={20} height={20} />{labels.retry}</button>}</div>}
    </div>
    <div className="map-results-status" role="status" aria-live="polite">{data && <><span>{labels.shown}: <strong>{visible.length}</strong></span>{visible.length === 0 && <span>{labels.empty}</span>}</>}</div>
    {data && <details className="map-list"><summary>{labels.list} ({visible.length})</summary>
      <div className="map-list-pager"><button type="button" title={labels.previous} aria-label={labels.previous} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><img src={`${MAP_VENDOR}/previous.svg`} alt="" width={20} height={20} /></button>
        <span>{currentPage + 1} / {pages}</span><button type="button" title={labels.next} aria-label={labels.next} disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}><img src={`${MAP_VENDOR}/next.svg`} alt="" width={20} height={20} /></button></div>
      <ul>{visible.slice(currentPage * 30, currentPage * 30 + 30).map(point => <li key={point.id} data-map-point={point.id}>
        <span><strong>{point.name}</strong><small>{point.categoryName} · {point.id}</small></span>
        <button type="button" title={`${labels.open}: ${point.id}`} aria-label={`${labels.open}: ${point.id}`} onClick={() => { locate(point.id); document.querySelector('.map-canvas')?.scrollIntoView({ block: 'center' }); }}><img src={`${MAP_VENDOR}/locate.svg`} alt="" width={20} height={20} /></button>
        <label><input type="checkbox" disabled={!progressReady} checked={collected.has(point.id)} onChange={() => toggleProgress(point.id)} />{labels.collect}</label>
      </li>)}</ul>
    </details>}
  </section>;
}
