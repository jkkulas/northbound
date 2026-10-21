import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PNG} from 'pngjs';
import {sampleTerrainHeight} from '../dist/assets/terrain-height.js';
import {addIllustratedGeography} from '../dist/assets/atlas-terrain.js';
import {createDryGround,footprintSamples} from '../dist/assets/ground-support.js';
import {addLandmarks} from '../dist/assets/landmarks.js';
import {addSculptedWoodland,addMapScenery} from '../dist/assets/map-scenery.js';
import {addIslandBridges} from '../dist/assets/island-bridges.js';
const geography=JSON.parse(await fs.readFile('dist/assets/geography.json','utf8')),mask=PNG.sync.read(await fs.readFile('dist/assets/regions.png')),bytes=await fs.readFile('dist/assets/terrain.i16'),elevations=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2);
const heightAt=(lon,lat)=>sampleTerrainHeight(elevations,lon,lat),worldPoint=([lon,lat],lift=0)=>new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4),geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const regionAt=([lon,lat])=>{const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),y=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0;};
const inBox=(x,z,b,m=0)=>x>b.min[0]-m&&x<b.max[0]+m&&z>b.min[2]-m&&z<b.max[2]+m;
const reports=[];
for(const mobile of[false,true]){
 const scene=new THREE.Scene();addIllustratedGeography({THREE,scene,geography,worldPoint,heightAt,regionAt,mobile});
 const isDry=createDryGround({scene,regionAt,heightAt}),args={THREE,scene,worldPoint,heightAt,regionAt,isDry,mobile},landmarks=addLandmarks(args);
 args.reservedBounds=landmarks.reservedBounds;
 const bridges=addIslandBridges(args),scenery=addMapScenery(args),woodland=addSculptedWoodland(args);
 let landmarkSamples=0,scenerySamples=0,bridgeSamples=0,treeClearances=0;
 const positions=[];
 for(const object of landmarks.objects){
  const data=object.userData,points=data.bankSupportPoints||footprintSamples(data.localFoundation,.07),v=new THREE.Vector3();
  for(const[x,z]of points){v.set(x,0,z).applyMatrix4(object.matrixWorld);assert.ok(isDry(v.x,v.z),object.name+' full dry support');landmarkSamples++;}
 }
 for(const item of[...scenery.group.userData.houses,...scenery.group.userData.lighthouses]){
  const c=Math.cos(item.rotation||0),s=Math.sin(item.rotation||0),w=item.footprint.width,d=item.footprint.depth,[x,y,z]=item.position;
  for(const[a,b]of footprintSamples([-w/2,w/2,-d/2,d/2],.065)){
   const px=x+a*c+b*s,pz=z-a*s+b*c;assert.ok(isDry(px,pz),'Full scenery support');assert.ok(args.reservedBounds.every(box=>!inBox(px,pz,box)),'Scenery outside hero footprints');scenerySamples++;
  }
  const rx=(Math.abs(c)*w+Math.abs(s)*d)/2,rz=(Math.abs(s)*w+Math.abs(c)*d)/2;positions.push({min:[x-rx,0,z-rz],max:[x+rx,0,z+rz]});
 }
 for(const tree of woodland.group.userData.placements){
  for(const[x,y,z]of tree.groundSamples){assert.ok(isDry(x,z),'Tree root footprint dry');scenerySamples++;}
  const[x,y,z]=tree.position;
  for(const box of[...positions,...args.reservedBounds]){assert.ok(!inBox(x,z,box,tree.scale*.30),'Tree canopy does not intersect building');treeClearances++;}
 }
 for(const bridge of bridges.group.userData.bridges){
  for(const abutment of bridge.abutments)for(const[x,y,z]of abutment.groundSamples){assert.ok(isDry(x,z),`${bridge.name} dry abutment`);assert.ok(args.reservedBounds.every(box=>!inBox(x,z,box)),`${bridge.name} approach excludes landmarks`);bridgeSamples++;}
  assert.ok(bridge.wetSpanSamples.length>=4,`${bridge.name} crosses actual sea`);
  for(const[x,z]of bridge.wetSpanSamples)assert.equal(regionAt(geoFrom(x,z)),0);
  for(const sample of bridge.deckSamples){const[x,y,z]=sample.position;assert.ok(args.reservedBounds.every(box=>!inBox(x,z,box,.34)),`${bridge.name} full span clear of landmarks`);if(regionAt(geoFrom(x,z)))assert.ok(y+.045>=sample.terrain,'Deck above terrain');}
 }
 let triangles=0;for(const group of[scenery.group,woodland.group,bridges.group])group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
 console.log({mobile,landmarks:landmarks.count,trees:woodland.count,houses:scenery.houses,lighthouses:scenery.lighthouses,bridges:bridges.count,triangles});
 assert.equal(landmarks.count,17);assert.ok(woodland.count>=(mobile?400:700));assert.ok(scenery.houses>=(mobile?70:120));assert.ok(scenery.lighthouses>=2);assert.ok(bridges.count>=2);assert.ok(triangles<300000);
 reports.push({mobile,landmarks:landmarks.count,trees:woodland.count,houses:scenery.houses,lighthouses:scenery.lighthouses,bridges:bridges.count,triangles,landmarkSamples,scenerySamples,bridgeSamples,treeClearances,bridgeNames:bridges.group.userData.bridges.map(b=>b.name),rejectedBridges:bridges.group.userData.rejected});
}
await fs.writeFile('outputs/3d-assembled-world-grounding.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
