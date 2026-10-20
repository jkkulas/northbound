# Geographic sources

- `elevation/*.png`: Mapzen Terrain Tiles, Terrarium format, downloaded from the public AWS Open Data `elevation-tiles-prod` bucket. Dataset: https://registry.opendata.aws/terrain-tiles/ . Source attribution details: https://github.com/tilezen/joerd/blob/master/docs/attribution.md .
- `elevation/heightfield.i16`: derived from those tiles for this prototype. 401 x 401 signed 16-bit little-endian height samples, in metres. Rows run north to south (73 to 47 degrees latitude); columns run west to east (-12 to 38 degrees longitude). Negative values are seabed. Detailed metadata is in `elevation/heightfield.json`.
- `coastline-50m.geojson`, `rivers-50m.geojson` and `lakes-50m.geojson`: Natural Earth 1:50m physical vectors, https://github.com/nvkelso/natural-earth-vector/tree/master/geojson . Natural Earth data are public domain: https://www.naturalearthdata.com/about/terms-of-use/ .

Natural Earth requires no separate license file or attribution; its public-domain terms permit redistribution and modification. Mapzen terrain tiles combine sources whose attribution is retained below.

Norway terrain data © Kartverket. Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers. Global ETOPO1 terrain data: U.S. National Oceanic and Atmospheric Administration. United States 3DEP and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved.

Terrain rendering may exaggerate elevation and simplify or resample coastlines for this interactive prototype. The derived view is not for navigation.
