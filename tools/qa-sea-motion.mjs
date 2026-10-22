import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './diorama-fixture.mjs';
import {addLandmarks} from '../dist/assets/landmarks.js';
import {addSeaCreatures} from '../dist/assets/sea-creatures.js';

const reports=[];
for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
 const f=fixture(),{THREE,regionAt,scene}=f,mobile=viewport.width<760;
 const camera=new THREE.PerspectiveCamera(mobile?44:40,viewport.width/viewport.height,.1,600);
 camera.position.set(...(mobile?[-5,77,110]:[-14,65,104]));camera.lookAt(new THREE.Vector3(...(mobile?[-5,0,3]:[-14,0,5])));camera.updateMatrixWorld(true);
 const landmarks=addLandmarks({...f,mobile,camera}),sea=addSeaCreatures({...f,mobile,camera,landmarks:landmarks.objects});await sea.ready;
 const boats=sea.objects.filter(m=>m.userData.motion),lobster=sea.objects.find(m=>m.userData.asset==='great_lobster'),joints=lobster.children.filter(m=>m.userData.kind==='lobster-claw-joint');
 assert.equal(sea.objects.length,17);assert.equal(boats.length,12);assert.equal(joints.length,2);
 let footprintSamples=0,vertexSamples=0,drawCalls=0;
 const v=new THREE.Vector3(),local=new THREE.Vector3();
 for(const boat of boats){
  const painted=boat.children.find(p=>p.isMesh),bounds=painted.geometry.boundingBox,positions=painted.geometry.attributes.position;
  const nx=Math.ceil((bounds.max.x-bounds.min.x)/.11),nz=Math.ceil((bounds.max.z-bounds.min.z)/.11),period=boat.userData.motion.period;
  sea.update(0);const start=boat.position.clone(),heading=boat.quaternion.clone();sea.update(period);
  assert.ok(Math.hypot(boat.position.x-start.x,boat.position.z-start.z)<1e-8,boat.name+' closes its route');
  assert.ok(1-Math.abs(boat.quaternion.dot(heading))<1e-8,boat.name+' closes its heading without a snap');
  sea.update(period/4);assert.ok(boat.position.distanceTo(start)>.5,boat.name+' visibly changes position');
  // Independently transform the full rectangular source footprint through 160
  // headings. These checks do not trust the route envelope or support flag.
  for(let frame=0;frame<160;frame++){
   sea.update(period*frame/160);boat.updateMatrixWorld(true);
   for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    v.set(bounds.min.x+(bounds.max.x-bounds.min.x)*i/nx,0,bounds.min.z+(bounds.max.z-bounds.min.z)*j/nz).applyMatrix4(painted.matrixWorld);
    assert.equal(regionAt([v.x/2.2+13,60-v.z/4.4]),0,`${boat.name}: rotating footprint touches land at frame ${frame}`);footprintSamples++;
   }
   if(frame%10===0)for(let i=0;i<positions.count;i++){
    local.fromBufferAttribute(positions,i);v.copy(local).applyMatrix4(painted.matrixWorld);
    assert.equal(regionAt([v.x/2.2+13,60-v.z/4.4]),0,`${boat.name}: actual geometry touches land`);vertexSamples++;
   }
  }
 }
 sea.update(0);const rest=joints.map(j=>j.rotation.z);sea.update(1.9);
 for(let i=0;i<joints.length;i++)assert.ok(Math.abs(joints[i].rotation.z-rest[i])>.04,'Each lobster claw rises and falls');
 for(let time=0;time<9;time+=.125){sea.update(time);for(const joint of joints)assert.ok(joint.rotation.z>=0&&joint.rotation.z<=.24,'Claws stay within their water-safe shoulder limits');}
 for(const model of sea.objects)model.traverse(o=>{if(o.isMesh){drawCalls++;assert.equal(o.material.transparent,false);assert.equal(o.material.depthWrite,true);}});
 assert.equal(drawCalls,19,'Only two extra meshes are needed for articulated claws');
 reports.push({viewport,boats:boats.length,claws:joints.length,drawCalls,footprintSamples,vertexSamples});
 scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});
}
await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/sea-motion-audit.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
