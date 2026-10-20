# Northbound

A responsive language gateway with a full-screen oblique 3D view of northern Europe. Real elevation data models the Scandinavian mountains; Natural Earth data supplies coastlines, lakes and rivers. Norway and Poland are separate interactive regions; all remaining land forms one English region without internal borders.

Run `npm run dev` and open http://127.0.0.1:4173. The deployable site is in `dist/`; all runtime assets are included locally.

For VS Code Live Server, right-click `dist/index.html` and choose **Open with Live Server**. Paths are relative, so this works whether Live Server serves the workspace, `northbound/`, or `dist/`. Open the generated `dist/index.html`; `index.template.html` is the build input and still contains map placeholders.

Run `npm.cmd install` once on Windows (or `npm install` elsewhere) to install build and test tools. `npm run build` regenerates the terrain assets and the three deliberately minimal language pages from `index.template.html`, `countries.geojson` and `data/`. Edit presentation and behavior in `dist/assets/style.css` and `dist/assets/app.js`. `npm test` runs browser checks using the installed Chrome executable.

The published site is static. Three.js is copied into `dist/assets/vendor/`; fonts, elevation and all geographic data are self-hosted. No API keys, map tile subscriptions or runtime external requests are required. The renderer uses a smaller terrain mesh on mobile, caps pixel density, pauses when the tab is hidden, and stops rendering when the scene settles. A static SVG fallback and the language buttons remain available without WebGL.

Routes use real geographic coordinates: flights arrive at Sandefjord Airport Torp before the car continues to Oslo. Norway selections drive from the clicked point to Høvik. Travel paths are stylized approximations, rather than road navigation. Reduced-motion visitors go directly to their chosen page; every journey also has a skip control.

Elevation uses Mapzen Terrain Tiles with exaggerated height for the illustrative view. See `data/SOURCES.md` and the site's Map credits link for source attribution. Country and water vectors: Natural Earth 1:50m, public domain. Three.js: MIT license. Fonts: SIL Open Font License.
