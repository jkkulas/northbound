# Northbound artwork — solid 3D diorama fork

The supplied reference guides this fork's carved and painted miniature world: warm stone, terracotta, dark timber, copper green, gold land and turquoise sea. Every decorative object is real geometry with depth; only geographic water, land pigment and interface lettering remain surface treatments.

## Architecture

`dist/assets/landmarks.js` retains seven original solid landmark recipes and integrates ten new recipes from `landmark-models-3d.js`. Fine details are modeled: Brandenburg's quadriga and fluted columns; Eiffel's open lattice and galleries; Cologne's Gothic spires, tracery and flying buttresses; Trakai's brick towers; Helsinki's five copper domes, columns and roof figures; Toompea's courtyard and flag tower; Riga's scroll gables; Rosenholm's copper-topped turrets; Edinburgh's fortified courts; and Hekla's crater, lava channels and snow, with drifting smoke emitted from the crater.

The old Bryggen and Oslo Opera recipes remain historical source but are excluded from the active scene. The active list has 17 models. Most retained landmarks are taller and broader; footprint fitting can narrow coastal ensembles without reducing their vertical presence. Brandenburg and the windmill remain upright.

Primary location references are in `data/landmark-locations.json` and `data/landmark-locations-3d.json`. These are artistic building interpretations at exaggerated atlas scale. Real geographic anchors and the final drawing positions are stored separately; the actual positions and scales are recorded by `qa-landmark-support.mjs` in `outputs/landmark-support.json`.

`ground-support.js` builds a spatial lookup from the exact rendered river triangles. The fitter tests a dense grid over the complete foundation against rivers, coasts and other landmarks. Finland and Estonia have separate geographic constraints, as do Sjælland and the Dutch windmill. Warsaw stays west/south of its real river-side anchor. If a requested size cannot fit, its horizontal footprint reduces before placement is accepted. Masonry skirts join the DEM; Hekla's continuous radial surface joins the terrain at its edge.

Tower Bridge has dry tower plinths, an open water span and two sloping approaches meeting the banks. `island-bridges.js` supplies three additional supported crossings with dry abutments, modeled deck, rails, piers and copper-capped watchtowers. Unsupported or landmark-obstructed alternatives are omitted.

## Sea models

`sea-models.js` replaces the generated maritime images with seven original procedural model families, arranged as 17 scenes by `sea-creatures.js`. Ships have curved solid hulls, decks, cabin windows, thick bowed cloth sails, yards, rigging, railings and stern ornament. Serpents have smooth swept bodies, overlapping scales, crests, eyes and teeth. Kraken arms have modeled suckers. The whale, lobster and offshore platform are also dimensional geometry. Foam and wakes are slender modeled curves without a colored water rectangle.

The full X/Z bounding footprint of every maritime scene is sampled against the sea mask. Projection checks keep them separate from landmark silhouettes and one another. Desktop shows the complete compositions; mobile framing preserves the map's established POV and shows the central portion of the scene.

No `.webp` object atlases or compass SVG are requested by the 3D renderer. Historical generated drawings and their original prompts remain in the repository as production history, not active assets. No new image generation was used for this 3D conversion.

## Scenery, materials and terrain

`map-scenery.js` uses instanced sculpted fir/oak crowns, trunks and merged detailed settlements. Each house/lighthouse has a sampled dry foundation and terrain-fitted masonry. Trees avoid houses, landmarks, bridge approaches, the railway and the travel corridor. The desktop scene contains 760 trees, 141 houses and 3 lighthouses; mobile uses fewer repeated forms.

`atlas-models.js` provides opaque colored geometry with directional light, paper grain, fine hatching and restrained edges. Geometry merging keeps one or two draw calls per landmark and one per maritime scene, with two additional articulated meshes for the lobster claws. `compass-model.js` is an embossed ivory/brass instrument with real raised facets and rings. Mountains remain continuous DEM relief with rough rock, broken snow and downhill hachures; elevation contour bands are removed.

`railway.js` models an original modern intercity train with two driving cabs, a coach, solid twin rails, sleepers, river decks and a terrain-fitted embankment between the Paris and Warsaw ensembles. Its artistic route reserves enough space for the complete moving train and neighboring swaying crowns. `ambient-life.js` adds original solid gulls and inland birds in three instance batches, translucent procedural smoke, and small animated wave strokes. No external imagery or new assets are required. Ships follow circular routes validated across their complete turning envelopes; shared wind bends tree crowns without moving their roots.

The existing smooth solid Wizz-inspired jet and Volkswagen Passat estate remain in `journey.js`. Their movement and complete terrain support are preserved. Browser overview captures, independent full-footprint checks, assembly checks and journey regressions document the current result in `outputs/`.
