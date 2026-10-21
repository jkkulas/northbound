import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './tools/diorama-fixture.mjs';
import {addLandmarks,LANDMARK_SITES} from './dist/assets/landmarks.js';
import {footprintSamples,toGeo} from './dist/assets/ground-support.js';

const f=fixture(),{THREE,scene,isDry,regionAt,heightAt}=f,result=addLandmarks(f),report=[];
await result.ready;scene.updateMatrixWorld(true);
assert.equal(result.count,17,'Seventeen solid architectural and volcanic landmarks');
assert.ok(!result.objects.some(o=>/landmark-(oslo|bryggen)$/.test(o.name)),'Previously removed buildings remain absent');
let ribbon;scene.traverse(o=>{if(o.name==='exaggerated-geographic-river-banks-and-water')ribbon=o;});
const riverRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function dryIndependent(x,z,name){
 assert.ok(regionAt(toGeo(x,z)),name+': complete foundation stays on land');
 riverRay.ray.origin.set(x,100,z);assert.equal(riverRay.intersectObject(ribbon).length,0,name+': foundation avoids actual rendered river triangles');
}
for(const model of result.objects){
 const source=LANDMARK_SITES.find(s=>'landmark-'+s.asset===model.name),meta=model.userData;
 assert.deepEqual(meta.coordinates,source.coordinates,'Surveyed anchor retained');
 const worldBox=new THREE.Box3().setFromObject(model),size=worldBox.getSize(new THREE.Vector3());
 assert.ok(Math.min(size.x,size.y,size.z)>.7,model.name+': dimensional geometry');
 let samples=0,vertices=0,triangles=0,contact=0,buried=0;
 // Independently ray-test the shipped water surface beneath the whole foundation.
 // Bridge spans intentionally cross water; test towers and both bank approaches.
 const points=meta.bankSupportPoints||footprintSamples(meta.localFoundation,.075);
 for(const [x,z]of points){const p=new THREE.Vector3(x,0,z).applyMatrix4(model.matrixWorld);dryIndependent(p.x,p.z,model.name);samples++;}
 model.traverse(part=>{
  if(!part.isMesh)return;
  assert.ok(!part.material.map&&!part.material.uniforms?.uArtwork,'No facade/illustration cutout');
  assert.equal(part.material.transparent,false);assert.equal(part.material.depthWrite,true);
  const p=part.geometry.attributes.position;triangles+=(part.geometry.index?.count||p.count)/3;vertices+=p.count;
  for(let i=0;i<p.count;i++){
   const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(part.matrixWorld);
   assert.ok(Number.isFinite(point.x+point.y+point.z),'Finite vertices');
   const gap=point.y-heightAt(...toGeo(point.x,point.z));
   if(gap>-.13&&gap<.16&&regionAt(toGeo(point.x,point.z)))contact++;
   if(gap<-.3)buried++;
  }
 });
 assert.ok(triangles>700,'Modeled architectural detail');assert.ok(contact>25,model.name+': physically meets terrain');
 assert.ok(buried/vertices<.02,`${model.name}: buried vertices ${(buried/vertices*100).toFixed(2)}%`);
 report.push({name:model.name,coordinates:source.coordinates,drawingCoordinates:meta.drawingCoordinates,scale:meta.scale,supportSamples:samples,triangles,contactVertices:contact,buriedVertexPercent:buried/vertices*100,bounds:meta.worldBounds});
}
const find=id=>result.objects.find(o=>o.name==='landmark-'+id);
assert.ok(find('helsinki').userData.drawingCoordinates[1]>60.2,'Helsinki remains in Finland');
assert.ok(find('tallinn').userData.drawingCoordinates[1]<59.55,'Tallinn remains in Estonia');
assert.ok(find('warsaw').userData.drawingCoordinates[0]<21&&find('warsaw').userData.drawingCoordinates[1]<52.3,'Warsaw fits west/south of its surveyed river-side anchor');
assert.ok(find('cologne').userData.drawingCoordinates[0]>6.958,'Cologne fits on requested east side');
assert.equal(find('brandenburg').rotation.z,0);assert.equal(find('windmill').rotation.y,0);
assert.ok(isDry.riverAt(find('london').position.x,find('london').position.z),'Tower Bridge spans the visible Thames');
fs.writeFileSync('outputs/landmark-support.json',JSON.stringify({models:report},null,2));
console.log(JSON.stringify({landmarks:report.length,foundationSamples:report.reduce((n,r)=>n+r.supportSamples,0),triangles:report.reduce((n,r)=>n+r.triangles,0),maxBuriedPercent:Math.max(...report.map(r=>r.buriedVertexPercent))},null,2));
