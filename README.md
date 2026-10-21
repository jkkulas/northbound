# Northbound

A responsive language gateway illustrated as an antique paper atlas of northern Europe, Britain and Ireland. Real coastlines, rivers and elevation support snowy painted relief, upright isometric woodland, villages, lighthouses, ten landmark illustrations, Hekla volcano and seventeen maritime scenes. Norway and Poland select their respective languages; other land selects English.

Run `npm.cmd ci`, `npm.cmd run build`, then `npm.cmd run dev` and open http://127.0.0.1:4173. On other platforms use `npm`. The deployable static site is `dist/`; fonts, geographic data, Three.js and artwork are self-hosted. No runtime API keys or external requests are needed.

For VS Code Live Server, open `dist/index.html`. Relative URLs support nested hosting. `index.template.html` is the HTML build input; the build preserves presentation source in `dist/assets/`.

## Art and geography

All buildings, trees, cottages, lighthouses, rocks and vehicles are upright 2D illustrations with isometric painted volume. The ten landmarks and Hekla volcano are deliberately oversized, with 1,320 desktop trees and 122 small settlements around them. Trees, settlements and lighthouses render at twice their revision 6 width and height. Their shared ink, watercolor pigment and paper grain come from `paper-art.js`. They use natural terrain contact and restrained broken ground ink. No sculpted object models are loaded.

The ten landmarks are Stockholm City Hall, Copenhagen Nyhavn, Warsaw Royal Castle, Gdansk Zuraw, Kinderdijk windmill, Tower Bridge, Borgund Stave Church, Brandenburg Gate, Cologne Cathedral and Edinburgh Castle. Bryggen and Oslo Opera House are removed. Verified roots, official references and deliberate artistic offsets are retained in [data/landmark-locations.json](data/landmark-locations.json). Visible painted bases are projected onto the relief and checked against actual river banks and shorelines. Warsaw stays west/south of the Vistula; Cologne is deliberately drawn east of the Rhine as requested. The smaller Nyhavn fits Sjælland, and the windmill, Edinburgh Castle and smaller Brandenburg Gate have dry painted bases. Tower Bridge intentionally spans the Thames. The untilted Hekla illustration sits centrally on Iceland while retaining its surveyed coordinate as provenance.

`atlas-terrain.js` blends ochre, umber and moss, coastal banks, rough rock hatching, broken ivory snow and exaggerated geographic rivers. Mountains remain part of the continuous elevation surface; topographic contour bands and height markers are removed. `terrain-height.js` shares the relief between rendering, journeys and placement audits.

The maritime art includes sailing ships, serpent and kraken attacks, whale, lobster and an offshore platform west of Stavanger. The platform is another 30% larger than revision 6. Transparent silhouettes are fitted entirely over water and clear of landmark drawings throughout the scroll range. Waterline wave pigment uses the map's own sea wash, while bodies, hulls and foam retain opaque paint.

Two responsive atlases deliver the art: `paper-atlas-v6.webp` for land/scenery/vehicles and `maritime-illustrated-v4.webp` for sea scenes. Phones receive only the smaller mobile versions. Original PNGs and exact generation prompts from the earlier illustration set are retained in `outputs/paper-v5/` and `outputs/paper-v5-prompts.json`. Hekla and the individual cottage are saved in outputs/paper-v6/ with exact built-in generation prompts in outputs/paper-v6-prompts.json. Premultiplied texture filtering and multisampled silhouette coverage soften the ink edges. See [ARTWORK.md](ARTWORK.md) for production details.

## Journeys and access

The initial camera position and viewing angle are unchanged. Mouse-wheel scrolling translates the camera and its target together up or down the Y-axis, within a 45–115 world-unit camera-height range. It preserves perspective and resets when a journey starts. Control-wheel remains available to the browser.

Norway selections zoom through a brief parchment fade and begin a road trip. Other selections fly to Sandefjord Airport Torp, then continue by car toward Oslo. The illustrated aircraft is Wizz-inspired; the car is a Volkswagen Passat estate. Its wheel-contact footprint follows the terrain. Every journey has a skip control. Reduced-motion visitors navigate directly. A functional SVG map and language buttons remain available without WebGL. City pins and hover tooltips are removed.

## Verification

- `npm.cmd test`: geographic selection, golden hover, all language journeys, car clearance, keyboard/touch, reduced motion, WebGL fallback, nested Live Server URLs and early clicks.
- `npm.cmd run test:performance`: idle rendering, bounded draw/terrain budgets and responsive artwork delivery.
- `npm.cmd run test:composition`: original maritime pigment mapped through actual UV triangles onto the sea, plus landmark clearance at four camera heights.
- `npm.cmd run test:landmarks`: researched roots, upright illustration geometry, actual painted lower bands, river banks, shoreline support and ground contacts.
- `npm.cmd run test:camera`: unchanged initial view, vertical wheel movement, fixed direction, height limits and idle rendering.
- `node tools/qa-paper-v7.mjs`: desktop, laptop and phone screenshots, eleven remaining hero drawings, requested scale changes, doubled scenery and shader/resource errors.
- `node tools/qa-scenery-v7-support.mjs`: final live placements, actual doubled scenery geometry, full enlarged feet, terrain contact and road clearance.
- `node tools/qa-vehicles-v4.mjs`: v5 paper vehicle renders, turning readability and wheel support.

Screenshots and reports are written to `outputs/`. The renderer sleeps when the scene settles and pauses in hidden tabs. Diagnostics omit heavy artwork data by default; use `inspectScene({artwork:true})` for artwork bounds and maritime geometry. Tests use installed Chrome and software rendering.

Elevation: Mapzen Terrain Tiles, with illustrative exaggeration. Coastlines, countries, rivers and lakes: Natural Earth 1:50m, public domain. See [data/SOURCES.md](data/SOURCES.md) and Map credits. Three.js uses the MIT license; fonts use the SIL Open Font License.
