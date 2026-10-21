// Independent composition check. It projects the original source pigment through
// the live model/camera matrices, then intersects the underlying physical atlas.
// The rendered artwork's coast clipping shader is deliberately not consulted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png'));
const geography=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8'));
const elevation=fs.readFileSync('dist/assets/terrain.i16');
const heights=new Int16Array(elevation.buffer,elevation.byteOffset,elevation.byteLength/2);
const region=([lon,lat])=>{const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),y=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0};
function heightAt(lon,lat){
 const x=THREE.MathUtils.clamp((lon+12)/50*400,0,399.999),y=THREE.MathUtils.clamp((73-lat)/26*400,0,399.999),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
 const a=heights[j*401+i]*(1-fx)+heights[j*401+i+1]*fx,b=heights[(j+1)*401+i]*(1-fx)+heights[(j+1)*401+i+1]*fx;
 const feather=THREE.MathUtils.smoothstep(lon,-12,-9)*(1-THREE.MathUtils.smoothstep(lon,35,38))*THREE.MathUtils.smoothstep(lat,47,49)*(1-THREE.MathUtils.smoothstep(lat,71,73));
 return .22+Math.max(0,a*(1-fy)+b*fy)/1000*3.2*feather;
}
function rayHitsLand(ray,maxHeight){
 const point=new THREE.Vector3(),start=Math.max(0,(maxHeight+.4-ray.origin.y)/ray.direction.y),end=-ray.origin.y/ray.direction.y;
 let low=start,high=end;
 for(let i=1;i<=48;i++){const t=start+(end-start)*i/48;ray.at(t,point);if(point.y<=heightAt(point.x/2.2+13,60-point.z/4.4)){high=t;break;}low=t;}
 for(let i=0;i<12;i++){const t=(low+high)/2;ray.at(t,point);if(point.y>heightAt(point.x/2.2+13,60-point.z/4.4))low=t;else high=t;}
 ray.at(high,point);return region([point.x/2.2+13,60-point.z/4.4])!==0;
}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{
 for(const viewport of [{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  await page.goto(rootURL,{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.artwork==='illuminated-atlas');
  await page.evaluate(async()=>{const app=await import(new URL('./assets/app.js',document.baseURI));window.__compositionInspect=app.inspectScene;});
  await page.waitForFunction(()=>{const p=window.__compositionInspect().performance;return p.framesRendered>=1&&!p.active;});
  const state=await page.evaluate(()=>window.__compositionInspect());
  assert.equal(state.seaArtwork?.length,7,'inspectScene exposes all seven live maritime models');
  const camera=new THREE.PerspectiveCamera(state.camera.fov,state.camera.aspect,.1,600);
  camera.position.fromArray(state.camera.position);camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));camera.updateMatrixWorld();
  const source=await page.evaluate(async models=>{
   const result=[];const images=new Map();
   for(const model of models){
    let bitmap=images.get(model.atlas);
    if(!bitmap){const img=new Image();img.src=model.atlas;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);bitmap={data:ctx.getImageData(0,0,img.width,img.height).data,width:img.width,height:img.height};images.set(model.atlas,bitmap);}
    const us=model.geometryUv.filter((_,i)=>i%2===0),vs=model.geometryUv.filter((_,i)=>i%2===1),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs),points=[];
    for(let y=Math.ceil((1-v1)*bitmap.height);y<(1-v0)*bitmap.height;y+=2)for(let x=Math.ceil(u0*bitmap.width);x<u1*bitmap.width;x+=2){
     const alpha=bitmap.data[(y*bitmap.width+x)*4+3]/255;if(alpha>.15)points.push([(x/bitmap.width-u0)/(u1-u0),(1-y/bitmap.height-v0)/(v1-v0),alpha]);
    }
    result.push(points);
   }
   return result;
  },state.seaArtwork);
  const models=[];
  for(const [index,model]of state.seaArtwork.entries()){
   const geometry=[];for(let i=0;i<model.geometryPosition.length;i+=3)geometry.push(new THREE.Vector3().fromArray(model.geometryPosition,i));
   const x0=Math.min(...geometry.map(p=>p.x)),x1=Math.max(...geometry.map(p=>p.x)),y0=Math.min(...geometry.map(p=>p.y)),y1=Math.max(...geometry.map(p=>p.y)),matrix=new THREE.Matrix4().fromArray(model.matrixWorld),point=new THREE.Vector3(),ray=new THREE.Ray();
   let sampled=0,overLand=0,totalWeight=0,landWeight=0,visible=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   for(const [u,v,weight]of source[index]){
    point.set(x0+u*(x1-x0),y0+v*(y1-y0),0).applyMatrix4(matrix);ray.origin.copy(camera.position);ray.direction.copy(point).sub(camera.position).normalize();point.project(camera);
    const sx=(point.x+1)*viewport.width/2,sy=(1-point.y)*viewport.height/2;
    if(sx>=0&&sx<=viewport.width&&sy>=0&&sy<=viewport.height)visible++;
    minX=Math.min(minX,sx);minY=Math.min(minY,sy);maxX=Math.max(maxX,sx);maxY=Math.max(maxY,sy);
    sampled++;totalWeight+=weight;if(rayHitsLand(ray,state.terrainMaxHeight)){overLand++;landWeight+=weight;}
   }
   models.push({name:model.name,sampled,visible,overLand,landPercent:+(100*landWeight/totalWeight).toFixed(4),bounds:[minX,minY,maxX,maxY].map(v=>+v.toFixed(1))});
  }
  const report={viewport,models};reports.push(report);await page.screenshot({path:`outputs/composition-${viewport.width}.png`});await page.close();
 }
 fs.writeFileSync('outputs/composition-regression.json',JSON.stringify(reports,null,2));
 for(const report of reports)for(const model of report.models)assert.equal(model.overLand,0,`${model.name} at ${report.viewport.width} projects original pigment onto land (${model.landPercent}%)`);
 console.log(`Composition passes: all seven original illustrations lie over water at ${reports.length} viewport sizes (${reports.flatMap(r=>r.models).reduce((s,m)=>s+m.sampled,0).toLocaleString()} opaque source samples).`);
}finally{await browser.close();}
