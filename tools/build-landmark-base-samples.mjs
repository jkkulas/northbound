// Conservative alpha envelopes from the delivered illustration crops. The
// finer independent QA reads the PNG pixels again instead of trusting these.
import fs from 'node:fs';
import {PNG} from 'pngjs';
const atlas=JSON.parse(fs.readFileSync('dist/assets/paper-atlas-v6.json','utf8'));
const assets={};
for(const id of ['stockholm','nyhavn','warsaw','windmill','gdansk','london','borgund','brandenburg','cologne','edinburgh','iceland_volcano']){
 const art=atlas.art[id],png=PNG.sync.read(fs.readFileSync(art.source)),[l,t,r,b]=art.sourceBounds,rows=[];
 for(let i=0;i<16;i++){
  const v0=i*.0125,v1=(i+1)*.0125;let min=Infinity,max=-Infinity;
  for(let y=Math.max(t,Math.floor(b-v1*(b-t)));y<Math.min(b,Math.ceil(b-v0*(b-t)));y++)for(let x=l;x<r;x++)if(png.data[(y*png.width+x)*4+3]>=6){min=Math.min(min,(x-l)/(r-l));max=Math.max(max,(x+1-l)/(r-l));}
  if(Number.isFinite(min))rows.push([+v0.toFixed(4),+v1.toFixed(4),+min.toFixed(5),+max.toFixed(5)]);
 }
 assets[id]={source:art.source,rows};
}
const countries=JSON.parse(fs.readFileSync('countries.geojson','utf8'));
const netherlands=countries.features.find(f=>f.properties.ADMIN==='Netherlands').geometry;
fs.writeFileSync('dist/assets/landmark-base-samples.json',JSON.stringify({alphaCutoff:6/255,band:[0,.2],geographicAreas:{netherlands},assets})+'\n');
