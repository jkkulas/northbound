import fs from 'node:fs';
import {PNG} from 'pngjs';

const bounds={west:-12,east:38,south:47,north:73},size=1536;
const mask=new Uint8Array(size*size);
const countries=JSON.parse(fs.readFileSync('countries.geojson','utf8')).features;
const inside=([lon,lat])=>lon>=bounds.west&&lon<=bounds.east&&lat>=bounds.south&&lat<=bounds.north;
const pixel=([lon,lat])=>[(lon-bounds.west)/(bounds.east-bounds.west)*size,(bounds.north-lat)/(bounds.north-bounds.south)*size];
function paintPolygon(polygon,value){
 const rings=polygon.map(r=>r.map(pixel));let top=size,bottom=0;
 for(const ring of rings)for(const p of ring){top=Math.min(top,p[1]);bottom=Math.max(bottom,p[1])}
 for(let y=Math.max(0,Math.floor(top));y<Math.min(size,Math.ceil(bottom));y++){
  const crossings=[],line=y+.5;
  for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];if((a[1]>line)!==(b[1]>line))crossings.push(a[0]+(line-a[1])/(b[1]-a[1])*(b[0]-a[0]));
  }
  crossings.sort((a,b)=>a-b);
  for(let i=0;i+1<crossings.length;i+=2){const left=Math.max(0,Math.ceil(crossings[i]-.5)),right=Math.min(size,Math.ceil(crossings[i+1]-.5));if(right>left)mask.fill(value,y*size+left,y*size+right)}
 }
}
const outlines={no:[],pl:[]};
for(const f of countries){
 const code=f.properties.ADM0_A3,polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const polygon of polygons){
  const ring=polygon[0],xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  if(Math.max(...xs)<bounds.west||Math.min(...xs)>bounds.east||Math.max(...ys)<bounds.south||Math.min(...ys)>bounds.north)continue;
  paintPolygon(polygon,code==='NOR'?3:code==='POL'?2:1);
  if(code==='NOR'||code==='POL')outlines[code==='NOR'?'no':'pl'].push(ring.filter(inside));
 }
}
for(const f of JSON.parse(fs.readFileSync('data/lakes-50m.geojson','utf8')).features){
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const polygon of polygons)if(polygon[0].some(inside))paintPolygon(polygon,0);
}
fs.mkdirSync('dist/assets/vendor',{recursive:true});
const png=new PNG({width:size,height:size});
for(let i=0;i<mask.length;i++){png.data[i*4]=mask[i]*85;png.data[i*4+1]=0;png.data[i*4+2]=0;png.data[i*4+3]=255}
fs.writeFileSync('dist/assets/regions.png',PNG.sync.write(png));
fs.copyFileSync('data/elevation/heightfield.i16','dist/assets/terrain.i16');
fs.copyFileSync('node_modules/three/build/three.module.min.js','dist/assets/vendor/three.module.min.js');
fs.copyFileSync('node_modules/three/build/three.core.min.js','dist/assets/vendor/three.core.min.js');
fs.copyFileSync('node_modules/three/LICENSE','dist/assets/vendor/THREE-LICENSE.txt');
function linesFrom(file){
 const segments=[];if(!fs.existsSync(file))return segments;
 for(const f of JSON.parse(fs.readFileSync(file,'utf8')).features){
  const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
  for(const line of lines){let part=[];for(const p of line){if(inside(p))part.push([+p[0].toFixed(4),+p[1].toFixed(4)]);else if(part.length){if(part.length>1)segments.push(part);part=[]}}if(part.length>1)segments.push(part)}
 }
 return segments;
}
fs.writeFileSync('dist/assets/geography.json',JSON.stringify({bounds,columns:401,rows:401,outlines,rivers:linesFrom('data/rivers-50m.geojson'),coasts:linesFrom('data/coastline-50m.geojson')}));

// A static SVG remains functional when WebGL is unavailable.
const rad=Math.PI/180,p1=43*rad,p2=62*rad,n=Math.log(Math.cos(p1)/Math.cos(p2))/Math.log(Math.tan(Math.PI/4+p2/2)/Math.tan(Math.PI/4+p1/2)),F=Math.cos(p1)*Math.pow(Math.tan(Math.PI/4+p1/2),n)/n,r0=F/Math.pow(Math.tan(Math.PI/4+54*rad/2),n);
function project([lon,lat]){const r=F/Math.pow(Math.tan(Math.PI/4+lat*rad/2),n),a=n*(lon-12)*rad;return[500+1120*r*Math.sin(a),400+1120*(r*Math.cos(a)-r0)]}
function ringPath(ring){return ring.map((p,i)=>{const[x,y]=project(p);return(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}).join('')+'Z'}
const areas={en:'',pl:'',no:''};
for(const f of countries){if(f.properties.CONTINENT!=='Europe')continue;const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;areas[f.properties.ADM0_A3==='NOR'?'no':f.properties.ADM0_A3==='POL'?'pl':'en']+=polygons.map(p=>p.map(ringPath).join('')).join('')}
let html=fs.readFileSync('index.template.html','utf8');for(const[k,v]of Object.entries(areas))html=html.replace('{{'+k+'}}',v);fs.writeFileSync('dist/index.html',html);
for(const lang of ['en','pl','no']){fs.mkdirSync('dist/'+lang,{recursive:true});const name={en:'English',pl:'Polski',no:'Norsk'}[lang];fs.writeFileSync('dist/'+lang+'/index.html',`<!doctype html><html lang="${lang==='no'?'nb':lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><link rel="icon" href="data:,"><style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#05080e;color:#f0f6ff;font:500 clamp(48px,10vw,120px) Arial,sans-serif}h1{font:inherit}</style><h1>${name}</h1></html>`)}
fs.writeFileSync('dist/assets/credits.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Map credits · Northbound</title><style>body{max-width:740px;margin:10vh auto;padding:24px;background:#05080e;color:#b8c7dc;font:15px/1.8 Arial,sans-serif}a{color:#65b7ff}h1{color:white}</style><a href="../">← Northbound</a><h1>Map credits</h1><p>Elevation: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen Terrain Tiles / AWS Open Data</a>. Norway data © Kartverket. Europe data includes Copernicus EU-DEM funded by the European Union, USGS GMTED2010 and SRTM, NOAA ETOPO1, and © Environment Agency 2015.</p><p>Coastlines, countries, rivers and lakes: <a href="https://www.naturalearthdata.com/">Natural Earth</a>, public domain. Elevation is exaggerated for the illustrative view.</p><p>3D rendering: Three.js, MIT license. DM Sans / Playfair Display fonts: SIL Open Font License.</p></html>`);
console.log('Built 3D terrain, region mask, hydrography, fallback and three language destinations.');
