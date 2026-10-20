# Northbound

A responsive language gateway with a full-screen, oblique 3D paper atlas of northern Europe, including Britain and Ireland. Soft sage terrain, celadon seas, warm ink and parchment grain retain a hand-printed feel, while exaggerated mountains and sculpted landmarks give the map a playful miniature appearance. Natural Earth data supplies coastlines, lakes and rivers. Norway and Poland are separate interactive regions; all remaining land forms one English region without internal borders. Hovering a region reveals a shining golden outline and warm country highlight.

Run `npm run dev` and open http://127.0.0.1:4173. The deployable site is in `dist/`; all runtime assets are included locally.

For VS Code Live Server, right-click `dist/index.html` and choose **Open with Live Server**. Paths are relative, so this works whether Live Server serves the workspace, `northbound/`, or `dist/`. Open the generated `dist/index.html`; `index.template.html` is the build input and still contains map placeholders.

Run `npm.cmd install` once on Windows (or `npm install` elsewhere) to install build and test tools. `npm run build` regenerates the terrain assets and the three deliberately minimal language pages from `index.template.html`, `countries.geojson` and `data/`. Edit presentation and behavior in `dist/assets/style.css` and `dist/assets/app.js`. `npm test` runs browser checks using the installed Chrome executable.

The published site is static. Three.js is copied into `dist/assets/vendor/`; fonts, elevation and all geographic data are self-hosted. No API keys, map tile subscriptions or runtime external requests are required. The renderer uses a smaller terrain mesh on mobile, caps pixel density, pauses when the tab is hidden, and stops rendering when the scene settles. A static SVG fallback and the language buttons remain available without WebGL.

`build.mjs` smooths elevation with one separable Gaussian pass and generates the country aura texture. The renderer exaggerates the elevation, shades mountain slopes, and adds watercolor washes, fine contours, rivers and small forest clusters. Geographic coverage extends beyond the viewport so the map has continuous land and water around its edges. The camera adapts to viewport size and presents a low aerial oblique view.

`dist/assets/landmarks.js` builds eight original 3D miniatures: Bryggen, Oslo Opera House, Stockholm City Hall, Nyhavn, Warsaw Royal Castle, a Dutch windmill, Gdańsk's medieval port crane and London's Tower Bridge. `dist/assets/sea-creatures.js` builds Jörmungandr, a kraken, a giant lobster, a sailing trader, a sinking ship, an oil platform off Stavanger and a northern whale. These enlarged, shaded meshes share a paper-inspired palette, with contact shadows and water wakes grounding them in the map. `cartographic-models.js` provides their shared modeling helpers. A self-hosted SVG compass rose completes the chart.

Norway selections immediately begin a zoom with a short parchment fade, then launch a road trip from a nearby road corridor. Other regions launch a large, banking propeller plane to Sandefjord Airport Torp before continuing by car toward Oslo. `journey.js` contains the sculpted vehicles and curated road corridors. The car follows terrain support across its entire footprint, and its final approach stays west of the oversized Opera House. The routes are illustrative approximations of geographic corridors. Reduced-motion visitors go directly to their chosen page; every journey also has a skip control.

Browser QA checks the oblique view, Britain/Ireland coverage, mountain relief, visible golden hover, early Norway zoom and fade, vehicle legibility, and route clearance. It also covers all language journeys, keyboard and touch selection, reduced motion, the WebGL fallback, and nested Live Server paths. Screenshots are written to `outputs/sculpted-*.png`.

Elevation uses Mapzen Terrain Tiles with exaggerated height for the illustrative view. See `data/SOURCES.md` and the site's Map credits link for source attribution. Country and water vectors: Natural Earth 1:50m, public domain. Three.js: MIT license. Fonts: SIL Open Font License.
