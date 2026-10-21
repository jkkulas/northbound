// Audit every original maritime pigment sample against the real geography.
// Actual atlas UV triangles recover upright painted surfaces, including mirrored
// ships. Camera rays then locate their visible footprint on the water plane.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {chromium} from 'playwright-core';
import {PNG} from 'pngjs';
const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png'));
const geography=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8'));
const SEA=-.05,ALPHA=.25;
const region=([lon,lat])=>{const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),y=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0};

function pigmentSurface(model){
 const positions=model.geometryPosition,uv=model.geometryUv;
 assert.ok(positions?.length&&uv?.length===positions.length/3*2,`${model.name}: inspectable painted surface`);
 const matrix=new THREE.Matrix4().fromArray(model.matrixWorld),vertices=[];
 for(let i=0;i<positions.length;i+=3)vertices.push(new THREE.Vector3().fromArray(positions,i).applyMatrix4(matrix));
 const indices=model.geometryIndex?.length?model.geometryIndex:Array.from({length:vertices.length},(_,i)=>i);
 // These are four-vertex quads, not terrain meshes. Working directly in atlas
 // UVs avoids assuming that the picture's left edge is the geometry's left edge.
 const triangles=[];
 for(let i=0;i<indices.length;i+=3){
  const [ia,ib,ic]=indices.slice(i,i+3),a=[uv[ia*2],uv[ia*2+1]],b=[uv[ib*2],uv[ib*2+1]],c=[uv[ic*2],uv[ic*2+1]];
  const determinant=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(determinant)<1e-12)continue;
  triangles.push({a,b,c,determinant,pa:vertices[ia],pb:vertices[ib],pc:vertices[ic]});
 }
 return{vertices,pointAt(u,v,target){
  for(const t of triangles){
   const wa=((t.b[1]-t.c[1])*(u-t.c[0])+(t.c[0]-t.b[0])*(v-t.c[1]))/t.determinant;
   const wb=((t.c[1]-t.a[1])*(u-t.c[0])+(t.a[0]-t.c[0])*(v-t.c[1]))/t.determinant,wc=1-wa-wb;
   if(Math.min(wa,wb,wc)<-1e-6)continue;
   target.copy(t.pa).multiplyScalar(wa).addScaledVector(t.pb,wb).addScaledVector(t.pc,wc);return true;
  }
  return false;
 }};
}

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
fs.mkdirSync('outputs',{recursive:true});
try{
 for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(rootURL,{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.artwork==='illuminated-atlas',null,{timeout:60000});
  await page.evaluate(async()=>{window.__compositionInspect=(await import(new URL('./assets/app.js',document.baseURI))).inspectScene;});
  await page.waitForFunction(()=>{const p=window.__compositionInspect().performance;return p.framesRendered>=1&&!p.active;},null,{timeout:60000});
  const state=await page.evaluate(()=>window.__compositionInspect({artwork:true}));
  assert.equal(state.seaArtwork?.length,17,'inspectScene exposes all seventeen live maritime vignettes');
  const camera=new THREE.PerspectiveCamera(state.camera.fov,state.camera.aspect,.1,600);
  camera.position.fromArray(state.camera.position);camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));camera.updateMatrixWorld();
  const encoded=await page.evaluate(async urls=>{
   const result=[];
   for(const url of urls){const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);result.push({url,png:c.toDataURL('image/png').split(',')[1]});}
   return result;
  },[...new Set(state.seaArtwork.map(model=>model.atlas))]);
  const images=new Map(encoded.map(({url,png})=>[url,PNG.sync.read(Buffer.from(png,'base64'))]));
  assert.equal(images.size,1,'All maritime art shares one new illustrated atlas');
  for(const image of images.values())assert.deepEqual([image.width,image.height],viewport.width<760?[1536,576]:[3072,1152],'Expected full-resolution or mobile maritime artwork');
  const models=[];
  for(const model of state.seaArtwork){
   const surface=pigmentSurface(model),point=new THREE.Vector3(),projected=new THREE.Vector3(),bitmap=images.get(model.atlas);
   const us=model.geometryUv.filter((_,i)=>i%2===0),vs=model.geometryUv.filter((_,i)=>i%2===1),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
   let sampled=0,overLand=0,totalWeight=0,landWeight=0,visible=0,unmapped=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,minGap=Infinity,maxGap=-Infinity;
   const encroachments=[];
   for(const p of surface.vertices){const gap=p.y-SEA;minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);}
   for(let y=Math.max(0,Math.ceil((1-v1)*bitmap.height-.5));y<Math.min(bitmap.height,(1-v0)*bitmap.height-.5);y++)for(let x=Math.max(0,Math.ceil(u0*bitmap.width-.5));x<Math.min(bitmap.width,u1*bitmap.width-.5);x++){
    const weight=bitmap.data[(y*bitmap.width+x)*4+3]/255;if(weight<ALPHA)continue;
    const u=(x+.5)/bitmap.width,v=1-(y+.5)/bitmap.height;
    if(!surface.pointAt(u,v,point)){unmapped++;continue;}
    projected.copy(point).project(camera);
    const sx=(projected.x+1)*viewport.width/2,sy=(1-projected.y)*viewport.height/2;
    if(projected.z>=-1&&projected.z<=1&&sx>=0&&sx<=viewport.width&&sy>=0&&sy<=viewport.height)visible++;
    minX=Math.min(minX,sx);minY=Math.min(minY,sy);maxX=Math.max(maxX,sx);maxY=Math.max(maxY,sy);
    // Intersect the overview viewing ray with the real sea. Checking the quad's
    // raw x/z would miss upper sails and tentacles projected across a coastline.
    const rayScale=(SEA-camera.position.y)/(point.y-camera.position.y);
    const seaX=camera.position.x+(point.x-camera.position.x)*rayScale,seaZ=camera.position.z+(point.z-camera.position.z)*rayScale,geo=[seaX/2.2+13,60-seaZ/4.4];
    sampled++;totalWeight+=weight;if(region(geo)){overLand++;landWeight+=weight;if(encroachments.length<5)encroachments.push({pixel:[x,y],geo:geo.map(v=>+v.toFixed(6)),alpha:+weight.toFixed(3)});}
   }
   models.push({name:model.name,mirror:model.userData.mirror,sampled,unmapped,visible,overLand,landPercent:+(100*landWeight/totalWeight).toFixed(4),encroachments,minSurfaceGap:+minGap.toFixed(5),maxSurfaceGap:+maxGap.toFixed(5),bounds:[minX,minY,maxX,maxY].map(v=>+v.toFixed(1))});
  }
  assert.deepEqual(errors,[],'No shader, resource or runtime failures');
  reports.push({viewport,models});await page.screenshot({path:`outputs/composition-${viewport.width}.png`});await page.close();
 }
 fs.writeFileSync('outputs/composition-regression.json',JSON.stringify(reports,null,2));
 for(const report of reports)for(const model of report.models){
  assert.ok(model.sampled>100,`${model.name}: maritime pigment is present`);
  assert.equal(model.unmapped,0,`${model.name}: every pigment sample maps to the painted mesh`);
  assert.equal(model.overLand,0,`${model.name} at ${report.viewport.width} paints original pigment onto land (${model.landPercent}%)`);
  assert.ok(Math.abs(model.minSurfaceGap-.065)<=.005,`${model.name} ${report.viewport.width}: upright maritime model must meet its sea anchor (${model.minSurfaceGap})`);
  assert.ok(model.maxSurfaceGap-model.minSurfaceGap>1,`${model.name} ${report.viewport.width}: maritime illustration must retain its dimensional height`);
 }
 console.log(`Composition passes: all seventeen entire maritime vignettes project onto water at ${reports.length} viewport sizes (${reports.flatMap(r=>r.models).reduce((s,m)=>s+m.sampled,0).toLocaleString()} original pigment samples, including mirrored ships).`);
}finally{await browser.close();}
