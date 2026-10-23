import assert from 'node:assert/strict';
import {fixture} from './diorama-fixture.mjs';
import {addLandmarks} from '../dist/assets/landmarks.js';
import {addMapScenery,addSculptedWoodland} from '../dist/assets/map-scenery.js';
import {addAmbientLife} from '../dist/assets/ambient-life.js';

const toGeo=(x,z)=>[x/2.2+13,60-z/4.4];
const near=(a,b,tolerance=1e-4)=>Math.abs(a-b)<tolerance;
const reports=[];

for(const mobile of[false,true]){
 const args={...fixture(),mobile}, {THREE,scene,heightAt,regionAt}=args;
 const landmarks=addLandmarks(args);
 args.reservedBounds=landmarks.reservedBounds;
 const scenery=addMapScenery(args),woodland=addSculptedWoodland(args);
 const life=addAmbientLife({...args,chimneyEmitters:scenery.chimneyEmitters,landmarks:landmarks.objects});
 scene.updateMatrixWorld(true);
 const initial=life.inspect(),body=life.group.getObjectByName('flocking-bird-bodies');
 const left=life.group.getObjectByName('bird-left-wings'),right=life.group.getObjectByName('bird-right-wings');
 const smoke=life.group.getObjectByName('drifting-chimney-and-volcano-smoke');
 const waves=life.group.getObjectByName('scattered-animated-wavelets');
 assert.ok(body?.isInstancedMesh&&left?.isInstancedMesh&&right?.isInstancedMesh,'Bird bodies and articulated wings are batched');
 assert.equal(body.count,initial.birdCount);
 assert.equal(left.count,body.count);assert.equal(right.count,body.count);
 assert.equal(initial.flocks.reduce((n,f)=>n+f.count,0),body.count);
 assert.ok(initial.flocks.filter(f=>f.gulls).length>=4,'Gulls inhabit several coastal areas');
 assert.ok(initial.flocks.filter(f=>!f.gulls).length>=2,'Other birds form inland flocks');
 assert.ok(body.count>=(mobile?30:50)&&body.count<100,'Bird population stays within its instance budget');

 const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
 const camera=new THREE.PerspectiveCamera(mobile?44:40,viewport.width/viewport.height,.1,600);
 camera.position.set(mobile?-5:-14,mobile?77:65,mobile?110:104);camera.lookAt(new THREE.Vector3(mobile?-5:-14,0,mobile?3:5));camera.updateMatrixWorld(true);
 const featured=new Set();let flockStart=0;
 for(const flock of initial.flocks){if(['Norwich gulls','Oslofjord gulls','Skåne gulls'].includes(flock.name))for(let i=0;i<flock.count;i++)featured.add(flockStart+i);flockStart+=flock.count;}
 assert.ok(featured.size>=(mobile?15:24),'Norwich, Oslo and Skåne each have a visible flock');
 const mill=landmarks.objects.find(o=>o.name==='landmark-windmill'),rotor=mill.getObjectByName('windmill-sails');
 assert.ok(rotor,'Windmill sails are articulated separately from the tower');
 const hub=rotor.getWorldPosition(new THREE.Vector3()),towerMatrix=mill.children[0].matrixWorld.clone();
 const sailTip=new THREE.Vector3(1.6,0,0).applyMatrix4(rotor.matrixWorld);let turned=false,minGullPixels=Infinity;

 const matrix=new THREE.Matrix4(),wingMatrix=new THREE.Matrix4(),point=new THREE.Vector3();
 const bodyQ=new THREE.Quaternion(),wingQ=new THREE.Quaternion(),scale=new THREE.Vector3();
 const initialBirds=[],initialWings=[],changedWings=new Set(),movedBirds=new Set();
 for(let i=0;i<body.count;i++){
  body.getMatrixAt(i,matrix);matrix.decompose(point,bodyQ,scale);initialBirds.push(point.clone());
  left.getMatrixAt(i,wingMatrix);wingMatrix.decompose(point,wingQ,scale);initialWings.push(bodyQ.clone().invert().multiply(wingQ));
 }
 let flightSamples=0,minGroundClearance=Infinity;
 // Cover more than one complete orbit and inspect the actual instanced geometry,
 // including wing extremes, against the DEM rather than the claimed floor.
 const probes=new Map();
 for(const mesh of[body,left,right]){
  mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,vertices=[];
  for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])vertices.push(new THREE.Vector3(x,y,z));
  probes.set(mesh,vertices);
 }
 for(let step=0;step<=96;step++){
  const time=step*.61;life.update(time);woodland.update(time);landmarks.update(time);scene.updateMatrixWorld(true);
  assert.ok(rotor.getWorldPosition(new THREE.Vector3()).distanceTo(hub)<1e-6,'Spinning sails keep their axle anchored');
  assert.deepEqual(mill.children[0].matrixWorld.elements,towerMatrix.elements,'The mill tower stays still');
  if(new THREE.Vector3(1.6,0,0).applyMatrix4(rotor.matrixWorld).distanceTo(sailTip)>.5)turned=true;
  const sailBounds=new THREE.Box3().setFromObject(rotor,true),reserved=mill.userData.worldBounds;
  for(let axis=0;axis<3;axis++)assert.ok(sailBounds.min.getComponent(axis)>=reserved.min[axis]-1e-5&&sailBounds.max.getComponent(axis)<=reserved.max[axis]+1e-5,'Reserved scenery space contains every sail angle');
  assert.equal(life.inspect().time,time);assert.equal(smoke.material.uniforms.uTime.value,time);assert.equal(waves.material.uniforms.uTime.value,time);
  for(const mesh of woodland.group.children)assert.equal(mesh.material.uniforms.uWoodlandTime.value,time);
  for(let i=0;i<body.count;i++){
   body.getMatrixAt(i,matrix);matrix.decompose(point,bodyQ,scale);
   if(point.distanceTo(initialBirds[i])>.15)movedBirds.add(i);
   const center=point.clone();
   if(featured.has(i)){
    const screen=center.clone().project(camera),oneUnit=center.clone().add(new THREE.Vector3(1,0,0)).project(camera);
    assert.ok(Math.abs(screen.x)<.95&&Math.abs(screen.y)<.95,'Featured gulls remain inside the desktop and phone overview');
    minGullPixels=Math.min(minGullPixels,(oneUnit.x-screen.x)*viewport.width/2*scale.x*1.34);
   }
   for(const mesh of[left,right]){
    mesh.getMatrixAt(i,wingMatrix);wingMatrix.decompose(point,wingQ,scale);
    assert.ok(point.distanceTo(center)<.15,'Wings stay attached to the moving body');
    if(mesh===left&&bodyQ.clone().invert().multiply(wingQ).angleTo(initialWings[i])>.03)changedWings.add(i);
   }
   for(const mesh of[body,left,right]){
    mesh.getMatrixAt(i,matrix);
    for(const vertex of probes.get(mesh)){
     point.copy(vertex).applyMatrix4(matrix);assert.ok(point.toArray().every(Number.isFinite));
     const clearance=point.y-heightAt(...toGeo(point.x,point.z));
     minGroundClearance=Math.min(minGroundClearance,clearance);
     assert.ok(clearance>.5,`Flying bird clears terrain at ${point.toArray()}`);flightSamples++;
    }
   }
  }
 }
 assert.equal(movedBirds.size,body.count,'Every bird changes position');
 assert.equal(changedWings.size,body.count,'Every bird flaps between glides');
 assert.ok(turned,'Windmill sails move around their hub');assert.ok(minGullPixels>8,'Featured gulls have a legible wingspan at overview scale');
 landmarks.update(0);assert.ok(Math.abs(rotor.rotation.z)<1e-6,'The shared clock restores the initial sail angle');const heldSails=rotor.rotation.toArray();landmarks.update(0);assert.deepEqual(rotor.rotation.toArray(),heldSails,'A frozen clock stops the windmill');
 life.update(0);assert.deepEqual(life.inspect().firstBird,initial.firstBird,'Animation uses a reproducible clock');
 const held=Array.from(body.instanceMatrix.array);life.update(0);assert.deepEqual(Array.from(body.instanceMatrix.array),held,'An unchanged clock freezes all birds');

 // Raycast into the modeled chimney cap/crater to verify emitter placement.
 const buildings=scenery.group.getObjectByName('rural-towns-and-coastal-lighthouses');
 const ray=new THREE.Raycaster(undefined,new THREE.Vector3(0,-1,0),0,.20);
 for(const emitter of scenery.chimneyEmitters){
  point.fromArray(emitter.position);ray.ray.origin.copy(point);
  const hits=ray.intersectObject(buildings,false);
  assert.ok(hits.length&&hits[0].distance<.025,'Chimney smoke starts directly above modeled chimney cap');
 }
 const volcanoes=landmarks.objects.filter(o=>o.userData.smokeEmitter);
 assert.equal(volcanoes.length,1,'The modeled volcano exposes its crater emission point');
 for(const volcano of volcanoes){
  ray.ray.origin.fromArray(volcano.userData.smokeEmitter);const hits=ray.intersectObject(volcano,true);
  assert.ok(hits.length&&hits[0].distance<.12,'Volcano smoke starts above the actual crater');
 }
 const sources=initial.smokeSources;
 assert.ok(sources.some(s=>s.kind==='chimney')&&sources.some(s=>s.kind==='volcano'));
 assert.equal(sources.filter(s=>s.kind==='volcano').length,volcanoes.length);
 const expectedSources=[...scenery.chimneyEmitters.map(e=>e.position),...volcanoes.map(o=>o.userData.smokeEmitter)];
 for(const source of sources)assert.ok(expectedSources.some(p=>p.every((v,k)=>near(v,source.position[k]))),'All smoke sources belong to real chimneys or the crater');
 const sourceAttribute=smoke.geometry.getAttribute('aSource'),kindAttribute=smoke.geometry.getAttribute('aKind');
 assert.equal(sourceAttribute.count,initial.smokeParticles);assert.equal(smoke.geometry.instanceCount,initial.smokeParticles);
 for(let i=0;i<sourceAttribute.count;i++){
  point.fromBufferAttribute(sourceAttribute,i);
  assert.ok(sources.some(s=>s.position.every((v,k)=>near(v,point.getComponent(k)))&&kindAttribute.getX(i)===(s.kind==='volcano'?1:0)),'GPU smoke origins match their source kind and world position');
 }
 assert.ok(!smoke.material.depthWrite&&smoke.material.transparent,'Fading smoke does not obscure other transparent particles');

 assert.ok(initial.waveCount>=(mobile?30:60)&&initial.waveCount<=100,'Small wave patches are scattered across the sea');
 let waterSamples=0;const vertices=waves.geometry.attributes.position;
 for(let i=0;i<vertices.count;i++)for(const drift of[-.12,0,.12]){
  const x=vertices.getX(i),z=vertices.getZ(i)+drift;
  assert.equal(regionAt(toGeo(x,z)),0,'Every wave vertex remains over water at both drift extremes');
  assert.ok(vertices.getY(i)>-.05,'Wavelets sit above the ocean surface');waterSamples++;
 }
 reports.push({mobile,birds:body.count,flocks:initial.flocks.length,smokeSources:sources.length,smokeParticles:initial.smokeParticles,waves:initial.waveCount,flightSamples,waterSamples,minGroundClearance,minGullPixels});
}
assert.ok(reports[1].birds<reports[0].birds&&reports[1].smokeParticles<reports[0].smokeParticles&&reports[1].waves<reports[0].waves,'Mobile reduces ambient rendering work');
console.log(JSON.stringify(reports,null,2));
