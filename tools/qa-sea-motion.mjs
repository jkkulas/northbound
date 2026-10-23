import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './diorama-fixture.mjs';
import {addLandmarks} from '../dist/assets/landmarks.js';
import {addSeaCreatures} from '../dist/assets/sea-creatures.js';

const reports=[];
// This independently compares actual transformed hull rectangles. Reservations
// are also checked geometrically; no collision result relies on metadata flags.
function polygonsOverlap(a,b){
 for(const polygon of[a,b])for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=p[1]-q[1],nz=q[0]-p[0];
  let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
  for(const[x,z]of a){const d=x*nx+z*nz;amin=Math.min(amin,d);amax=Math.max(amax,d);}
  for(const[x,z]of b){const d=x*nx+z*nz;bmin=Math.min(bmin,d);bmax=Math.max(bmax,d);}
  if(amax<bmin||bmax<amin)return false;
 }
 return true;
}
function insideConvex(point,polygon){
 let sign=0;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=(b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]);
  if(Math.abs(cross)<1e-7)continue;
  const next=Math.sign(cross);if(sign&&sign!==next)return false;sign=next;
 }
 return true;
}
for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:1896,height:942},{width:390,height:844},{width:320,height:740}]){
 const f=fixture(),{THREE,regionAt,scene}=f,mobile=viewport.width<760;
 const camera=new THREE.PerspectiveCamera(mobile?44:40,viewport.width/viewport.height,.1,600);
 camera.position.set(...(mobile?[-5,77,110]:[-14,65,104]));camera.lookAt(new THREE.Vector3(...(mobile?[-5,0,3]:[-14,0,5])));camera.updateMatrixWorld(true);
 const landmarks=addLandmarks({...f,mobile,camera}),sea=addSeaCreatures({...f,mobile,camera,landmarks:landmarks.objects});await sea.ready;
 const boats=sea.objects.filter(m=>m.userData.motion),lobster=sea.objects.find(m=>m.userData.asset==='great_lobster'),joints=lobster.children.filter(m=>m.userData.kind==='lobster-claw-joint');
 assert.equal(sea.objects.length,17);assert.equal(boats.length,12);assert.equal(joints.length,2);
 let footprintSamples=0,vertexSamples=0,drawCalls=0,phasePairClearances=0,staticClearances=0;
 const phaseHulls=new Map();
 const v=new THREE.Vector3(),local=new THREE.Vector3();
 for(const boat of boats){
  const painted=boat.children.find(p=>p.isMesh),bounds=painted.geometry.boundingBox,positions=painted.geometry.attributes.position;
  const nx=Math.ceil((bounds.max.x-bounds.min.x)/.11),nz=Math.ceil((bounds.max.z-bounds.min.z)/.11),period=boat.userData.motion.period;
  sea.update(0);const start=boat.position.clone(),heading=boat.quaternion.clone();sea.update(period);
  assert.ok(Math.hypot(boat.position.x-start.x,boat.position.z-start.z)<1e-8,boat.name+' closes its route');
  assert.ok(1-Math.abs(boat.quaternion.dot(heading))<1e-8,boat.name+' closes its heading without a snap');
  const hullLength=(bounds.max.x-bounds.min.x)*boat.scale.x,route=boat.userData.motion;
  assert.ok(route.major*2>=hullLength*1.5,boat.name+' travels at least 1.5 complete hull lengths');
  assert.ok(route.major/route.minor>=3,boat.name+' follows an elongated voyage rather than spinning in place');
  const timeAtAngle=a=>((a-route.phase)*route.direction%(Math.PI*2)+Math.PI*2)%(Math.PI*2)*period/(Math.PI*2);
  sea.update(timeAtAngle(0));const endOfVoyage=boat.position.clone();sea.update(timeAtAngle(Math.PI));
  assert.ok(boat.position.distanceTo(endOfVoyage)>=hullLength*1.5,boat.name+' actually travels at least 1.5 hull lengths');
  const hulls=[];
  // Independently transform the full rectangular source footprint through 160
  // headings. These checks do not trust the route envelope or support flag.
  for(let frame=0;frame<160;frame++){
   sea.update(period*frame/160);boat.updateMatrixWorld(true);
   const hull=[[bounds.min.x,bounds.min.z],[bounds.max.x,bounds.min.z],[bounds.max.x,bounds.max.z],[bounds.min.x,bounds.max.z]].map(([x,z])=>{v.set(x,0,z).applyMatrix4(painted.matrixWorld);return [v.x,v.z];});
   for(const point of hull)assert.ok(insideConvex(point,boat.userData.reservedFootprint),boat.name+' full hull remains inside its continuous route reservation');
   hulls.push(hull);
   const before=boat.position.clone(),bow=new THREE.Vector3(1,0,0).applyQuaternion(boat.quaternion);sea.update(period*frame/160+.0001);const travel=boat.position.clone().sub(before);travel.y=0;travel.normalize();
   assert.ok(bow.dot(travel)>.99999,boat.name+' bow follows travel direction');sea.update(period*frame/160);boat.updateMatrixWorld(true);
   for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    v.set(bounds.min.x+(bounds.max.x-bounds.min.x)*i/nx,0,bounds.min.z+(bounds.max.z-bounds.min.z)*j/nz).applyMatrix4(painted.matrixWorld);
    assert.equal(regionAt([v.x/2.2+13,60-v.z/4.4]),0,`${boat.name}: rotating footprint touches land at frame ${frame}`);footprintSamples++;
   }
   if(frame%10===0)for(let i=0;i<positions.count;i++){
    local.fromBufferAttribute(positions,i);v.copy(local).applyMatrix4(painted.matrixWorld);
    assert.equal(regionAt([v.x/2.2+13,60-v.z/4.4]),0,`${boat.name}: actual geometry touches land`);vertexSamples++;
   }
  }
  phaseHulls.set(boat,hulls);
 }
 // Every reserved corridor encloses continuous motion with a derivative-bound
 // margin. Disjoint polygons therefore protect all relative route phases, even
 // after a long tab suspension or when ships have different loop durations.
 for(let i=0;i<sea.objects.length;i++)for(let j=i+1;j<sea.objects.length;j++){
  const a=sea.objects[i],b=sea.objects[j];assert.ok(!polygonsOverlap(a.userData.reservedFootprint,b.userData.reservedFootprint),`${a.name} and ${b.name}: complete animation reservations are disjoint`);
 }
 // A second independent check deliberately tries all 25,600 phase pairings,
 // rather than advancing two ships at the same clock time.
 for(let i=0;i<boats.length;i++)for(let j=i+1;j<boats.length;j++)for(const a of phaseHulls.get(boats[i]))for(const b of phaseHulls.get(boats[j])){
  assert.ok(!polygonsOverlap(a,b),`${boats[i].name} and ${boats[j].name}: hulls collide at independent route phases`);phasePairClearances++;
 }
 for(const boat of boats)for(const hull of phaseHulls.get(boat))for(const stationary of sea.objects.filter(m=>!m.userData.motion)){
  assert.ok(!polygonsOverlap(hull,stationary.userData.reservedFootprint),`${boat.name}: route enters the complete ${stationary.name} animation envelope`);staticClearances++;
 }
 sea.update(0);const rest=joints.map(j=>j.rotation.z);sea.update(1.9);
 for(let i=0;i<joints.length;i++)assert.ok(Math.abs(joints[i].rotation.z-rest[i])>.04,'Each lobster claw rises and falls');
 for(let time=0;time<9;time+=.125){sea.update(time);for(const joint of joints)assert.ok(joint.rotation.z>=0&&joint.rotation.z<=.24,'Claws stay within their water-safe shoulder limits');}
 for(const model of sea.objects)model.traverse(o=>{if(o.isMesh){drawCalls++;assert.equal(o.material.transparent,false);assert.equal(o.material.depthWrite,true);}});
 assert.equal(drawCalls,24,'Articulated creatures, crane and instanced bubbles stay within 24 draw calls');
 const kraken=sea.objects.find(m=>m.animation?.kind==='kraken');sea.update(0);
 assert.equal(kraken.animation.creature.visible,false);assert.equal(kraken.animation.ship.visible,true);assert.equal(kraken.animation.bubbles.visible,false);
 for(const[time,phase]of[[6,'emerging'],[10,'grasping'],[13,'sinking'],[17,'bubbles'],[21,'resurfacing'],[25,'sailing'],[26,'sailing']]){sea.update(time);assert.equal(sea.motion.krakenPhase,phase);}
 reports.push({viewport,boats:boats.length,claws:joints.length,drawCalls,footprintSamples,vertexSamples,phasePairClearances,staticClearances,minTravelInHullLengths:Math.min(...boats.map(boat=>{const b=boat.children.find(p=>p.isMesh).geometry.boundingBox;return boat.userData.motion.major*2/((b.max.x-b.min.x)*boat.scale.x);} ))});
 scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});
}
await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/sea-motion-audit.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
