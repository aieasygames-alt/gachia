# Browser Map Distributions

Unmodified browser distributions copied from packages already installed in this
workspace. No package installation, dependency resolution or lockfile change was
performed for this migration.

- Leaflet 1.9.4: `leaflet.js`, source map, CSS and images. BSD-2-Clause, see `LICENSE`.
- leaflet.markercluster 1.5.3: browser JS, source map and CSS. MIT, see `MIT-LICENCE.txt`.
- lucide-react 0.510.0: LocateFixed, RotateCw, ChevronLeft and ChevronRight icons
  rendered as static SVG using the installed React renderer. ISC, see `LUCIDE-LICENSE`.

The capture script, installed source paths, versions, file lengths and SHA-256
hashes are recorded in
`reports/genshin-map-owner-2026-11-10-r110/vendor-map.mjs` and `vendor-map.json`.
These assets are served from the dedicated Genshin Worker under its owned static
prefix; runtime scripts and styles do not use a third-party CDN.
