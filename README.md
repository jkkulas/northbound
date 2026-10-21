# Northbound

A responsive language gateway built as a dimensional, hand-colored paper atlas of northern Europe, Britain and Ireland. Real coastlines, rivers and elevation support engraved mountain relief, snowy summits, sculpted woodland, villages, lighthouses, nine architectural ensembles and seventeen maritime scenes. Norway and Poland remain separate interactive regions; the other land selects English. Hovering a region traces its golden boundary.

Run `npm.cmd ci`, `npm.cmd run build`, then `npm.cmd run dev` and open http://127.0.0.1:4173. On other platforms use `npm`. The deployable static site is `dist/`; all fonts, geographic data, Three.js and artwork are self-hosted. There are no runtime map subscriptions, API keys or external requests.

For VS Code Live Server, open `dist/index.html`. Relative URLs support nested hosting. `index.template.html` is the HTML build input; the build preserves the presentation source in `dist/assets/`.

## Art and geography

`atlas-terrain.js` combines ochre, umber and moss washes, coastal banks, rough slope hachures, broken ivory snow and exaggerated river ribbons. Mountains remain part of the continuous elevation surface. `terrain-height.js` shares the physical relief between rendering, journeys and audits. `map-scenery.js` supplies dimensional fir and oak groves, rural cottages, coastal lighthouses and smooth offshore rocks. The desktop map contains hundreds of trees, dozens of cottages, three lighthouses and offshore rock clusters; mobile uses fewer repeated forms.

`landmarks.js` contains new solid models for Bryggen, Oslo Opera House, Stockholm City Hall, Copenhagen Nyhavn, Warsaw Royal Castle, Gdańsk Żuraw, Kinderdijk windmill, Tower Bridge and Borgund Stave Church. Thousands of roof, masonry, window, timber and metal details are consolidated into two draw calls per ensemble. `atlas-models.js` supplies their shared shaded pigment, paper grain and engraved edges. Official location research and the documented coastal adjustment at Gdańsk are retained in [data/landmark-locations.json](data/landmark-locations.json). Nyhavn grows across Sjælland; Tower Bridge stays at the Thames and the windmill at Kinderdijk. City labels, pin dots and the hover tooltip have been removed.

Seven newly generated maritime subjects form seventeen dimensional-looking vignettes: sailing ships, serpent and kraken attacks, a whale, lobster and an offshore platform west of Stavanger. The new production atlas is `dist/assets/maritime-illustrated-v4.webp`; mobile receives only its smaller responsive variant. The pictures have a fixed orientation and opaque painted bodies, with transparent space between ropes, limbs and foam. Their entire visible silhouettes are fitted over water, with shared tidal ink extending their waterlines into the chart. Retired illustration atlases are not loaded.

The built-in image generation prompts, source copies, delivery atlas and renderer are documented in [ARTWORK.md](ARTWORK.md). The journey aircraft is a Wizz-inspired Airbus passenger jet; the car is a Volkswagen Passat estate. Both are detailed solid models with the map's painted and engraved treatment.

## Journeys and access

Norway selections zoom through a brief parchment fade and begin a road trip. Other selections fly to Sandefjord Airport Torp, then continue by car toward Oslo. The car follows terrain support across its complete footprint; the Opera model reserves its western arrival forecourt. Every journey has a skip control. Reduced-motion visitors navigate directly. A functional SVG map and language buttons remain available without WebGL.

## Verification

- `npm.cmd test`: geographic selection, golden hover, all language journeys, car and Opera clearance, keyboard/touch input, reduced motion, WebGL fallback, nested Live Server URLs and early clicks.
- `npm.cmd run test:performance`: idle rendering, bounded draw/terrain budgets and the responsive artwork payload.
- `npm.cmd run test:composition`: original maritime pigment mapped through actual texture UV triangles and the live camera onto the sea, including mirrored ships.
- `npm.cmd run test:landmarks`: model geometry, researched locations, geographic support and architectural foundations.
- `node tools/qa-atlas-v4.mjs`: desktop, laptop and mobile visual captures, model completeness, scenery, asset replacement and shader/resource errors.
- `node tools/qa-vehicles-v4.mjs`: isolated vehicle renders, geometry, animation and car support footprint.

Screenshots and reports are written to `outputs/`. Scene diagnostics omit heavy artwork data by default; use `inspectScene({artwork:true})` for architectural bounds and maritime geometry.

| Settled overview | Draw calls | Triangles | Terrain triangles |
| --- | ---: | ---: | ---: |
| Desktop, 1440 × 1000 | 56 | 633,836 | 221,972 |
| Mobile, 390 × 844 | 53 | 336,938 | 52,988 |

The renderer sleeps when the map settles and pauses in hidden tabs. Counts are deterministic scene measurements, not frame-rate guarantees. Desktop maritime delivery is 1,358,412 bytes; mobile is 349,810 bytes. The models require no landmark texture downloads. Tests use the installed Chrome executable and software rendering.

Elevation: Mapzen Terrain Tiles, with illustrative exaggeration. Coastlines, countries, rivers and lakes: Natural Earth 1:50m, public domain. See [data/SOURCES.md](data/SOURCES.md) and Map credits for attribution. Three.js uses the MIT license; fonts use the SIL Open Font License.
