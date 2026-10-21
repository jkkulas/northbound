# Northbound artwork, revision 7

Ten architectural illustrations and the Icelandic volcano remain upright isometric ink and watercolor, with painted volume. Bryggen and Oslo Opera House are removed. Brandenburg Gate is 15% smaller than revision 6; Edinburgh Castle and Nyhavn are also reduced so their painted bases fit the land.

## Original illustrations and delivery

The built-in OpenAI image generation tool created the original drawings. The nineteen revision 5 subjects and exact prompts remain in `outputs/paper-v5/` and `outputs/paper-v5-prompts.json`. The Hekla volcano and individual cottage originals remain in `outputs/paper-v6/`, with exact prompts in `outputs/paper-v6-prompts.json`. No new images were generated for revision 7.

All 21 historic land, scenery and vehicle drawings remain packed by `tools/build-paper-v6.mjs` into `dist/assets/paper-atlas-v6.webp` (2560 × 3840; 2,985,302 bytes) and `paper-atlas-v6-mobile.webp` (1280 × 1920; 689,514 bytes). Unused Bryggen and Opera images in the shared atlas are not instantiated. `paper-atlas-v6.json` records each original source path, alpha bounds and delivery rectangle. Packing crops transparent margins, resizes and changes delivery format; it does not redraw subjects.

## Soft ink edges

`paper-art.js` premultiplies texture alpha before filtering, then restores straight pigment color in the shader. This prevents arbitrary RGB in transparent pixels from bleeding into the outline. Trilinear filtering and 8× anisotropy preserve engraving. Smooth alpha coverage resolves through a multisampled canvas on desktop and phones. Fully painted interiors remain opaque and depth-writing; only silhouette edges receive partial sample coverage. Maritime artwork uses the same treatment. Topographic height bands remain absent.

## Painted bases and geography

Physical anchors and oversized painted drawing positions are recorded separately in `data/landmark-locations.json`. Placement checks the affected illustrations' painted bases against coast water and drawn river banks through the overview camera. Most use the lower 20% alpha silhouette. The front-facing windmill and upright Brandenburg Gate instead fit their ground-contact edge (bottom 2.5%); the windmill's sails and upper artwork may overhang land. Both have zero yaw, zero lean and no terrain warping. `dist/assets/landmark-base-samples.json` supplies compact source-alpha envelopes; the independent QA reads finer original PNG samples.

Warsaw's painted base is west/south of the Vistula. Cologne Cathedral is deliberately illustrated east of the Rhine, overriding the former west-bank artistic layout while preserving its surveyed real coordinate in the source record. Brandenburg Gate and the Netherlands windmill have dry ground-contact edges; Nyhavn and Edinburgh Castle fit their painted lower bands on dry land. The windmill keeps its 4.8-unit width and faces the viewer, with its ground edge inside the Netherlands polygon. Nyhavn is reduced further than the other landmarks because Sjælland cannot support its former wide drawing. Tower Bridge intentionally spans the Thames.

Hekla retains its official South Iceland coordinate as provenance, while its drawing is moved centrally on Iceland. Its card is upright with zero lean and no terrain warping. Snow, crater warmth and the exaggerated cone are decorative historic-map imagery, not a statement of volcanic activity.

## Scenery and sea scenes

Trees, cottages, hamlets and lighthouses have twice their revision 6 width and height. The desktop map retains 1,320 trees and 122 settlements; phones retain 780 trees and 76 settlements. Dense samples across their enlarged feet exclude coasts, river banks and the road corridor, while extra baseline vertices follow the relief. The two lighthouses fit broader coastal land near Kullen and Hirtshals; their real and drawn locations remain separate metadata. Sea rocks retain their existing size. Scenery still uses four batched draws.

Seventeen maritime scenes reuse the seven original subjects in `outputs/maritime-v4/`, with exact prompts in `outputs/maritime-v4-prompts.json`. The Stavanger platform is 30% larger than revision 6, giving a total scale of 1.69 relative to the original. Other ships and creatures retain revision 6 sizes. Placement checks the complete painted alpha fringe against open water and landmark drawings at four camera heights, reserving the constrained offshore platform location before freely placed ships. Wave pigment uses the map's own sea wash; hulls, foam and creature bodies keep opaque paint.

The original point of view is retained. Scrolling translates camera and target together along Y, preserving direction and field of view. Camera height is bounded to 45–115; journeys return to their original camera choreography. Vehicles remain upright illustrated marginalia, with car clearance measured from its wheel footprint.

## Verification

- `tools/qa-paper-v7.mjs`: three viewport screenshots, requested removals and exact size changes, doubled scenery, unchanged initial point of view, soft edges, UTF-8 labels and resource health.
- `qa-landmark-support.mjs`: surveyed roots, physical support and independently sampled painted lower bands against shores and river banks.
- `qa-composition.mjs`: full maritime source-alpha projection and landmark clearance across three viewports and four camera heights.
- `qa-camera.mjs`: real wheel events, vertical movement, unchanged viewing direction, bounds, Control-wheel and idle rendering.
- `qa.mjs`: language journeys, geographic hover/click, touch/keyboard, reduced motion, fallback, nested hosting and early clicks.
- `qa-performance.mjs`: sleeping renderer, bounded geometry/draws and selected responsive atlas payloads.

Screenshots and measured reports are saved in `outputs/`. Tests use installed Chrome and software rendering. Earlier revision checks and production files remain for history.
