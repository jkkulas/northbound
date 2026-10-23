# Northbound

A responsive language gateway built as a fully modeled, hand-painted 3D diorama of northern Europe, Britain and Ireland. Golden terrain, dark rock, ivory snow, copper roofs and turquoise water share an antique atlas palette. The scene includes 17 landmarks, 17 maritime compositions, modeled woodland, settlements, lighthouses and island bridges.

Run `npm.cmd ci`, then `npm.cmd run dev`, and open http://127.0.0.1:4173. On other platforms use `npm`. The static site is already assembled in `dist/`; `npm.cmd run build` regenerates geographic data, the fallback and language destinations. `index.template.html` is the HTML build input; the build preserves presentation source in `dist/assets/`. VS Code Live Server can open `dist/index.html` directly.

## The 3D fork

All object artwork is geometry, including the compass, boats, sea monsters, rig, aircraft and car. No raster object atlas or illustrated billboard is loaded. Models have solid depth-tested surfaces, fine dimensional details and a shared pigment shader. Repeated scenery is instanced or merged. Ambient animation runs at up to 30 rendered frames per second; hidden tabs pause and reduced-motion visitors get a still scene that sleeps when settled.

The landmark collection includes Stockholm City Hall, Nyhavn, Warsaw Royal Castle, Kinderdijk windmill, Gdańsk Żuraw, Tower Bridge, Borgund Stave Church, Brandenburg Gate, Eiffel Tower, Cologne Cathedral, Trakai Castle, Helsinki Cathedral, Tallinn's Toompea, Riga's House of the Blackheads, Rosenholm Castle in Jutland, Edinburgh Castle and Iceland's Hekla. Bryggen and Oslo Opera remain removed. Landmark heights are exaggerated, while coastal footprints narrow where necessary to fit dry land.

`ground-support.js` checks full foundations against the same land mask and triangulated river ribbons used by the renderer. Geographic source coordinates are retained separately from each artistic drawing position. Masonry skirts descend into sampled terrain; towers remain upright. Tower Bridge crosses the Thames with dry tower foundations and two approaches meeting the banks. Little Belt, Øresund and Storstrøm connect actual land on both ends. A prospective Great Belt crossing is omitted when the exaggerated Nyhavn ensemble blocks its available landing.

The assembled desktop scene contains 760 trees, 141 houses, 3 lighthouses and 38 offshore rocks; mobile uses 440 trees, 108 houses and 20 rocks. Scenery avoids rivers, coastline, landmark footprints, bridge approaches, the railway and the Norwegian journey corridor. Houses have terrain-fitted masonry, sloped roofs, chimneys and windows; towns have regional towers and enclosed streets. Trees have shaped layered crowns and modeled trunks.

Ships include curved hulls, thick bowed sails, rigging and rails. The serpent has a smooth swept body, raised scales, fins, eyes and teeth. The kraken has curling arms and modeled suckers; the offshore platform has decks, bracing, cranes and a helipad. Complete sea footprints remain over water and are separated from landmark silhouettes in the overview. Narrow mobile framing naturally shows a subset of the full European scene.

## Life on the map

Eight coastal gull flocks and three inland bird swarms circle above the terrain with articulated wings. Larger flocks near Norwich, Oslo and Skåne remain visible on phones. Twelve ships sail elongated closed routes, with the bow following the direction of travel. Each ship reserves its complete swept footprint over water, including clearance from neighboring routes and static sea scenes, so safe spacing does not depend on animation timing.

The Kraken starts underwater beside an intact ship. Its 26-second cycle emerges, grasps the ship, pulls it under, leaves bubbles, then lets the ship float back up. The serpent circles a stationary ship with raised coils separated by submerged body sections. The oil rig crane raises and lowers, the windmill sails rotate around their hub, and the lobster moves its claws. Parallel base strokes have been removed from every sea model. A modern three-car train travels between Paris and Warsaw, pauses at each terminus, and reverses.

Soft smoke rises from Hekla's crater and selected actual chimney tops. Scattered wavelets drift and fade on verified water patches. Tree, bird, smoke, wave, boat and train motion share one elapsed clock that pauses with page visibility and honors live changes to `prefers-reduced-motion`. `inspectAmbientLife()` exposes animation and route diagnostics.

## Journeys and access

Norway and Poland select their own languages; other land selects English. Large Norsk, Polski and English controls replace country names and stay within the screen edges. Corner copy and labels for seas and creatures are removed. Hovering a region traces its golden boundary. Norway selections zoom into a road journey; other selections fly to Torp and continue by car toward Oslo. The Wizz-inspired jet and Passat estate remain solid 3D models. Every journey has a skip control; keyboard focus moves to it while the language controls are disabled. Reduced-motion visitors navigate directly. Keyboard, touch, nested hosting and a functional SVG fallback remain supported.

## Verification

- `npm.cmd test`: geographic selection, hover, language journeys, full-car terrain/landmark clearance, keyboard/touch, reduced motion, fallback, nested URLs and early clicks.
- `npm.cmd run test:landmarks`: actual solid mesh/contact checks and independent rays against river geometry beneath complete landmark foundations.
- `npm.cmd run test:composition`: actual maritime geometry, complete water footprints and camera-space landmark occlusion.
- `npm.cmd run test:scenery`: assembled-world foundations, dry bridge abutments and tree/building separation.
- `npm.cmd run test:performance`: idle rendering, draw/triangle budgets and no raster object downloads.
- `npm.cmd run test:railway`: complete train return cycle, actual vertex clearance, track support and building/tree exclusion.
- `npm.cmd run test:sea-motion`: complete ship loops, independent route separation and articulated lobster clearance over water.
- `npm.cmd run test:creature-motion`: serpent orbit, stationary ship, Kraken phases, crane movement and complete animated water footprints.
- `npm.cmd run test:maritime-story`: browser captures of the complete Kraken cycle and readable language controls down to 320px wide.
- `npm.cmd run test:ambient`: bird flight clearance, actual smoke emission points, wave water support and shared animation clocks.
- `npm.cmd run test:motion`: desktop/mobile live animation, reduced-motion changes, visibility pause/resume and shader errors.
- `node tools/qa-atlas-v4.mjs`: desktop, laptop and mobile captures of the current diorama, scene completeness and runtime/resource errors.

Screenshots and reports are in `outputs/`; current overview images are `diorama-1440.png`, `diorama-1366.png` and `diorama-390.png`. `inspectScene({artwork:true})` exposes model bounds, geometry statistics and support records. The browser checks use installed Chrome with software rendering; draw counts are not a frame-rate promise.

Original model recipes and provenance are documented in [ARTWORK.md](ARTWORK.md), [landmark-locations.json](data/landmark-locations.json) and [landmark-locations-3d.json](data/landmark-locations-3d.json). Coastlines, countries, rivers and lakes are Natural Earth 1:50m public-domain data. Elevation is derived from Mapzen Terrain Tiles. See [data/SOURCES.md](data/SOURCES.md) and Map credits for attribution.
