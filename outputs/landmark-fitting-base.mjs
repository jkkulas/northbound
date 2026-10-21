// Offline composition study: fit pigment to geographic support, not a pin.
import fs from 'node:fs';
import {PNG} from 'pngjs';
import * as THREE from 'three';
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png'));
const source=PNG.sync.read(fs.readFileSync('outputs/landmark-art-v2.png'));
const b=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8')).bounds;
const bytes=fs.readFileSync('dist/assets/terrain.i16'),heights=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2);
const region=(x,z)=>{const lon=x/2.2+13,lat=60-z/4.4,px=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),py=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);return px>=0&&px<mask.width&&py>=0&&py<mask.height?Math.round(mask.data[(py*mask.width+px)*4]/85):0};
function heightAt(x,z){
 const lon=x/2.2+13,lat=60-z/4.4;
 const dx=THREE.MathUtils.clamp((lon+12)/50*400,0,399.999),dy=THREE.MathUtils.clamp((73-lat)/26*400,0,399.999),i=Math.floor(dx),j=Math.floor(dy),fx=dx-i,fy=dy-j;
 const a=heights[j*401+i]*(1-fx)+heights[j*401+i+1]*fx,c=heights[(j+1)*401+i]*(1-fx)+heights[(j+1)*401+i+1]*fx;
 const feather=THREE.MathUtils.smoothstep(lon,-12,-9)*(1-THREE.MathUtils.smoothstep(lon,35,38))*THREE.MathUtils.smoothstep(lat,47,49)*(1-THREE.MathUtils.smoothstep(lat,71,73));
 return .22+Math.max(0,a*(1-fy)+c*fy)/1000*3.2*feather;
}
const models=[
 {asset:'oslo',geo:[10.75,59.91],rect:[461,219,890,453],width:4.8,offsetX:2.5},
 {asset:'stockholm',geo:[18.07,59.33],rect:[902,32,1315,454],width:5.7},
 {asset:'warsaw',geo:[21.01,52.25],rect:[12,450,476,853],width:6.1,region:2},
 {asset:'windmill',geo:[4.5,52.1],rect:[489,464,863,875],width:4.8},
 {asset:'gdansk',geo:[18.66,54.35],rect:[881,471,1288,876],width:5.2,region:2},
 {asset:'london',geo:[-.075,51.505],rect:[1295,485,1765,879],width:6.6},
];
const cameras=[{position:[-14,65,104],target:[-14,0,5],scale:1},{position:[-5,77,110],target:[-5,0,3],scale:.94}].map(c=>{
 const cam=new THREE.PerspectiveCamera(40,1,.1,600);cam.position.fromArray(c.position);cam.lookAt(new THREE.Vector3().fromArray(c.target));cam.updateMatrixWorld();
 return {cam,scale:c.scale,right:new THREE.Vector3(1,0,0).applyQuaternion(cam.quaternion),up:new THREE.Vector3(0,1,0).applyQuaternion(cam.quaternion)};
});
function samples(m,stride=7,baseOnly=false){const out=[],[l,t,r,bot]=m.rect;for(let y=t;y<bot;y+=stride)for(let x=l;x<r;x+=stride){const alpha=source.data[(y*source.width+x)*4+3]/255;if(alpha>.15&&(!baseOnly||y>t+(bot-t)*.7))out.push([(x-l)/(r-l)-.5,1-(y-t)/(bot-t),alpha]);}return out;}
function test(m,dx,dz,scale,points,exact=false){
 const ax=(m.geo[0]-13)*2.2,az=(60-m.geo[1])*4.4,x=ax+dx,z=az+dz,h=heightAt(x,z)+.08;
 let bad=0;
 for(const c of cameras){
  const s=scale*(m.asset==='oslo'?1:c.scale),w=m.width*s,hh=w*(m.rect[3]-m.rect[1])/(m.rect[2]-m.rect[0]),cam=c.cam.position;
  for(const [u,v] of points){
   const px=x+c.right.x*u*w+c.up.x*v*hh,py=h+c.right.y*u*w+c.up.y*v*hh,pz=z+c.right.z*u*w+c.up.z*v*hh;
   const rx=px-cam.x,ry=py-cam.y,rz=pz-cam.z;
   let t=(h-cam.y)/ry;
   if(exact){
    let lo=(15-cam.y)/ry,hi=-cam.y/ry;
    const start=lo,end=hi;
    for(let i=1;i<=48;i++){const q=start+(end-start)*i/48;if(cam.y+ry*q<=heightAt(cam.x+rx*q,cam.z+rz*q)){hi=q;break;}lo=q;}
    for(let i=0;i<12;i++){const q=(lo+hi)/2;if(cam.y+ry*q>heightAt(cam.x+rx*q,cam.z+rz*q))lo=q;else hi=q;}t=hi;
   }else for(let i=0;i<5;i++)t=(heightAt(cam.x+rx*t,cam.z+rz*t)-cam.y)/ry;
   const reg=region(cam.x+rx*t,cam.z+rz*t);
   if(m.region?reg!==m.region:reg===0){if(!exact)return false;bad++;}
  }
 }
 return exact?bad:true;
}
const results=[];
for(const m of models){
 const points=samples(m,7,true),base=samples(m,5,true),all=samples(m,2,true),candidates=[];
 const baseX=m.offsetX||0;
 for(const scale of m.asset==='oslo'?[1,.95,.90,.85,.8]:[1,.95,.9,.85]){
  for(let dx=-8;dx<=8;dx+=.25)for(let dz=-8;dz<=8;dz+=.25){
   if(m.asset==='oslo'&&(dx-m.width*scale/2<.1-.0001||dx+m.width*scale/2>4.9+.0001||Math.abs(dz)>1.5))continue;
   const distance=Math.hypot(dx-baseX,dz),score=distance+(1-scale)*18;
   if(candidates.length&&score>candidates[0].score+1)continue;
   if(test(m,dx,dz,scale,points)&&test(m,dx,dz,scale,base)){
    candidates.push({asset:m.asset,dx,dz,scale,distance,score});candidates.sort((a,b)=>a.score-b.score);
   }
  }
 }
 let winner;
 for(const c of candidates){const bad=test(m,c.dx,c.dz,c.scale,all,true);if(!bad){winner={...c,samples:all.length*2,bad};break;}}
 results.push(winner||{asset:m.asset,failed:true,approx:candidates.slice(0,3)});console.log(results.at(-1));
}
fs.writeFileSync('outputs/landmark-fitting-base.json',JSON.stringify(results,null,2));

