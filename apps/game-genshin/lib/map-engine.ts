type Coordinates = [number, number];
type Bounds = [Coordinates, Coordinates];
interface Layer { addTo(map: LeafletMap): this; on(event: string, callback: () => void): this }
export interface LeafletMarker extends Layer { bindPopup(content: HTMLElement): this; openPopup(): this }
interface Cluster extends Layer { addLayers(markers: LeafletMarker[]): this; zoomToShowLayer(marker: LeafletMarker, callback: () => void): void }
export interface LeafletMap {
  remove(): void; off(): this; removeLayer(layer: Layer): void; invalidateSize(): void; fitBounds(bounds: Bounds, options?: { animate: boolean }): void;
  setView(center: Coordinates, zoom: number, options?: { animate: boolean }): this; getZoom(): number;
  getBounds(): { intersects(bounds: Bounds): boolean };
  on(event: string, callback: () => void): this;
}
export interface LeafletAPI {
  CRS: { Simple: unknown };
  map(element: HTMLElement, options: Record<string, unknown>): LeafletMap;
  divIcon(options: Record<string, unknown>): unknown;
  marker(coordinates: Coordinates, options: Record<string, unknown>): LeafletMarker;
  imageOverlay(url: string, bounds: Bounds): Layer;
  markerClusterGroup(options: Record<string, unknown>): Cluster;
}
declare global { interface Window { L?: LeafletAPI } }
export const MAP_VENDOR = '/_games/genshin/vendor/map-v1';
let engine: Promise<LeafletAPI> | undefined;
const resources = new Map<string, Promise<void>>();
function resource(name: string, style = false): Promise<void> {
  const previous = resources.get(name); if (previous) return previous;
  const pending = new Promise<void>((resolve, reject) => {
    const element = style ? document.createElement('link') : document.createElement('script');
    if (element instanceof HTMLLinkElement) { element.rel = 'stylesheet'; element.href = `${MAP_VENDOR}/${name}`; }
    else { element.src = `${MAP_VENDOR}/${name}`; element.async = true; }
    const timer = setTimeout(() => finish(new Error('Map engine timed out')), 15000);
    const finish = (error?: Error) => {
      clearTimeout(timer); element.onload = null; element.onerror = null;
      if (error) { element.remove(); resources.delete(name); reject(error); } else resolve();
    };
    element.onload = () => finish(); element.onerror = () => finish(new Error('Map engine unavailable')); document.head.append(element);
  });
  resources.set(name, pending); return pending;
}
export function loadMapEngine(): Promise<LeafletAPI> {
  engine ??= (async () => {
    await Promise.all(['leaflet.css', 'MarkerCluster.css', 'MarkerCluster.Default.css'].map(name => resource(name, true)));
    if (!window.L) await resource('leaflet.js');
    if (!window.L?.markerClusterGroup) await resource('leaflet.markercluster.js');
    if (!window.L?.markerClusterGroup) throw new Error('Invalid map engine'); return window.L;
  })().catch(error => { engine = undefined; throw error; });
  return engine;
}
