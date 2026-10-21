# Geographic sources

- `elevation/*.png`: Mapzen Terrain Tiles, Terrarium format, downloaded from the public AWS Open Data `elevation-tiles-prod` bucket. Dataset: https://registry.opendata.aws/terrain-tiles/ . Source attribution details: https://github.com/tilezen/joerd/blob/master/docs/attribution.md .
- `elevation/heightfield.i16`: derived from those tiles for this prototype. 401 x 401 signed 16-bit little-endian height samples, in metres. Rows run north to south (73 to 47 degrees latitude); columns run west to east (-12 to 38 degrees longitude). Negative values are seabed. Detailed metadata is in `elevation/heightfield.json`.
- `coastline-50m.geojson`, `rivers-50m.geojson` and `lakes-50m.geojson`: Natural Earth 1:50m physical vectors, https://github.com/nvkelso/natural-earth-vector/tree/master/geojson . Natural Earth data are public domain: https://www.naturalearthdata.com/about/terms-of-use/ .

Natural Earth requires no separate license file or attribution; its public-domain terms permit redistribution and modification. Mapzen terrain tiles combine sources whose attribution is retained below.

Norway terrain data © Kartverket. Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers. Global ETOPO1 terrain data: U.S. National Oceanic and Atmospheric Administration. United States 3DEP and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved.

Terrain rendering may exaggerate elevation and simplify or resample coastlines for this interactive prototype. The derived view is not for navigation.

## Illustrated places and visual research

Landmark locations were researched before illustration; exact anchors, official operator/destination references and artistic placement adjustments are recorded in [landmark-locations.json](landmark-locations.json). The drawings are original artistic interpretations at exaggerated atlas scale.

- Offshore platform setting: [Johan Sverdrup, Norwegian Petroleum](https://www.norskpetroleum.no/en/facts/field/johan-sverdrup/). The drawing is an illustrative North Sea installation west of Stavanger, not a navigation chart or a dimensionally exact reconstruction.
- [Lindesnes Lighthouse, Visit Norway](https://www.visitnorway.com/listings/lindesnes-lighthouse/16446/), [Hirtshals Lighthouse, Visit Denmark](https://www.visitdenmark.com/denmark/explore/hirtshals-fyr-lighthouse-gdk594892), and [Kullaberg, County Administrative Board of Skåne](https://www.lansstyrelsen.se/download/18.68fbc90d193243b379e481f4/1732526294340/Nature%20reserves%20in%20Sk%C3%A5ne%20-%20Kullaberg%2C%20folder.pdf). Small lighthouse drawings are fitted to the generalized land mask near their real capes.
- Vehicle shape references: [Volkswagen Passat exterior design](https://www.volkswagen-newsroom.com/en/the-new-passat-international-media-drive-18257/stylish-driving-new-design-from-scratch-yet-still-a-passat-18264), [Wizz Air Airbus A321neo, Airbus](https://www.airbus.com/en/newsroom/press-releases/2019-03-wizz-air-takes-delivery-of-its-first-a321neo). Vehicle drawings are original isometric paper illustrations generated for the map; no external model files were downloaded.

New maritime drawings were generated separately with the built-in OpenAI image generation tool. Prompts, source images and production asset paths are recorded in [ARTWORK.md](../ARTWORK.md).

## Upright paper landmark illustrations

The eleven remaining hero landmark and volcano drawings use original, fixed upright isometric paper illustrations. Their surveyed roots, artistic drawing positions, ground-foot widths and bank exclusions are recorded separately in [landmark-locations.json](landmark-locations.json). Warsaw's visible painted base stays west/south of the Vistula. Cologne is deliberately illustrated east of the Rhine at the user's request; its surveyed building location remains recorded separately. Bryggen and Oslo Opera House are removed from the active scene.

The three additional real assets were researched before placement:

- Brandenburg Gate: [Berlin's official Pariser Platz information](https://www.berlin.de/sehenswuerdigkeiten/3561743-3558930-pariser-platz.html), [Visit Berlin](https://www.visitberlin.de/en/brandenburg-gate), and the [named OpenStreetMap building](https://www.openstreetmap.org/way/518071791), 13.3777034 E, 52.5162699 N.
- Cologne Cathedral: [the cathedral's official directions and Domkloster 4 address](https://www.koelner-dom.de/besuchen/anfahrt) and its [named OpenStreetMap building](https://www.openstreetmap.org/way/4532022), 6.958138 E, 50.9413035 N.
- Edinburgh Castle: [the castle operator's official location and grid reference](https://www.edinburghcastle.scot/plan-your-visit/getting-here/) and the [named OpenStreetMap building](https://www.openstreetmap.org/way/4301292), 3.2004184 W, 55.9486884 N.

Revision 7 checks the affected illustrations' actual painted lower bands against sea and river banks through the overview camera, including the vertical scroll range. The windmill, Nyhavn, Edinburgh Castle and smaller Brandenburg Gate have dry painted bases. Hekla's upright, unwarped drawing sits centrally on Iceland as an intentional artistic offset. Earlier projected size references remain in [landmark-size-baseline-v5.json](landmark-size-baseline-v5.json).

Hekla volcano: [Visit South Iceland official coordinate](https://www.south.is/en/destinations/nature/nature/hekla-volcano), N63 58 59.767 / W19 42 24.306, and the [Icelandic volcano catalogue](https://icelandicvolcanoes.is/?volcano=HEK). Snow, crater warmth and the exaggerated cone are artistic interpretation, not a statement of present volcanic activity.
