import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './diorama-fixture.mjs';
import {addLandmarks} from '../dist/assets/landmarks.js';
import {addIslandBridges} from '../dist/assets/island-bridges.js';
import {addRailway} from '../dist/assets/railway.js';
import {addMapScenery,addSculptedWoodland} from '../dist/assets/map-scenery.js';

const geo=(x,z)=>[x/2.2+13,60-z/4.4];
const distanceToBox=(p,box)=>Math.hypot(Math.max(box.min[0]-p.x,0,p.x-box.max[0]),Math.max(box.min[2]-p.z,0,p.z-box.max[2]));
const distanceToSegment=(p,a,b)=>{const dx=b[0]-a[0],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[2])*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a[0]-t*dx,p.z-a[2]-t*dz);};
const reports=[];
for(const mobile of[false,true]){
 const f=fixture(),{THREE,scene,heightAt,isDry,regionAt}=f,landmarks=addLandmarks({...f,mobile}),args={...f,mobile,reservedBounds:landmarks.reservedBounds};
 addIslandBridges(args);const railway=addRailway(args),scenery=addMapScenery(args),woodland=addSculptedWoodland(args),corridor=scene.userData.railwayCorridor;
 assert.equal(railway.drawCalls,4);assert.ok(railway.length>40);assert.ok(railway.group.userData.landmarkClearance>.35);
 const samples=railway.samples;let routeChecks=0;
 for(let i=0;i<samples.length;i++){
  const p=samples[i],prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)],dx=next[0]-prev[0],dz=next[2]-prev[2],length=Math.hypot(dx,dz);
  for(const offset of[-.4,-.2,0,.2,.4]){
   const x=p[0]-dz/length*offset,z=p[2]+dx/length*offset;
   assert.ok(regionAt(geo(x,z)),'Every rail/ballast sample is on the continent');
   assert.ok(p[1]-.07>=heightAt(...geo(x,z))+.075,'The complete track surface clears the DEM');routeChecks++;
  }
 }
 for(const house of[...scenery.group.userData.houses,...scenery.group.userData.lighthouses]){
  const radius=Math.hypot(house.footprint.width,house.footprint.depth)/2;
  assert.equal(corridor.intersectsDisc(house.position[0],house.position[2],radius),false,'House foundation is outside railway reservation');
 }
 for(const tree of woodland.group.userData.placements)assert.equal(corridor.intersectsDisc(tree.position[0],tree.position[2],tree.scale*.48+.07),false,'Entire moving tree canopy clears the train corridor');
 const carVertices=railway.cars.map(car=>{
  const vertices=[],unique=new Set();car.updateMatrixWorld(true);
  car.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),key=v.toArray().map(v=>v.toFixed(5)).join(',');if(!unique.has(key)){unique.add(key);vertices.push(v);}}});return vertices;
 });
 const corners=carVertices.map(vertices=>{const b=new THREE.Box3().setFromPoints(vertices),points=[];for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z));return points;});
 let minimumTerrainClearance=Infinity,minimumBuildingClearance=Infinity,maximumTrainCorridorExtent=0,vertexChecks=0;
 const vertex=new THREE.Vector3(),times=896,distances=[];
 for(let frame=0;frame<=times;frame++){
  const time=frame/times*railway.period;railway.update(time);scene.updateMatrixWorld(true);distances.push(railway.group.userData.motion.distance);
  for(let c=0;c<railway.cars.length;c++){
   const center=Math.round((railway.group.userData.motion.distance+railway.group.userData.carOffsets[c])/railway.length*(samples.length-1));
   for(const corner of corners[c]){
    vertex.copy(corner).applyMatrix4(railway.cars[c].matrixWorld);let nearest=Infinity;
    for(let j=Math.max(1,center-16);j<=Math.min(samples.length-1,center+16);j++)nearest=Math.min(nearest,distanceToSegment(vertex,samples[j-1],samples[j]));
    maximumTrainCorridorExtent=Math.max(maximumTrainCorridorExtent,nearest);assert.ok(nearest<corridor.halfWidth-.05,'The whole car bounding box stays inside the reserved corridor');
   }
   for(const local of carVertices[c]){
   vertex.copy(local).applyMatrix4(railway.cars[c].matrixWorld);const clearance=vertex.y-heightAt(...geo(vertex.x,vertex.z));
   minimumTerrainClearance=Math.min(minimumTerrainClearance,clearance);assert.ok(clearance>0,`Solid train vertices remain above terrain at ${time.toFixed(3)}s: ${clearance}`);
   for(const box of landmarks.reservedBounds)minimumBuildingClearance=Math.min(minimumBuildingClearance,distanceToBox(vertex,box));vertexChecks++;
   }
  }
 }
 assert.ok(minimumBuildingClearance>.35,'Full train body clears every landmark through the return cycle');
 assert.ok(Math.max(...distances)-Math.min(...distances)>45,'The train visits both endpoints');assert.ok(Math.abs(distances[0]-distances.at(-1))<1e-8,'Round trip loops without a position jump');
 railway.update(54);const firstStop=railway.cars.map(c=>c.position.clone());railway.update(55.9);for(let i=0;i<3;i++)assert.ok(firstStop[i].distanceTo(railway.cars[i].position)<1e-8,'Two-second station dwell');
 railway.update(11);const before=railway.cars[1].position.clone();railway.update(12);assert.ok(before.distanceTo(railway.cars[1].position)>.1,'Train genuinely changes world position');
 let triangles=0,drawCalls=0;railway.group.traverse(o=>{if(o.isMesh){drawCalls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
 assert.equal(drawCalls,4);assert.ok(triangles<24000,'Train and track stay within the geometry budget');
 reports.push({mobile,routeSamples:samples.length,routeChecks,roundTripSeconds:railway.period,frames:times+1,vertexChecks,minimumTerrainClearance,minimumBuildingClearance,maximumTrainCorridorExtent,landmarkCorridorClearance:railway.group.userData.landmarkClearance,riverCrossings:railway.group.userData.riverCrossings.length,houses:scenery.houses,trees:woodland.count,drawCalls,triangles});
}
await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/railway-clearance.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
