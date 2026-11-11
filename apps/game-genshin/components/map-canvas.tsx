'use client';

import { useEffect, useRef, useState } from 'react';
import { loadMapEngine, MAP_VENDOR } from '@/lib/map-engine';
import type { LeafletMap, LeafletMarker } from '@/lib/map-engine';
import { mapCoordinates } from '@/lib/map-model';
import type { MapPoint, MapTiles } from '@/lib/map-model';
import type { SubMapConfig } from '@gachia/data/games/genshin/map-data';

export interface MapCanvasCopy { loading: string; error: string; retry: string; center: string; collect: string; uncollect: string; tileError: string; map: string }
function centerMap(target: LeafletMap, tiles: MapTiles) {
  if (tiles.rows * tiles.cols <= 4) target.fitBounds([[0, 0], [tiles.totalHeight, tiles.totalWidth]], { animate: false });
  else target.setView([tiles.totalHeight / 2, tiles.totalWidth / 2], -1, { animate: false });
}
export function MapCanvas({ tiles, points, map, collected, copy, onToggle, focus }: {
  tiles: MapTiles; points: MapPoint[]; map: SubMapConfig; collected: Set<string>; copy: MapCanvasCopy;
  onToggle(id: string): void; focus: { id: string; revision: number } | null;
}) {
  const element = useRef<HTMLDivElement>(null), instance = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, LeafletMarker>()), cluster = useRef<ReturnType<Awaited<ReturnType<typeof loadMapEngine>>['markerClusterGroup']> | null>(null);
  const [ready, setReady] = useState(0), [retry, setRetry] = useState(0), [failed, setFailed] = useState(false), [tileFailed, setTileFailed] = useState(false);
  const toggle = useRef(onToggle); toggle.current = onToggle;
  useEffect(() => {
    let active = true;
    setFailed(false); setReady(0); setTileFailed(false);
    const overlays = new Map<string, ReturnType<Awaited<ReturnType<typeof loadMapEngine>>['imageOverlay']>>();
    let observer: ResizeObserver | undefined, owner: LeafletMap | undefined;
    void loadMapEngine().then(api => {
      if (!active || !element.current) return;
      // Leaflet 1.9's zoom transition timeout can outlive a removed sub-map.
      const target = api.map(element.current, { crs: api.CRS.Simple, minZoom: -6, maxZoom: 4, zoomSnap: .25, zoomControl: true, attributionControl: false,
        zoomAnimation: false, markerZoomAnimation: false, fadeAnimation: false,
        maxBounds: [[-tiles.totalHeight / 4, -tiles.totalWidth / 4], [tiles.totalHeight * 1.25, tiles.totalWidth * 1.25]] });
      owner = target; instance.current = target; centerMap(target, tiles);
      const visibleTiles = () => {
        if (!active) return;
        for (let row = 0; row < tiles.rows; row++) for (let col = 0; col < tiles.cols; col++) {
          const key = `${row}:${col}`, url = tiles.tiles[row]?.[col]; if (!url) continue;
          const bounds: [[number, number], [number, number]] = [[tiles.totalHeight - (row + 1) * tiles.tileSize, col * tiles.tileSize], [tiles.totalHeight - row * tiles.tileSize, (col + 1) * tiles.tileSize]];
          if (target.getBounds().intersects(bounds)) {
            if (!overlays.has(key)) overlays.set(key, api.imageOverlay(`/api/map/tile?map_id=${map.hoyolabMapId}&url=${encodeURIComponent(url)}`, bounds)
              .on('error', () => { if (active) setTileFailed(true); }).addTo(target));
          } else { const layer = overlays.get(key); if (layer) { target.removeLayer(layer); overlays.delete(key); } }
        }
      };
      target.on('moveend zoomend', visibleTiles); visibleTiles();
      observer = new ResizeObserver(() => target.invalidateSize()); observer.observe(element.current); setReady(value => value + 1);
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false; observer?.disconnect();
      // Stop moveend consumers from starting another pan during Leaflet removal.
      owner?.off(); owner?.remove(); instance.current = null; cluster.current = null; markers.current.clear();
    };
  }, [tiles, map, retry]);

  useEffect(() => {
    const target = instance.current; if (!ready || !target) return;
    let cancelled = false, frame = 0, ownedGroup: typeof cluster.current = null;
    markers.current.clear();
    if (element.current) element.current.dataset.renderedMarkers = '0';
    void loadMapEngine().then(api => {
      if (cancelled) return;
      const group = api.markerClusterGroup({ chunkedLoading: false, animate: false, maxClusterRadius: 50, showCoverageOnHover: false, spiderfyOnMaxZoom: true }).addTo(target);
      ownedGroup = group; cluster.current = group; let offset = 0;
      const add = () => {
        if (cancelled) return;
        const batch = points.slice(offset, offset + 250).map(point => {
          const done = collected.has(point.id), content = document.createElement('div'), title = document.createElement('strong'), identity = document.createElement('p'), button = document.createElement('button');
          title.textContent = point.name; identity.textContent = point.id; button.textContent = done ? copy.uncollect : copy.collect;
          button.type = 'button'; button.setAttribute('aria-pressed', String(done)); button.dataset.mapCollect = point.id;
          button.onclick = () => toggle.current(point.id); content.className = 'map-popup'; content.append(title, identity, button);
          const marker = api.marker(mapCoordinates(point, tiles, map), { title: `${point.name} ${point.id}`, alt: `${point.name} ${point.id}`, keyboard: true,
            icon: api.divIcon({ html: `<span style="background:${point.color}" data-collected="${done}">${done ? '&#10003;' : ''}</span>`, className: 'map-point', iconSize: [24, 24], iconAnchor: [12, 12] }) }).bindPopup(content);
          markers.current.set(point.id, marker); return marker;
        });
        group.addLayers(batch); offset += batch.length; if (element.current) element.current.dataset.renderedMarkers = String(offset);
        if (offset < points.length) frame = requestAnimationFrame(add);
      };
      add();
    }).catch(() => { if (!cancelled) { setFailed(true); setReady(0); } });
    return () => { cancelled = true; cancelAnimationFrame(frame); if (ownedGroup) target.removeLayer(ownedGroup); if (cluster.current === ownedGroup) cluster.current = null; markers.current.clear(); };
  }, [ready, points, collected, tiles, map, copy]);
  useEffect(() => {
    if (!focus) return;
    let frame = 0, cancelled = false;
    const show = () => {
      if (cancelled) return;
      const marker = markers.current.get(focus.id), group = cluster.current;
      if (marker && group) group.zoomToShowLayer(marker, () => { if (!cancelled) marker.openPopup(); });
      else if (element.current && Number(element.current.dataset.renderedMarkers || 0) < points.length) frame = requestAnimationFrame(show);
    };
    show(); return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [focus, points, ready]);
  return <div className="map-canvas-wrap" aria-label={copy.map}>
    <div className="map-canvas" ref={element} tabIndex={0} role="region" aria-label={copy.map} />
    {!ready && <div className="map-canvas-state" role={failed ? 'alert' : 'status'}>{failed ? copy.error : copy.loading}{failed && <button type="button" onClick={() => setRetry(value => value + 1)}>{copy.retry}</button>}</div>}
    {!!ready && <button className="map-center" type="button" title={copy.center} aria-label={copy.center} onClick={() => instance.current && centerMap(instance.current, tiles)}><img src={`${MAP_VENDOR}/locate.svg`} width={20} height={20} alt="" /></button>}
    {tileFailed && <div className="map-tile-error" role="alert">{copy.tileError}<button type="button" onClick={() => setRetry(value => value + 1)}>{copy.retry}</button></div>}
  </div>;
}
