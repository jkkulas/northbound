import {createModelBuilder} from './atlas-models.js';
import {sceneryPigment} from './map-scenery.js';

const TAU=Math.PI*2;
const geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

// Small solid birds share three instance batches. Each wing has its own shoulder
// transform; long glides interrupt the flapping instead of a mechanical flutter.
function addBirds({THREE,group,worldPoint,heightAt,mobile}){
 const material=sceneryPigment(THREE),bodyBuilder=createModelBuilder(THREE);
 bodyBuilder.add(new THREE.SphereGeometry(1,8,5),0xe7e3ca,[0,0,0],[0,0,0],[.09,.075,.21]);
 bodyBuilder.add(new THREE.SphereGeometry(1,7,5),0xf2ecd7,[0,.035,-.16],[0,0,0],[.072,.068,.08]);
 bodyBuilder.add(new THREE.ConeGeometry(.026,.13,5),0xc39850,[0,.025,-.26],[-Math.PI/2,0,0]);
 bodyBuilder.add(new THREE.ConeGeometry(.073,.21,4),0xc6c9b8,[0,0,.23],[Math.PI/2,0,0],[1,.9,.28]);
 const bodyGeometry=bodyBuilder.finish('bird-body',material).children[0].geometry;
 function wing(side){
  const b=createModelBuilder(THREE);
  // Thick, tapered wings have a pale inner panel and dark flight feathers.
  const shape=new THREE.Shape();[[0,-.08],[.27,-.12],[.56,.035],[.67,.18],[.35,.11],[0,.10]].forEach(([x,z],i)=>i?shape.lineTo(x*side,z):shape.moveTo(x*side,z));shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:false});g.rotateX(Math.PI/2);
  b.add(g,0xd6d9c8);
  const tip=new THREE.Shape();[[.47,.015],[.67,.18],[.53,.13]].forEach(([x,z],i)=>i?tip.lineTo(x*side,z):tip.moveTo(x*side,z));tip.closePath();
  const t=new THREE.ExtrudeGeometry(tip,{depth:.026,bevelEnabled:false});t.rotateX(Math.PI/2);b.add(t,0x495650);
  return b.finish('bird-wing',material).children[0].geometry;
 }
 const sites=[
  {name:'Brittany gulls',geo:[-4.4,48.6],radius:2.1,gulls:true},
  {name:'Scottish gulls',geo:[-4.6,57.8],radius:2.3,gulls:true},
  {name:'Norwegian coast gulls',geo:[5.0,60.4],radius:1.9,gulls:true},
  {name:'Baltic gulls',geo:[19.2,55.0],radius:1.8,gulls:true},
  {name:'Danish coast gulls',geo:[8.0,56.4],radius:1.5,gulls:true},
  // Larger, open formations keep these foreground gulls legible at overview
  // scale, with room above the nearby roofs and the Oslofjord hills.
  {name:'Norwich gulls',geo:[1.45,52.75],radius:1.8,gulls:true,prominent:true,mobileOffset:[4.4,0]},
  {name:'Oslofjord gulls',geo:[10.65,59.75],radius:1.65,gulls:true,prominent:true},
  {name:'Skåne gulls',geo:[13.35,55.85],radius:1.75,gulls:true,prominent:true},
  {name:'French swallows',geo:[4.5,49.2],radius:2.1,gulls:false},
  {name:'Polish starlings',geo:[18.1,53.2],radius:2.0,gulls:false},
  {name:'Swedish swallows',geo:[15.7,61.2],radius:2.2,gulls:false},
 ];
 const random=seeded(693),birds=[],flocks=[];
 for(const site of sites){
  const center=worldPoint(site.geo),count=site.prominent?(mobile?5:8):site.gulls?(mobile?4:6):(mobile?7:11);
  // Norfolk sits at the phone crop's edge, so its gulls fly just offshore there.
  if(mobile&&site.mobileOffset){center.x+=site.mobileOffset[0];center.z+=site.mobileOffset[1];}
  // One safe flight floor for the complete flock and orbit, including relief.
  let floor=0;const envelope=site.radius+(site.prominent?3:2);
  for(let x=-envelope;x<=envelope;x+=.35)for(let z=-envelope;z<=envelope;z+=.35)floor=Math.max(floor,heightAt(...geoFrom(center.x+x,center.z+z)));
  const flock={...site,center:center.toArray(),count,phase:flocks.length*1.7,altitude:floor+(site.prominent?3.6:site.gulls?2.5:3.2)};flocks.push(flock);
  for(let i=0;i<count;i++)birds.push({flock,phase:random()*TAU,offset:(i-(count-1)/2)*(site.prominent?.68:.35),lane:random()*(site.prominent?.85:.55),scale:(site.prominent?.98:site.gulls?.62:.36)*( .85+random()*.28)});
 }
 const body=new THREE.InstancedMesh(bodyGeometry,material,birds.length),left=new THREE.InstancedMesh(wing(-1),material,birds.length),right=new THREE.InstancedMesh(wing(1),material,birds.length);
 const meshes=[body,left,right],wings=[[left,-1],[right,1]];meshes.forEach((mesh,i)=>{mesh.name=['flocking-bird-bodies','bird-left-wings','bird-right-wings'][i];mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);});
 // Darker inland birds share the same geometry and shader using instance color.
 material.vertexShader=material.vertexShader.replace('vPigment=color;','vPigment=color;\n#ifdef USE_INSTANCING_COLOR\nvPigment*=instanceColor;\n#endif');
 birds.forEach((bird,i)=>meshes.forEach(mesh=>mesh.setColorAt(i,new THREE.Color(bird.flock.gulls?0xffffff:0x36443b))));
 const matrix=new THREE.Matrix4(),base=new THREE.Quaternion(),q=new THREE.Quaternion(),flapQ=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3(),axis=new THREE.Vector3(0,0,1),up=new THREE.Vector3(0,1,0);
 function update(time){
  birds.forEach((bird,i)=>{
   const f=bird.flock,angle=time*.14; // the formation moves as one flock
   const a=angle+f.phase+bird.offset*.14;
   const rx=f.radius+bird.lane+bird.offset*.28,rz=f.radius*.64+bird.lane+bird.offset*.28;
   position.set(f.center[0]+Math.cos(a)*rx,f.altitude+Math.sin(time*.7+bird.phase)*.15+bird.lane*.45,f.center[2]+Math.sin(a)*rz);
   const yaw=Math.atan2(Math.sin(a)*rx,-Math.cos(a)*rz);base.setFromAxisAngle(up,yaw);
   scale.setScalar(bird.scale);matrix.compose(position,base,scale);body.setMatrixAt(i,matrix);
   const glide=THREE.MathUtils.smoothstep(Math.sin(time*.46+bird.phase),-.1,.6),flap=THREE.MathUtils.lerp(Math.sin(time*(f.gulls?4.4:7.5)+bird.phase)*.55,.10,glide);
   for(const[mesh,side]of wings){flapQ.setFromAxisAngle(axis,side*flap);q.copy(base).multiply(flapQ);matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);}
  });
  meshes.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;});
 }
 update(0);return{update,flocks,count:birds.length,sample:()=>{body.getMatrixAt(0,matrix);return new THREE.Vector3().setFromMatrixPosition(matrix).toArray();}};
}

function addSmoke({THREE,group,emitters,mobile}){
 const sources=emitters.filter((e,i)=>e.kind==='volcano'||!mobile||i%2===0),origins=[],phases=[],kinds=[],sizes=[];
 for(const emitter of sources){const count=emitter.kind==='volcano'?12:7;for(let i=0;i<count;i++){origins.push(...emitter.position);phases.push(i/count);kinds.push(emitter.kind==='volcano'?1:0);sizes.push(emitter.scale||1);}}
 const plane=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry().copy(plane);plane.dispose();
 geometry.instanceCount=phases.length;
 for(const[name,array,size]of[['aSource',origins,3],['aPhase',phases,1],['aKind',kinds,1],['aSize',sizes,1]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(array),size));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},
  vertexShader:`uniform float uTime;attribute vec3 aSource;attribute float aPhase,aKind,aSize;varying vec2 vUv;varying float vAge,vKind;
   void main(){vUv=uv;vKind=aKind;vAge=fract(uTime/mix(7.5,11.,aKind)+aPhase);
   vec3 p=aSource;float age=vAge;
   p.x+=(age*age*.75+sin(age*6.+aSource.x)*age*.11)*aSize;
   p.z-=age*age*.29*aSize;p.y+=age*mix(1.55,2.8,aKind)*aSize;
   float radius=mix(.14,.38,aKind)*( .55+age*2.2)*aSize;
   vec4 view=viewMatrix*vec4(p,1.);view.xy+=position.xy*radius*2.;gl_Position=projectionMatrix*view;}`,
  fragmentShader:`varying vec2 vUv;varying float vAge,vKind;
   void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float feather=1.-smoothstep(.18,1.,r);
   float fade=smoothstep(0.,.13,vAge)*(1.-smoothstep(.48,1.,vAge));
   float texture= .83+.17*sin(p.x*9.+vAge*12.)*cos(p.y*8.-vAge*7.);
   gl_FragColor=vec4(mix(vec3(.87,.86,.77),vec3(.53,.52,.46),vKind),feather*fade*texture*mix(.17,.23,vKind));
   #include <colorspace_fragment>
   }`});
 const smoke=new THREE.Mesh(geometry,material);smoke.name='drifting-chimney-and-volcano-smoke';smoke.frustumCulled=false;smoke.renderOrder=3;group.add(smoke);
 return{update:time=>{material.uniforms.uTime.value=time;},sources,particles:phases.length};
}

function addWavelets({THREE,group,regionAt,mobile}){
 const random=seeded(231),positions=[],phases=[],centers=[],target=mobile?42:80;
 for(let attempt=0;attempt<1200&&centers.length<target;attempt++){
  const x=-74+random()*117,z=-75+random()*129;
  let water=true;for(let dx=-1.8;dx<=1.8;dx+=.3)for(let dz=-.9;dz<=.9;dz+=.3)if(regionAt(geoFrom(x+dx,z+dz)))water=false;
  if(!water||centers.some(p=>Math.hypot(x-p[0],z-p[1])<4))continue;
  centers.push([x,z]);const phase=random()*TAU;
  for(let row=0;row<3;row++)for(let j=0;j<14;j++){
   const point=t=>[x+(t-.5)*(1.6-row*.22),.009,z+row*.22+Math.cos((t-.5)*Math.PI)*.13];
   const a=point(j/14),b=point((j+1)/14),w=.018;
   positions.push(a[0],a[1],a[2]-w,b[0],b[1],b[2]-w,b[0],b[1],b[2]+w,a[0],a[1],a[2]-w,b[0],b[1],b[2]+w,a[0],a[1],a[2]+w);
   for(let k=0;k<6;k++)phases.push(phase+row*.5);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));geometry.computeBoundingSphere();
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0}},
  vertexShader:`uniform float uTime;attribute float aPhase;varying float vOpacity;void main(){vec3 p=position;float t=uTime*.62+aPhase;p.z+=sin(t)*.12;vOpacity=.07+.22*pow(.5+.5*sin(t),2.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader:`varying float vOpacity;void main(){gl_FragColor=vec4(.88,.90,.75,vOpacity);}`});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='scattered-animated-wavelets';group.add(mesh);
 return{update:time=>{material.uniforms.uTime.value=time;},count:centers.length,centers};
}

export function addAmbientLife({THREE,scene,worldPoint,heightAt,regionAt,mobile=false,chimneyEmitters=[],landmarks=[]}){
 const group=new THREE.Group();group.name='living-atlas-atmosphere';scene.add(group);
 const emitters=chimneyEmitters.map(e=>({...e,kind:'chimney'}));
 for(const landmark of landmarks)if(landmark.userData.smokeEmitter)emitters.push({position:landmark.userData.smokeEmitter,kind:'volcano',scale:1});
 const birds=addBirds({THREE,group,worldPoint,heightAt,mobile}),smoke=addSmoke({THREE,group,emitters,mobile}),waves=addWavelets({THREE,group,regionAt,mobile});
 let elapsed=0;
 function update(time){elapsed=time;birds.update(time);smoke.update(time);waves.update(time);}
 update(0);
 return{group,update,inspect:()=>({time:elapsed,birdCount:birds.count,flocks:birds.flocks,firstBird:birds.sample(),smokeSources:smoke.sources,smokeParticles:smoke.particles,waveCount:waves.count,waveCenters:waves.centers})};
}
