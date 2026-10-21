# Geographic sources

- `elevation/*.png`: Mapzen Terrain Tiles, Terrarium format, downloaded from the public AWS Open Data `elevation-tiles-prod` bucket. Dataset: https://registry.opendata.aws/terrain-tiles/ . Source attribution details: https://github.com/tilezen/joerd/blob/master/docs/attribution.md .
- `elevation/heightfield.i16`: derived from those tiles for this prototype. 401 x 401 signed 16-bit little-endian height samples, in metres. Rows run north to south (73 to 47 degrees latitude); columns run west to east (-12 to 38 degrees longitude). Negative values are seabed. Detailed metadata is in `elevation/heightfield.json`.
- `coastline-50m.geojson`, `rivers-50m.geojson` and `lakes-50m.geojson`: Natural Earth 1:50m physical vectors, https://github.com/nvkelso/natural-earth-vector/tree/master/geojson . Natural Earth data are public domain: https://www.naturalearthdata.com/about/terms-of-use/ .

Natural Earth requires no separate license file or attribution; its public-domain terms permit redistribution and modification. Mapzen terrain tiles combine sources whose attribution is retained below.

Norway terrain data © Kartverket. Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers. Global ETOPO1 terrain data: U.S. National Oceanic and Atmospheric Administration. United States 3DEP and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved.

Terrain rendering may exaggerate elevation and simplify or resample coastlines for this interactive prototype. The derived view is not for navigation.

## Modeled places and visual research

Landmark locations were researched before modeling; exact anchors, official operator/destination references and artistic placement adjustments are recorded in [landmark-locations.json](landmark-locations.json). The models are original artistic interpretations at exaggerated atlas scale.

- Offshore platform setting: [Johan Sverdrup, Norwegian Petroleum](https://www.norskpetroleum.no/en/facts/field/johan-sverdrup/). The drawing is an illustrative North Sea installation west of Stavanger, not a navigation chart or a dimensionally exact reconstruction.
- [Lindesnes Lighthouse, Visit Norway](https://www.visitnorway.com/listings/lindesnes-lighthouse/16446/), [Hirtshals Lighthouse, Visit Denmark](https://www.visitdenmark.com/denmark/explore/hirtshals-fyr-lighthouse-gdk594892), and [Kullaberg, County Administrative Board of Skåne](https://www.lansstyrelsen.se/download/18.68fbc90d193243b379e481f4/1732526294340/Nature%20reserves%20in%20Sk%C3%A5ne%20-%20Kullaberg%2C%20folder.pdf). Small lighthouse drawings are fitted to the generalized land mask near their real capes.
- Vehicle shape references: [Volkswagen Passat exterior design](https://www.volkswagen-newsroom.com/en/the-new-passat-international-media-drive-18257/stylish-driving-new-design-from-scratch-yet-still-a-passat-18264), [Wizz Air Airbus A321neo, Airbus](https://www.airbus.com/en/newsroom/press-releases/2019-03-wizz-air-takes-delivery-of-its-first-a321neo). Vehicle meshes are original stylized models; no external model or texture files were downloaded.

The active 3D fork uses original procedural geometry for architecture, maritime scenes, scenery, vehicles and the compass. New landmark research is recorded in [landmark-locations-3d.json](landmark-locations-3d.json). Historical generated maritime drawings remain as production history but are not loaded. Model recipes, placement checks and provenance are documented in [ARTWORK.md](../ARTWORK.md).
