# Maritime atlas v3 — ocean-base extraction

Generated with the built-in `image_gen` tool on 2026-10-21. This is a bounded edit of `dist/assets/maritime-engraving-atlas.webp`, preserving the seven subjects and their full-color opaque bodies while removing the large painted water pools beneath them.

## Files

- Generated source copied into the project: `outputs/creature-art/maritime-engraving-atlas-v3.png`.
- Full delivery atlas: `dist/assets/maritime-engraving-atlas-v3.webp`, 1774 × 887, 696,004 bytes.
- Mobile delivery atlas: `dist/assets/maritime-engraving-atlas-v3-mobile.webp`, 887 × 444, 169,340 bytes.
- Encoder: `outputs/creature-art/encode-maritime-v3.mjs`. Chrome canvas performs format-only encoding and mobile resampling, preserving alpha and colors.
- Ground preview: `outputs/creature-art/maritime-v3-ground-preview.png`.
- Closeups: `outputs/creature-art/maritime-v3-serpent-closeup.png`, `outputs/creature-art/maritime-v3-whale-closeup.png`.

The generated PNG's native dimensions match the original 1774 × 887. Every complete body remains within its previous cell. The whale's spout is intentionally retained as water spray. No background-color keying, desaturation, or selective color filtering was applied. Source alpha describes silhouette edges and the spout; the consuming material renders retained pixels with alpha 1 so the chart cannot show through bodies or sails.

To remove empty padding formerly occupied by painted pools, use these UV rectangles (left, top, right, bottom). They retain original x and top bounds and end three pixels below the last visible pixel at the renderer's alpha threshold of 0.18:

| Subject | Rect | Visible bounds at alpha ≥ 46/255 |
| --- | --- | --- |
| Jörmungandr | `[10,20,474,443]` | `[21,26,459,440]` |
| Kraken | `[477,10,907,457]` | `[484,18,896,454]` |
| Lobster | `[915,51,1336,456]` | `[924,58,1318,453]` |
| Trader | `[1341,15,1774,441]` | `[1365,20,1747,438]` |
| Sinking ship | `[25,468,474,813]` | `[44,473,453,810]` |
| Oil platform | `[502,467,902,828]` | `[547,467,879,825]` |
| Whale | `[932,492,1451,845]` | `[943,498,1434,842]` |

Original builtin output:
`C:/Users/loaka/.codex/generated_images/01a15dbd-eb53-7b61-8b8b-7abdc42ffdbf/exec-993218b3-7a83-4652-8ad8-3767470f7872.png`.

The tool did not expose a monetary cost.

## Exact final prompt

```text
Use case: background-extraction
Asset type: transparent texture atlas for a medieval manuscript map, seven illustrations in their exact existing cells.
Input image 1 is the EDIT TARGET. Keep the canvas aspect ratio 2:1 and exact subject arrangement, framing, scale, positions, all seven identities, all anatomy, all original rich colors, all thin ink outlines and engraved detail. This is an extremely bounded cleanup of ONLY painted water backgrounds.
Primary request: remove the large painted deep blue/teal ocean pools and their surrounding white foam below/around the seven subjects. Replace ONLY those surrounding ocean pools/foam with actual alpha transparency. Retain a few delicate dark engraved waterline strokes if useful, with no filled pool or plinth.
Critical invariants: Every creature/ship/platform body is FULLY OPAQUE with the original rich full-color pigment. Preserve the entire dark teal scaled sea serpent body including ALL its left-hand and lower curling coils and pale belly. The serpent coils are anatomy, not blue ocean to erase. Preserve every kraken tentacle and sucker, every lobster claw/leg/antenna, ship hull/sails/rigging, oil platform structure, and the entire whale body/fins/tail/spout. Do not make anatomy translucent. Do not desaturate, bleach, recolor, fade or convert artwork into line art.
Composition: same seven separate subjects and exact current relative rectangular positions, size, and spacing. Top row: sea serpent, kraken, lobster, intact medieval sailing trader. Bottom row: sinking wooden ship, oil platform, breaching whale. No new or moved subjects, no labels, no added background, no shadows, no parchment card, no border, no enlarged cropping. Background MUST be genuinely transparent.
The purpose is for existing map water to surround each body naturally, without an opaque little blue ocean platform pasted under each illustration. Change ONLY the extraneous water pool and associated background foam, not any subject.
```

