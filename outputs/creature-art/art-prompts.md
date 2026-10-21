# Maritime illustration atlas

Created with the built-in image_gen tool (not CLI) on 2026-10-21. The final workspace asset is `dist/assets/maritime-engraving-atlas.webp`. WebP encoding is the sole post-generation transformation; alpha and composition are preserved.

The generated 1774 × 887 atlas uses custom UV regions, because generated subjects extend beyond the requested equal-cell grid. Seven meshes share the same texture and material. The bottom-right space is unused. The final WebP is 814,246 bytes; the generated PNG was 2,826,511 bytes. WebP quality is 0.92. The encoded atlas retains its alpha channel.

Final generated source: `C:/Users/loaka/.codex/generated_images/01a15d57-9fb4-7af0-829f-0574d8e7e8fb/exec-eb0195d6-ff56-48c7-a459-4dda6a180dd3.png`. Reproduce format conversion with `node outputs/creature-art/convert-atlas.mjs <source.png>`.

## Generation prompt

Use case: stylized-concept.
Asset type: a single production sprite atlas for an illustrated medieval/fantasy map. Generate one transparent RGBA image, landscape 2048 by 1024 pixels, arranged as EXACTLY four equal columns and two equal rows. Each cell contains one isolated hand-drawn maritime map vignette, centered, with 10% transparent padding on every edge. No grid lines, no dividers, no borders, no labels, no lettering anywhere. Final cell bottom right is completely empty transparent.
Style/medium: exquisitely detailed antique maritime engraving with fine warm-black dip-pen contours, delicately irregular hand-inked lines, stippled shading, short flowing hatch marks, restrained translucent watercolor pigment in deep desaturated ocean teal, faded rust red, old bronze and warm ivory. These must look DRAWN ONTO an old fantasy atlas, not shiny 3D models, not modern digital paintings. A mature, elegant medieval cartographic illustration style, dramatic readable silhouettes and meticulous delicate detail.
Content in strict left-to-right row order:
TOP LEFT (cell 1): Jörmungandr, a spectacular horned sea serpent. Three sinuous body arches rise through tiny engraved wave curls; the largest tall curved neck on the right rises to a long crocodilian dragon head turned left in profile, gaping toothy jaw, emerald eye, two elegantly swept-back horns, pointed dorsal fin mane, rows of individually drawn overlapping teal scales, pale segmented belly, exquisite varied cross-hatching. A powerful menacing serpent, not a cute snake. Entire head, horns, curves, splashes and tail inside its own cell.
TOP SECOND (cell 2): a magnificent kraken octopus in faded russet ink wash, tapered bulbous mantle with small intelligent predatory eyes, eight long muscular tentacles spread into richly curled spirals, precise circular double rows of suckers, detailed flowing hatch shading, a few tiny sea-wave pen curls at the foot. Elegant ancient monster, anatomically believable, not cartoon, no enormous humanlike eyes.
TOP THIRD (cell 3): a proud northern lobster seen from slightly above, deep red-brown shell, two impressive uneven pincers, long fine curving antennae, articulated segmented armor, many finely drawn legs and a fanned tail, delicate engraved marine illustration with washed teal sea ripples.
TOP FOURTH (cell 4): a medieval Hanseatic trading cog at sea, beautifully inked wooden carvel hull, tall ivory square sail, small triangular foresail, weathered reddish pennant, woven rigging and taut ropes, plank lines and tiny ship rail detail, small engraved teal wake beneath.
BOTTOM LEFT (cell 5): a weathered medieval merchant ship dramatically foundering, broken leaning mast, torn ivory sail, half-submerged dark timber hull tilted into small inked curling waves, intricately drawn ropes and spars, dark muted teal wash.
BOTTOM SECOND (cell 6): a North Sea offshore oil platform imagined as a careful antique copperplate atlas engraving, slender rust-bronze lattice derrick, cross-braced iron legs standing in small sea ripples, deck cabins, railings, a delicate crane with cable. Keep it mechanically credible and cohesive with ink-and-watercolor treatment, no modern text.
BOTTOM THIRD (cell 7): a majestic northern humpback whale breaching low across the water, large streamlined back facing left, pleated pale throat, dark teal ink stippling, long graceful near flipper, raised deeply notched tail flukes to right, small hand-inked arcing blow and delicate sea ripples.
BOTTOM FOURTH (cell 8): empty fully transparent.
Composition: all seven drawings occupy comparable visual area, use full available cell but absolutely never overlap into another cell. Marine wave lines only within each individual vignette, no shared ocean background.
Constraints: genuine transparent alpha background behind and between all seven illustrations; no parchment rectangle, no white box, no checkerboard drawn into image, no drop shadow, no text, no watermarks, no logos. Do not include a map, scenery, land, or compass.

## Targeted layout refinement

The generated atlas was inspected before this edit. The reference image is the first generated atlas; the final image is the edited version.

Use case: compositing. Asset type: production maritime illustration sprite atlas.
Edit the supplied atlas. Preserve the exquisite engraved ink and watercolor style, all seven subjects, anatomy, palettes, contours and meticulous details. Correct ONLY the atlas layout by giving every illustration safe empty transparent margins so nothing is cropped or touches another sprite. Recompose as exactly 4 equal columns × 2 equal rows in a landscape 2:1 image, preferably 2048×1024. Every subject must fit entirely inside its equal cell. Scale each subject down enough to guarantee at least 9% transparent margin inside all four sides of its cell. Leave a wide fully transparent horizontal gutter between rows and vertical gutter between columns. All horns, flagpoles, kraken tentacle tips, sails, rigging, whale blow and wave splashes must be completely visible inside the cells. Reconstruct previously clipped extremities naturally. Never let any top-row drawing enter the lower row, and never let any drawing enter another column.
Keep exact order: TOP ROW serpent | kraken | lobster | trading ship. BOTTOM ROW sinking ship | oil platform | whale | empty transparent cell. The whale must fit fully in column three and not intrude into the empty fourth cell. Retain small marine waves immediately beneath each subject, but do not add connecting sea.
Real RGBA transparency behind and between sprites, no white or parchment background, no drawn checkerboard, no labels or grid or text. The subjects should still be richly detailed and readable, just placed safely inside their cells with clean transparent gutters.

