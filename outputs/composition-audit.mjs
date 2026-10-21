import fs from 'node:fs';
import * as THREE from 'three';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.artwork);
const alpha = await page.evaluate(async()=>{
 const img=new Image();img.src='/assets/maritime-engraving-atlas.webp';await img.decode();
 const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
 const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 const arts={serpent:[10,20,474,467],kraken:[477,10,907,467],lobster:[915,51,1336,475],ship:[1341,15,1774,476],sinking:[25,468,474,862],rig:[502,467,902,878],whale:[932,492,1451,868]};
 return Object.fromEntries(Object.entries(arts).map(([key,[left,top,right,bottom]])=>{
  const points=[];for(let y=top;y<bottom;y+=2)for(let x=left;x<right;x+=2){const a=data[(y*img.width+x)*4+3]/255;if(a>.15)points.push([(x-left)/(right-left),(y-top)/(bottom-top),a]);}
  return [key,points];
 }));
});
await browser.close();
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png'));
const elevation=fs.readFileSync('dist/assets/terrain.i16');
const heights=new Int16Array(elevation.buffer,elevation.byteOffset,elevation.byteLength/2);
const region=([lon,lat])=>{const x=Math.floor((lon+64)/134*mask.width),y=Math.floor((89-lat)/59*mask.height);return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0};
function heightAt(lon,lat){
 const x=THREE.MathUtils.clamp((lon+12)/50*400,0,399.999),y=THREE.MathUtils.clamp((73-lat)/26*400,0,399.999),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
 const a=heights[j*401+i]*(1-fx)+heights[j*401+i+1]*fx,b=heights[(j+1)*401+i]*(1-fx)+heights[(j+1)*401+i+1]*fx;
 const feather=THREE.MathUtils.smoothstep(lon,-12,-9)*(1-THREE.MathUtils.smoothstep(lon,35,38))*THREE.MathUtils.smoothstep(lat,47,49)*(1-THREE.MathUtils.smoothstep(lat,71,73));
 return .22+Math.max(0,a*(1-fy)+b*fy)/1000*3.2*feather;
}
function createCamera(mobile){const camera=new THREE.PerspectiveCamera(mobile?44:40,mobile?390/844:1440/1000,.1,600);camera.position.set(...(mobile?[-5,77,110]:[-14,65,104]));camera.lookAt(...(mobile?[-5,0,3]:[-14,0,5]));camera.updateMatrixWorld();return camera;}
const art={serpent:{width:10.8,ratio:447/464,geo:[-.8,68.4],scale:1.17,label:true},kraken:{width:10.1,ratio:457/430,geo:[-.5,62.1],scale:1.06,label:true},lobster:{width:6.6,ratio:424/421,geo:[5.5,56.7],scale:.94},ship:{width:7.6,ratio:461/433,geo:[-5.2,59.6],scale:1.16},sinking:{width:7.9,ratio:394/449,geo:[-11,61.8],scale:.94},rig:{width:6.8,ratio:411/400,geo:[2.8,58.4],scale:.87},whale:{width:9.3,ratio:376/519,geo:[-8.5,66.3],scale:1.18}};
function audit(key,geo,mobile=false,scaleFactor=1){
 const camera=createCamera(mobile),a=art[key],s=a.scale*scaleFactor*(mobile?(a.label?.92:.72):1),anchor=new THREE.Vector3((geo[0]-13)*2.2,.055,(60-geo[1])*4.4),vector=new THREE.Vector3(),ray=new THREE.Ray(),hit=new THREE.Vector3(),projected=new THREE.Vector3();
 let total=0,land=0,landPixels=0,minX=1e5,minY=1e5,maxX=-1e5,maxY=-1e5;
 for(const [fx,fy,weight]of alpha[key]){
  vector.set((fx-.5)*a.width*s,(1-fy)*a.width*a.ratio*s,0).applyQuaternion(camera.quaternion).add(anchor);projected.copy(vector).project(camera);
  const sx=(projected.x+1)*(mobile?390:1440)/2,sy=(1-projected.y)*(mobile?844:1000)/2;minX=Math.min(minX,sx);minY=Math.min(minY,sy);maxX=Math.max(maxX,sx);maxY=Math.max(maxY,sy);
  ray.origin.copy(camera.position);ray.direction.copy(vector).sub(camera.position).normalize();let lo=Math.max(0,(7-ray.origin.y)/ray.direction.y),hi=-ray.origin.y/ray.direction.y;
  // Same height-field ray march as the product, with 48 intervals then a binary finish.
  const start=lo,end=hi;for(let i=1;i<=48;i++){const t=start+(end-start)*i/48;ray.at(t,hit);if(hit.y<=heightAt(hit.x/2.2+13,60-hit.z/4.4)){hi=t;break;}lo=t;}
  for(let i=0;i<8;i++){const t=(lo+hi)/2;ray.at(t,hit);if(hit.y>heightAt(hit.x/2.2+13,60-hit.z/4.4))lo=t;else hi=t;}
  ray.at(hi,hit);if(region([hit.x/2.2+13,60-hit.z/4.4])){land+=weight;landPixels++;}total+=weight;
 }
 return {geo,mobile,landPercent:+(100*land/total).toFixed(3),landPixels,bounds:[minX,minY,maxX,maxY].map(v=>+v.toFixed(1))};
}
const original=Object.entries(art).flatMap(([key,a])=>[false,true].map(mobile=>({key,...audit(key,mobile?(key==='serpent'?[4.2,68.4]:key==='kraken'?[1.5,62]:key==='rig'?[5,58.4]:a.geo):a.geo,mobile)})));
const candidates=[];if(!process.env.COMPOSITION_FAST)for(let lat=54.8;lat<=57.2;lat+=.4)for(let lon=1;lon<=5;lon+=.4){const geo=[+lon.toFixed(1),+lat.toFixed(1)],desktop=audit('lobster',geo),mobile=audit('lobster',geo,true);if(!desktop.landPixels&&!mobile.landPixels)candidates.push({geo,desktop:desktop.bounds,mobile:mobile.bounds});}
const recommended=[['lobster',[3.8,55.6]],['rig',[3.8,58.4]],['ship',[-3.5,59.4]]].flatMap(([key,geo])=>[false,true].map(mobile=>({key,...audit(key,geo,mobile)})));
const shipCandidates=[];for(const lat of [59.1,59.3,59.5])for(const lon of [-5,-4.6,-4.2,-3.8]){const geo=[lon,lat],desktop=audit('ship',geo),mobile=audit('ship',geo,true);shipCandidates.push({geo,desktop,mobile});}
const out={original,recommended,candidates,shipCandidates};fs.writeFileSync('outputs/composition-audit.json',JSON.stringify(out,null,2));console.log(JSON.stringify({recommended,shipCandidates},null,2));
