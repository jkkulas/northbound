import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './diorama-fixture.mjs';
import {addLandmarks} from '../dist/assets/landmarks.js';
import {addSeaCreatures} from '../dist/assets/sea-creatures.js';

// Audit complete articulated sculptures through their real updater. All vertex
// checks are independent of the envelopes used to choose their sea positions.
const reports=[];
for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
 const f=fixture(),{THREE,scene,regionAt}=f,mobile=viewport.width<760;
 const camera=new THREE.PerspectiveCamera(mobile?44:40,viewport.width/viewport.height,.1,600);
 camera.position.set(...(mobile?[-5,77,110]:[-14,65,104]));camera.lookAt(new THREE.Vector3(...(mobile?[-5,0,3]:[-14,0,5])));camera.updateMatrixWorld(true);
 const landmarks=addLandmarks({...f,mobile,camera}),sea=addSeaCreatures({...f,mobile,camera,landmarks:landmarks.objects});await sea.ready;
 const models=sea.objects.filter(m=>m.animation),serpent=models.find(m=>m.animation.kind==='serpent'),kraken=models.find(m=>m.animation.kind==='kraken'),rig=models.find(m=>m.animation.kind==='rig');
 assert.ok(serpent&&kraken&&rig);sea.update(0);scene.updateMatrixWorld(true);
 const shipStart=serpent.animation.ship.matrixWorld.clone(),v=new THREE.Vector3(),world=new THREE.Vector3(),instance=new THREE.Matrix4(),transform=new THREE.Matrix4();
 const shipBox=new THREE.Box3().setFromObject(serpent.animation.ship),serpentPositions=serpent.animation.creature.children[0].geometry.attributes.position;
 let vertexSamples=0,minShipClearance=Infinity,aboveWaterFrames=0,submergedFrames=0;
 for(let frame=0;frame<=272;frame++){
  const time=frame*.125;sea.update(time);scene.updateMatrixWorld(true);
  assert.deepEqual(serpent.animation.ship.matrixWorld.elements,shipStart.elements,'The serpent ship stays perfectly stationary');
  let above=0,below=0;
  for(let i=0;i<serpentPositions.count;i+=3){
   world.fromBufferAttribute(serpentPositions,i).applyMatrix4(serpent.animation.creature.children[0].matrixWorld);
   if(world.y>-.05){above++;minShipClearance=Math.min(minShipClearance,shipBox.distanceToPoint(world));}else below++;
  }
  if(above)aboveWaterFrames++;if(below)submergedFrames++;
  assert.ok(above&&below,'The serpent stays partly above and partly below the actual water plane');
  const hoistDown=new THREE.Vector3(0,-1,0).transformDirection(rig.animation.hoist.matrixWorld);
  assert.ok(Math.abs(hoistDown.x)<1e-12&&Math.abs(hoistDown.z)<1e-12&&hoistDown.y<-.999999,'The hoist hangs vertically while the crane lifts');
  // Exhaust every source vertex at 1-second intervals, including hidden
  // submerged geometry and the individual bubble instance transforms.
  if(frame%8)continue;
  for(const model of models){
   const [minX,minZ,maxX,maxZ]=model.userData.footprint;
   const polygon=model.userData.reservedFootprint,edges=polygon.map((p,i)=>{const q=polygon[(i+1)%polygon.length];return {x:p[0],z:p[1],dx:q[0]-p[0],dz:q[1]-p[1]};});
   model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const positions=mesh.geometry.attributes.position;
    for(let copy=0;copy<(mesh.isInstancedMesh?mesh.count:1);copy++){
     transform.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(copy,instance);transform.multiply(instance);}
     for(let i=0;i<positions.count;i++){
      v.fromBufferAttribute(positions,i).applyMatrix4(transform);vertexSamples++;
      assert.ok(v.x>=minX-1e-5&&v.x<=maxX+1e-5&&v.z>=minZ-1e-5&&v.z<=maxZ+1e-5,`${model.name} escapes its reserved footprint at ${time}s`);
      let positive=false,negative=false;for(const edge of edges){const cross=edge.dx*(v.z-edge.z)-edge.dz*(v.x-edge.x);if(cross>1e-6)positive=true;else if(cross< -1e-6)negative=true;}
      assert.ok(!(positive&&negative),`${model.name} escapes its exact convex reservation at ${time}s`);
      assert.equal(regionAt([v.x/2.2+13,60-v.z/4.4]),0,`${model.name} touches land at ${time}s`);
     }
    }
   });
  }
 }
 assert.ok(minShipClearance>.12*serpent.scale.x,'The circling body never reaches the stationary ship');
 const a=kraken.animation,poses=[];
 for(const time of[0,4,7,9,10,11,13,15,17,19,22,24,26]){
  sea.update(time);scene.updateMatrixWorld(true);
  const shipBounds=new THREE.Box3().setFromObject(a.ship),creatureBounds=new THREE.Box3().setFromObject(a.creature);
  if(time===0||time===26){assert.ok(a.ship.visible&&!a.creature.visible&&!a.bubbles.visible);assert.ok(a.ship.position.distanceTo(a.shipRest)<1e-8);}
  if(time===15||time===17||time===19){assert.ok(shipBounds.max.y<-.05&&creatureBounds.max.y<-.05,'Both sculptures are fully beneath the real sea after sinking');}
  if(time===17){assert.ok(a.bubbles.visible&&!a.ship.visible&&!a.creature.visible);assert.equal(a.bubbles.count,9);}
  poses.push({time,phase:kraken.userData.animationPhase,shipTop:shipBounds.max.y,creatureTop:creatureBounds.max.y,bubblesVisible:a.bubbles.visible});
 }
 for(const boundary of[4,9,11,15,19,24,26]){
  sea.update(boundary-1e-5);const before=a.ship.position.clone(),beforeRotation=a.ship.quaternion.clone();sea.update(boundary+1e-5);
  assert.ok(before.distanceTo(a.ship.position)<1e-4,'Ship position is continuous at each stage and loop');
  assert.ok(1-Math.abs(beforeRotation.dot(a.ship.quaternion))<1e-8,'Ship rotation is continuous at each stage and loop');
 }
 reports.push({viewport,vertexSamples,minShipClearance,aboveWaterFrames,submergedFrames,poses});
 const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/creature-motion-audit.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.map(({poses,...report})=>report),null,2));
