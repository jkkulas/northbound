# Northbound

A buildless, responsive language gateway with a geographically projected SVG map of Europe. Norway and Poland are separate interactive regions; all other land is one English region without internal borders.

Run `npm run dev` and open http://127.0.0.1:4173. The deployable site is in `dist/`; it has no runtime dependencies or external network requests.

`npm run build` regenerates the map and the three deliberately minimal language pages from `index.template.html` and `countries.geojson`. Edit presentation and behavior in `dist/assets/style.css` and `dist/assets/app.js`. `npm test` runs browser checks against the running local server using the installed Chrome executable.

Routes use real geographic coordinates: flights arrive at Sandefjord Airport Torp before the car continues to Oslo. Norway selections drive from the clicked point to Høvik. Travel paths are stylized approximations, rather than road navigation. Reduced-motion visitors go directly to their chosen page; every journey also has a skip control.

Map data: Natural Earth 1:50m country boundaries, public domain. Fonts: DM Sans and Playfair Display, distributed under the SIL Open Font License. Font files are self-hosted.
