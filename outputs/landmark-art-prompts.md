# Landmark artwork prompt record

Generated with the built-in `image_gen.imagegen` tool (not CLI). The user-provided medieval map and sea serpent images informed the project's art direction. This landmark sheet was generated from the written specification below.

## Selected assets

- Source PNG: `outputs/landmark-art-v2.png` (1774 × 887 pixels; RGBA; 2,161,558 bytes).
- Production atlas: `dist/assets/illustrations/landmarks-ink-v2.webp` (1774 × 887 pixels; alpha preserved; 618,450 bytes; 71.4% smaller).
- Consumer: `dist/assets/landmarks.js`.
- Format-only encoding script: `outputs/build-landmark-art.mjs`.

The final sheet contains eight separately addressed landmark drawings. Individual UV rectangles follow the actual ink bounds rather than assume perfectly even generated cell boundaries. One shared texture/material serves eight billboard meshes (16 total triangles). Buildings remain at their geographic anchors; Oslo's illustration sits in the existing eastern Opera footprint to keep the journey forecourt clear.

## Generation prompt

```text
Use case: stylized-concept.
Asset type: ONE production texture atlas sheet for eight cartographic landmark illustrations, transparent PNG, wide 2:1 canvas, ideally 2048 by 1024 pixels.
Primary request: an exquisite hand-drawn medieval fantasy atlas illustration sheet, eight individual recognizable architectural miniature vignettes, cohesive skilled ink and muted watercolor style. This must look illustrated by a master map artist, with lively fine brown-black pen contours, architectural masonry hatching and tiny windows, layered tiled roofs, warm ivory highlights, atmospheric restrained dusty vermilion, ochre, sage and slate. Rich detail and recognizable silhouettes, legible at small map size. Slightly elevated three-quarter view from the southeast for all subjects. Hand drawn storybook cartography, not flat vector, not polygonal, not 3D render, not photorealistic.
Composition/framing: EXACTLY four columns and two rows of equally sized invisible square cells. Each subject centered within its cell, wholly contained with ample fully transparent gutters. Each miniature uses at most 82% of cell width and 82% of cell height. No frames, no grid lines, no labels or text. Separate drawings must never overlap. Whole sheet transparent around and between subjects, no parchment rectangle, no scene backdrop.
Top row left to right:
1. Bergen Bryggen: five closely spaced traditional narrow wooden Hanseatic wharf houses, steep gables facing viewer, rich warm ochre and muted red, timber windows and plank details, tiny dock at base.
2. Oslo Opera House: clearly identifiable contemporary white marble sloping angular roofs rising from a stepped waterfront plaza, blue-green glass curtain wall and modest square fly tower. Preserve its modern landmark architecture while rendering it in old-atlas ink and watercolor. Broad low silhouette, no gables, no added fantasy castle.
3. Stockholm City Hall: recognizable long warm brick civic palace with red tiled roofs and its single very tall squared bell tower capped by small dark lantern, slender gilded spire and three crowns. A few subtle courtyard and waterfront base details.
4. Copenhagen Nyhavn: six tightly adjacent narrow colorful canal houses of varied stepped/triangular gables and mullioned windows, tiny elegant mast and dock details, restrained sea green, muted red, ivory and ochre.
Bottom row left to right:
5. Warsaw Royal Castle: long vermilion Renaissance palace with white stone window details and a prominent central clock tower with dark green bulbous spire; delicate hatching and carved gate.
6. Dutch windmill: picturesque traditional working stone and dark timber windmill with four long latticed sails making an X, small round gallery, tiled roof and a touch of grass at its base.
7. Gdansk Zuraw: recognizable medieval harbor crane, pair of broad red-brick round tower masses flanking tall dark oak timber crane body and steep dark roof, projecting loading structure and tiny dock.
8. London Tower Bridge: unmistakable two ornate Gothic masonry towers, steep slate turrets and delicate pale blue suspension details, elevated walkway and low bridge deck, elegant very wide silhouette but still wholly within the last cell.
Constraints: drawings only; no people; no words; no flags with writing; absolutely no caption or watermark. True transparent alpha, including gutters. Delicate natural ink imperfections, clear silhouettes, subtle short watercolor contact shadow only directly under each building.
```

## Selected refinement prompt

The first generated atlas was passed as the single edit target. This selected refinement preserves the detailed artwork and gives the tall Stockholm spire sufficient edge clearance.

```text
Use case: precise-object-edit. Edit the previous transparent architectural landmark atlas to improve layout ONLY. Preserve all eight beautiful architectural ink and watercolor illustrations and their identities and detail. Recompose them as exactly 4 columns by 2 rows of EQUAL SQUARE CELLS in a wide 2:1 sheet, with wide transparent gutters. Shrink each drawing so its entire silhouette fits completely within the inner 76% width and inner 76% height of its cell. Every pixel of every landmark must be inside its own cell with 12% transparent padding on all four sides; the tall Stockholm crown spire and wide Tower Bridge MUST be fully visible, not cropped at sheet edges. Especially give Warsaw margin on its right and Tower Bridge margin on left and right. Same ordering: top row Bergen Bryggen, Oslo Opera House, Stockholm City Hall, Copenhagen Nyhavn; bottom row Warsaw Royal Castle, Dutch windmill, Gdansk medieval crane, London Tower Bridge. Do not add any background, do not add cell outlines or grid, do not add labels or letters. TRUE transparent background. Keep the detailed pen and ink drawing with tiny masonry hatching and windows, restrained red and ochre and sage watercolor. No photorealism or flat vector.
```

## Verification

- Source has a true alpha channel; production conversion retains the source dimensions.
- Eight recognizable architectural subjects and no added labels or watermark were inspected at full sheet size.
- Desktop 1600 × 1000 overview was inspected in `outputs/landmark-overview-review.png` with all eight landmarks present, fine roof/window detail, and unobstructed language labels.
- `landmark-oslo`, geographic anchors, the exported `OPERA_FOOTPRINT`, async `ready` and the `{count,objects,ready}` interface remain available.

