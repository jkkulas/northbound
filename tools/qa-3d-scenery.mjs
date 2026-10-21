import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PNG} from 'pngjs';
import {sampleTerrainHeight} from '../dist/assets/terrain-height.js';
import {addIllustratedGeography} from '../dist/assets/atlas-terrain.js';
import {createDryGround} from '../dist/assets/ground-support.js';
import {addSculptedWoodland,addMapScenery} from '../dist/assets/map-scenery.js';
import {addIslandBridges} from '../dist/assets/island-bridges.js';
const geography=JSON.parse(await fs.readFile('dist/assets/geography.json','utf8')),mask=PNG.sync.read(await fs.readFile('dist/assets/regions.png')),bytes=await fs.readFile('dist/assets/terrain.i16'),elevations=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2);
const heightAt=(lon,lat)=>sampleTerrainHeight(elevations,lon,lat),worldPoint=([lon,lat],lift=0)=>new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4),geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const regionAt=([lon,lat])=>{const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),y=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0;};
const reports=[];
for(const mobile of[false,true]){
 const scene=new THREE.Scene();addIllustratedGeography({THREE,scene,geography,worldPoint,heightAt,regionAt,mobile});
 const isDry=createDryGround({scene,regionAt,heightAt}),args={THREE,scene,worldPoint,heightAt,regionAt,isDry,mobile},bridges=addIslandBridges(args),scenery=addMapScenery(args),woodland=addSculptedWoodland(args);
 let samples=0;
 for(const item of[...scenery.group.userData.houses,...scenery.group.userData.lighthouses,...woodland.group.userData.placements])for(const[x,y,z]of item.groundSamples){assert.ok(isDry(x,z),`Dry scenery footprint at ${x}, ${z}`);assert.ok(Math.abs(heightAt(...geoFrom(x,z))-y)<1e-6);samples++;}
 for(const bridge of bridges.group.userData.bridges){
  for(const abutment of bridge.abutments)for(const[x,y,z]of abutment.groundSamples){assert.ok(isDry(x,z),`${bridge.name} abutment is on dry land`);samples++;}
  assert.ok(bridge.wetSpanSamples.length>=4,`${bridge.name} spans actual water`);
  for(const[x,z]of bridge.wetSpanSamples)assert.equal(regionAt(geoFrom(x,z)),0);
  for(const sample of bridge.deckSamples)if(regionAt(geoFrom(sample.position[0],sample.position[2])))assert.ok(sample.position[1]+.045>=sample.terrain,`${bridge.name} approaches stay above terrain`);
 }
 let triangles=0;for(const group of[scenery.group,woodland.group,bridges.group])group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
 assert.ok(woodland.count>=(mobile?400:700));assert.ok(scenery.houses>=(mobile?80:130));assert.ok(scenery.lighthouses>=2);assert.ok(bridges.count>=3);assert.ok(triangles<300000,`Scenery triangle budget: ${triangles}`);
 reports.push({mobile,trees:woodland.count,houses:scenery.houses,lighthouses:scenery.lighthouses,bridges:bridges.count,triangles,supportSamples:samples,rejectedBridges:bridges.group.userData.rejected});
}
await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/3d-scenery-grounding.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
