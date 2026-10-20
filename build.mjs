import fs from 'node:fs';
const rad=Math.PI/180, p1=43*rad,p2=62*rad,n=Math.log(Math.cos(p1)/Math.cos(p2))/Math.log(Math.tan(Math.PI/4+p2/2)/Math.tan(Math.PI/4+p1/2)), F=Math.cos(p1)*Math.pow(Math.tan(Math.PI/4+p1/2),n)/n,r0=F/Math.pow(Math.tan(Math.PI/4+54*rad/2),n);
function project([lon,lat]) { const r=F/Math.pow(Math.tan(Math.PI/4+lat*rad/2),n),a=n*(lon-12)*rad;return [500+1120*r*Math.sin(a),400+1120*(r*Math.cos(a)-r0)]; }
function ringPath(ring) {return ring.map((p,i)=>{const [x,y]=project(p);return (i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}).join('')+'Z'}
function path(f){let p=f.geometry.coordinates;if(f.geometry.type==='Polygon')p=[p];return p.map(poly=>poly.map(ringPath).join('')).join('')}
const countries=JSON.parse(fs.readFileSync('countries.geojson')).features;
const areas={en:'',pl:'',no:''};
const neighbors=new Set(['TUR','CYP','MAR','DZA','TUN','LBY','EGY','GEO','ARM','AZE','SYR','IRQ','IRN','KAZ','LBN','ISR','JOR','SAU']);
for(const f of countries){const a=f.properties.ADM0_A3;if(f.properties.CONTINENT!=='Europe'&&!neighbors.has(a))continue;areas[a==='NOR'?'no':a==='POL'?'pl':'en']+=path(f)}
let html=fs.readFileSync('index.template.html','utf8');for(const [k,v]of Object.entries(areas))html=html.replace('{{'+k+'}}',v);
fs.writeFileSync('dist/index.html',html);fs.writeFileSync('dist/assets/geo.js','export const project = '+project.toString().replace('const r=','const rad='+rad+',F='+F+',n='+n+',r0='+r0+';const r=')+';');
for(const lang of ['en','pl','no']){fs.mkdirSync('dist/'+lang,{recursive:true});const name={en:'English',pl:'Polski',no:'Norsk'}[lang];fs.writeFileSync('dist/'+lang+'/index.html',`<!doctype html><html lang="${lang==='no'?'nb':lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f5f4ed;color:#27392f;font:500 clamp(48px,10vw,120px) Georgia,serif}h1{font:inherit}</style><h1>${name}</h1></html>`)}
console.log('Built map and all three language destinations.');
