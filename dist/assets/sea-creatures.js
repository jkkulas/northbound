import {createMapModelMaterial} from './atlas-models.js';
import {createMaritimeModel} from './sea-models.js';

// Every vignette is solid geometry. Geographic roots remain beside the nearby
// drawing position: enlarged miniatures never require a false island or an
// opaque patch of water, and their entire footprint must be clear of the coast.
const ITEMS=[
 {name:'Jörmungandr',asset:'serpent_attack',geo:[-4.8,69.3],mobileGeo:[2.0,69.4],width:14.6,mobileWidth:10.7,yaw:.08},
 {name:'Kraken',asset:'kraken_attack',geo:[-1.1,62.8],mobileGeo:[1.0,62.2],width:12.2,mobileWidth:8.7,yaw:.02},
 {name:'North Sea platform',asset:'offshore_rig',geo:[2.6,58.84],width:8.7,mobileWidth:6.4,offshore:true,yaw:.10},
 {name:'A northern leviathan',asset:'northern_whale',geo:[-12.1,66.2],width:9.2,mobileWidth:6.6,yaw:.18},
 {name:'The great lobster',asset:'great_lobster',geo:[3.4,55.7],width:6.5,mobileWidth:4.9,yaw:.13},
 {name:'Hanseatic trader',asset:'merchant_ship',geo:[-5.3,59.2],width:5.9,yaw:.22},
 {name:'Northern schooner',asset:'schooner_ship',geo:[-12.1,61.1],width:5.8,yaw:-.24},
 {name:'Atlantic merchant',asset:'merchant_ship',geo:[-12.3,57.4],width:5.2,yaw:.22},
 {name:'Irish Sea passage',asset:'schooner_ship',geo:[-12.2,53.9],width:5.3,yaw:-.19},
 {name:'Channel trader',asset:'merchant_ship',geo:[-3.8,49.6],width:4.8,yaw:.10},
 {name:'North Sea sail',asset:'schooner_ship',geo:[.1,56.9],width:5.1,mobileGeo:[2.1,65.7],yaw:-.15},
 {name:'Baltic merchant',asset:'merchant_ship',geo:[20.0,56.1],width:4.4,yaw:.18},
 {name:'Baltic schooner',asset:'schooner_ship',geo:[20.3,60.8],width:4.4,yaw:-.20},
 {name:'Barents trader',asset:'merchant_ship',geo:[28.0,72.4],width:5.3,yaw:.12},
 {name:'Arctic schooner',asset:'schooner_ship',geo:[18.3,74.5],width:5.6,yaw:-.20},
 {name:'Greenland Sea passage',asset:'merchant_ship',geo:[-13.0,72.7],width:5.0,yaw:.16},
 {name:'Norwegian Sea sail',asset:'schooner_ship',geo:[7.1,70.7],width:5.2,mobileGeo:[7.3,72.8],yaw:-.24},
];
const SEA=-.025,SAMPLE_STEP=.16,MARGIN=.12;
const toGeo=(x,z)=>[x/2.2+13,60-z/4.4];

function projectionBox(THREE,bounds,camera,x=0,z=0){
 const output=[Infinity,Infinity,-Infinity,-Infinity];
 for(const xx of[bounds.min.x,bounds.max.x])for(const yy of[bounds.min.y,bounds.max.y])for(const zz of[bounds.min.z,bounds.max.z]){
  const p=new THREE.Vector3(xx+x,yy,zz+z).project(camera);output[0]=Math.min(output[0],p.x);output[1]=Math.min(output[1],p.y);output[2]=Math.max(output[2],p.x);output[3]=Math.max(output[3],p.y);
 }return output;
}
function area(box){return Math.max(0,box[2]-box[0])*Math.max(0,box[3]-box[1]);}
function overlap(a,b){return Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));}

function convexHull(points){
 // Intersect outward support lines: a compact convex polygon that encloses
 // every supplied point, unlike dropping vertices from a sampled hull.
 const lines=Array.from({length:24},(_,i)=>{const a=i*Math.PI/12,x=Math.cos(a),z=Math.sin(a);return {x,z,d:Math.max(...points.map(p=>p[0]*x+p[1]*z))};});
 return lines.map((p,i)=>{const q=lines[(i+1)%lines.length],det=p.x*q.z-q.x*p.z;return [(p.d*q.z-q.d*p.z)/det,(p.x*q.d-q.x*p.d)/det];});
}
function reservation(polygon,x,z){
 const points=polygon.map(([px,pz])=>[px+x,pz+z]),bounds=[Infinity,Infinity,-Infinity,-Infinity],axes=[];
 for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length];bounds[0]=Math.min(bounds[0],p[0]);bounds[1]=Math.min(bounds[1],p[1]);bounds[2]=Math.max(bounds[2],p[0]);bounds[3]=Math.max(bounds[3],p[1]);
  const dx=q[0]-p[0],dz=q[1]-p[1],length=Math.hypot(dx,dz);if(length>1e-8)axes.push([-dz/length,dx/length]);
 }
 return {points,bounds,axes};
}
function intersectsReservation(a,b){
 if(!overlap(a.bounds,b.bounds))return false;
 for(const[nx,nz]of[...a.axes,...b.axes]){
  let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
  for(const[x,z]of a.points){const d=x*nx+z*nz;amin=Math.min(amin,d);amax=Math.max(amax,d);}
  for(const[x,z]of b.points){const d=x*nx+z*nz;bmin=Math.min(bmin,d);bmax=Math.max(bmax,d);}
  if(amax<bmin||bmax<amin)return false;
 }
 return true;
}

function supportSamples(bounds){
 const samples=[],x0=bounds.min.x-MARGIN,x1=bounds.max.x+MARGIN,z0=bounds.min.z-MARGIN,z1=bounds.max.z+MARGIN,nx=Math.ceil((x1-x0)/SAMPLE_STEP),nz=Math.ceil((z1-z0)/SAMPLE_STEP);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)samples.push([x0+(x1-x0)*i/nx,z0+(z1-z0)*j/nz]);
 return {samples,footprint:[x0,z0,x1,z1],polygon:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],quick:[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[(x0+x1)/2,(z0+z1)/2]]};
}

function circularSupport(radius){
 const samples=[],n=Math.ceil(radius*2/SAMPLE_STEP),quick=[[0,0]];
 for(let i=0;i<32;i++){const a=i/32*Math.PI*2;quick.push([Math.cos(a)*radius,Math.sin(a)*radius]);}
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const x=-radius+2*radius*i/n,z=-radius+2*radius*j/n;if(x*x+z*z<=radius*radius)samples.push([x,z]);}
 const outerRadius=radius/Math.cos(Math.PI/32),polygon=Array.from({length:32},(_,i)=>{const a=(i+.5)*Math.PI/16;return [Math.cos(a)*outerRadius,Math.sin(a)*outerRadius];});
 return {samples:[...quick,...samples],quick,footprint:[-radius,-radius,radius,radius],polygon};
}

// A long, narrow sea corridor contains the whole oval plus the ship at every
// heading. Its rounded ends avoid unnecessarily reserving the empty corners.
function voyageSupport(major,minor,sourceBounds,scale,axis){
 const samples=[],sweptCorners=[],occupied=new Set(),c=Math.cos(axis),s=Math.sin(axis),frames=256;
 const hullRadius=Math.hypot(Math.max(Math.abs(sourceBounds.min.x),Math.abs(sourceBounds.max.x)),Math.max(Math.abs(sourceBounds.min.z),Math.abs(sourceBounds.max.z)))*scale;
 // Between samples, both translation and heading have bounded derivatives.
 // This padding encloses the continuous sweep, not only the keyframes.
 const padding=MARGIN+Math.PI/frames*(major+hullRadius*major/minor),halfLength=Math.max(Math.abs(sourceBounds.min.x),Math.abs(sourceBounds.max.x))*scale,halfBeam=Math.max(Math.abs(sourceBounds.min.z),Math.abs(sourceBounds.max.z))*scale,x0=-halfLength-padding,x1=halfLength+padding,z0=-halfBeam-padding,z1=halfBeam+padding;
 for(let frame=0;frame<frames;frame++){
  const a=frame*Math.PI*2/frames,px=Math.cos(a)*major,pz=Math.sin(a)*minor,heading=Math.atan2(Math.cos(a)*minor,-Math.sin(a)*major),hc=Math.cos(heading),hs=Math.sin(heading);
  const corners=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>[px+x*hc-z*hs,pz+x*hs+z*hc]);
  for(const[x,z]of corners)sweptCorners.push([x*c-z*s,x*s+z*c]);
  const minX=Math.floor(Math.min(...corners.map(p=>p[0]))/SAMPLE_STEP),maxX=Math.ceil(Math.max(...corners.map(p=>p[0]))/SAMPLE_STEP),minZ=Math.floor(Math.min(...corners.map(p=>p[1]))/SAMPLE_STEP),maxZ=Math.ceil(Math.max(...corners.map(p=>p[1]))/SAMPLE_STEP);
  for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
   const dx=ix*SAMPLE_STEP-px,dz=iz*SAMPLE_STEP-pz,x=dx*hc+dz*hs,z=-dx*hs+dz*hc;
   if(x<x0||x>x1||z<z0||z>z1)continue;
   const key=ix+','+iz;if(occupied.has(key))continue;occupied.add(key);
   samples.push([ix*SAMPLE_STEP*c-iz*SAMPLE_STEP*s,ix*SAMPLE_STEP*s+iz*SAMPLE_STEP*c]);
  }
 }
 const polygon=convexHull(sweptCorners),footprint=[Infinity,Infinity,-Infinity,-Infinity];
 for(const[x,z]of polygon){footprint[0]=Math.min(footprint[0],x);footprint[1]=Math.min(footprint[1],z);footprint[2]=Math.max(footprint[2],x);footprint[3]=Math.max(footprint[3],z);}
 const quick=samples.filter((_,i)=>i%Math.max(1,Math.floor(samples.length/96))===0);
 return {samples,quick,footprint,polygon,continuousPadding:padding};
}

const smooth=t=>{const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p);};
function poseKraken(animation,time){
 const t=time%26,{ship,creature,bubbles}=animation;
 let rise=0,sink=0,returning=0,phase='sailing';
 if(t>=4&&t<9){rise=smooth((t-4)/5);phase='emerging';}
 else if(t>=9&&t<11){rise=1;phase='grasping';}
 else if(t>=11&&t<15){rise=1;sink=smooth((t-11)/4);phase='sinking';}
 else if(t>=15&&t<19){rise=1;sink=1;phase='bubbles';}
 else if(t>=19&&t<24){rise=1;sink=1;returning=smooth((t-19)/5);phase='resurfacing';}
 else if(t>=24){phase='sailing';}
 creature.position.y=-5.5*(1-rise)-6.4*sink;
 creature.rotation.z=.055*Math.sin(t*1.5)*rise*(1-sink);
 creature.visible=phase==='emerging'||phase==='grasping'||phase==='sinking';
 ship.position.copy(animation.shipRest);ship.position.y-=6.5*sink*(1-returning);
 ship.rotation.copy(animation.shipRotation);ship.rotation.z-=.20*sink*(1-returning);ship.rotation.x+=.06*sink*(1-returning);
 ship.visible=phase!=='bubbles';
 bubbles.visible=t>=14.6&&t<22;
 if(bubbles.visible){
  const strength=Math.min(smooth((t-14.6)/1.0),1-smooth((t-20)/2));
  for(const particle of bubbles.userData.particles){
   const p=(t*1.05+particle.phase)%1,object=animation.bubblePose;
   object.position.fromArray(particle.basePosition);object.position.y=.04+p*.48;
   const size=particle.radius*(.35+.65*Math.sin(p*Math.PI))*strength;object.scale.setScalar(Math.max(.001,size));object.updateMatrix();bubbles.setMatrixAt(particle.index,object.matrix);
  }
  bubbles.instanceMatrix.needsUpdate=true;
 }
 return phase;
}

function placeAtSea({THREE,origin,bounds,regionAt,camera,occupied,reservations,landmarks,maxDistance=15,support=supportSamples(bounds),moving=false}){
 const candidates=[{x:origin[0],z:origin[1],distance:0}];
 for(let dz=-maxDistance;dz<=maxDistance;dz+=.8)for(let dx=-maxDistance;dx<=maxDistance;dx+=.8){const distance=Math.hypot(dx,dz);if(distance<.1||distance>maxDistance)continue;candidates.push({x:origin[0]+dx,z:origin[1]+dz,distance});}
 candidates.sort((a,b)=>a.distance-b.distance);
 const water=(c,list)=>list.every(([x,z])=>!regionAt(toGeo(c.x+x,c.z+z)));
 // Check visual space first, then a dense grid over the complete XZ bounds.
 // Tall sails and curled tentacles are covered as well as the waterline.
 for(const visibility of[.99,1.18,Infinity])for(const c of candidates){
  const box=projectionBox(THREE,bounds,camera,c.x,c.z);
  if(box[0]<-visibility||box[1]<-visibility||box[2]>visibility||box[3]>visibility)continue;
  // Projection overlap alone says nothing about a collision on the water.
  // The world-space reservation below encloses every possible animation phase.
  if(occupied.some(b=>overlap(box,b)>Math.min(area(box),area(b))*(moving&&b.moving?.48:.025)))continue;
  if(landmarks.some(b=>overlap(box,b)>Math.min(area(box),area(b))*.025))continue;
  const corridor=reservation(support.polygon,c.x,c.z);
  if(reservations.some(r=>intersectsReservation(corridor,r)))continue;
  if(!water(c,support.quick)||!water(c,support.samples))continue;
  box.moving=moving;occupied.push(box);reservations.push(corridor);return {...c,clear:true,visible:visibility===.99,box,support,corridor};
 }
 // The caller can reduce a scarce-water miniature; it must never silently
 // accept a coastal collision or mark a failed placement as supported.
 return null;
}

export function addSeaCreatures({THREE,scene,mobile=false,regionAt,camera,landmarks=[]}){
 const objects=[],decorations=[],material=createMapModelMaterial(THREE),occupied=[],reservations=[],boats=[],claws=[],animated=[];
 const motion={boatCount:0,clawCount:0,validatedRoutes:0,waterSamples:0,serpentCount:0,krakenCount:0,craneCount:0,lastTime:0};
 function update(timeSeconds){
  const time=Number.isFinite(timeSeconds)?Math.max(0,timeSeconds):0;motion.lastTime=time;
  for(const {model,route}of boats){
   const a=route.phase+time*Math.PI*2/route.period*route.direction;
   const x=Math.cos(a)*route.major,z=Math.sin(a)*route.minor,c=Math.cos(route.axis),s=Math.sin(route.axis);
   model.position.x=route.center[0]+x*c-z*s;model.position.z=route.center[1]+x*s+z*c;
   const dx=-Math.sin(a)*route.major*route.direction,dz=Math.cos(a)*route.minor*route.direction;
   // The bow is +X. Heading follows actual travel, including smooth turns at
   // the ends of a voyage several hull lengths long.
   model.rotation.y=-Math.atan2(dx*s+dz*c,dx*c-dz*s);model.position.y=SEA+.012*Math.sin(time*.85+route.phase);
  }
  for(let i=0;i<claws.length;i++)claws[i].rotation.z=.12+.12*Math.sin(time*.82+i*2.1);
  for(const {model,animation}of animated){
   if(animation.kind==='serpent'){
    const a=time*Math.PI*2/34,[rx,rz]=animation.orbitRadius;
    animation.creature.position.set(Math.cos(a)*rx,-.12+.10*Math.sin(a*3),Math.sin(a)*rz);
    animation.creature.rotation.y=-Math.atan2(Math.cos(a)*rz,-Math.sin(a)*rx);
    model.userData.animationPhase='circling';
   }else if(animation.kind==='kraken')motion.krakenPhase=model.userData.animationPhase=poseKraken(animation,time);
   else if(animation.kind==='rig'){
    const lift=.06+.23*Math.sin(time*.48);animation.crane.rotation.z=lift;
    animation.hoist.rotation.z=-lift;
   }
  }
 }
 const ready=Promise.resolve().then(()=>{
  camera.updateMatrixWorld(true);
  const landmarkBoxes=landmarks.map(model=>{model.updateMatrixWorld(true);return projectionBox(THREE,new THREE.Box3().setFromObject(model),camera);});
  for(const item of ITEMS){
   const model=createMaritimeModel(THREE,item.asset,{material,name:item.name}),animation=model.animation,sourceBounds=new THREE.Box3().setFromObject(model),width=mobile?(item.mobileWidth||item.width*.82):item.width,geo=mobile&&item.mobileGeo?item.mobileGeo:item.geo,origin=[(geo[0]-13)*2.2,(60-geo[1])*4.4];
   let animationRadius=0;
   if(animation?.kind==='serpent'){
    const creatureBounds=new THREE.Box3().setFromObject(animation.creature),position=animation.creature.position;
    creatureBounds.min.sub(position);creatureBounds.max.sub(position);
    const rx=Math.max(Math.abs(creatureBounds.min.x),Math.abs(creatureBounds.max.x)),rz=Math.max(Math.abs(creatureBounds.min.z),Math.abs(creatureBounds.max.z));
    animationRadius=Math.max(...animation.orbitRadius)+Math.hypot(rx,rz)+.15;
   }
   const baseScale=width/(animationRadius?animationRadius*2:sourceBounds.max.x-sourceBounds.min.x);
   const moving=item.asset==='merchant_ship'||item.asset==='schooner_ship';
   model.rotation.y=item.yaw||0;model.position.y=SEA;
   let fit=null,bounds=null,scale=baseScale,major=0,minor=0,axis=0,clearanceRadius=0;
   for(const factor of[1,.92,.84,.74,.64]){
    scale=baseScale*factor;model.scale.setScalar(scale);model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model);
    let support;
    if(moving){
     major=width*(item.name==='Baltic schooner'?.8:mobile?1.03:1.2)*factor;minor=width*.24*factor;
     const x=Math.max(Math.abs(sourceBounds.min.x),Math.abs(sourceBounds.max.x)),z=Math.max(Math.abs(sourceBounds.min.z),Math.abs(sourceBounds.max.z));
     const hullRadius=Math.hypot(x,z)*scale;clearanceRadius=major+minor+hullRadius+MARGIN;
     const preferred=(item.geo[0]>-7&&item.geo[1]>54)?Math.PI/2:0;
     for(const orientation of[preferred,preferred+Math.PI/2,preferred+Math.PI/4,preferred-Math.PI/4]){
      axis=orientation;support=voyageSupport(major,minor,sourceBounds,scale,axis);
      const [x0,z0,x1,z1]=support.footprint,routeBounds=new THREE.Box3(new THREE.Vector3(x0,bounds.min.y,z0),new THREE.Vector3(x1,bounds.max.y+.02,z1));
      fit=placeAtSea({THREE,origin,bounds:routeBounds,regionAt,camera,occupied,reservations,landmarks:landmarkBoxes,maxDistance:26,support,moving:true});
      if(fit){bounds=routeBounds;break;}
     }
     if(fit)break;
     continue;
    }else if(animationRadius){
     const radius=animationRadius*scale+MARGIN;
     bounds=new THREE.Box3(new THREE.Vector3(-radius,bounds.min.y,-radius),new THREE.Vector3(radius,bounds.max.y+.12*scale,radius));support=circularSupport(radius);
    }else if(animation?.kind==='kraken'||animation?.kind==='rig'){
     // Includes the tilted sinking hull and the complete luffing crane sweep.
     bounds.expandByVector(new THREE.Vector3(.75*scale,.15*scale,.6*scale));support=supportSamples(bounds);
    }
    fit=placeAtSea({THREE,origin,bounds,regionAt,camera,occupied,reservations,landmarks:landmarkBoxes,maxDistance:item.offshore?7:moving?26:18,support});if(fit)break;
   }
   if(!fit)throw new Error(`No open-water support for the ${item.name} model`);
   model.position.x=fit.x;model.position.z=fit.z;model.updateMatrixWorld(true);
   const worldBounds=new THREE.Box3().setFromObject(model),drawn=toGeo(fit.x,fit.z),footprint=fit.support.footprint.map((n,i)=>n+(i%2?fit.z:fit.x));
   model.userData={...model.userData,title:item.name,kind:'sea-model',asset:item.asset,coordinates:[...item.geo],drawingCoordinates:drawn,width:worldBounds.max.x-worldBounds.min.x,height:worldBounds.max.y-worldBounds.min.y,depth:worldBounds.max.z-worldBounds.min.z,footprint,worldBounds:{min:worldBounds.min.toArray(),max:worldBounds.max.toArray()},fullWaterSupport:true,fullViewportVisibility:fit.visible,landmarkOcclusionClear:true,sourceSamples:fit.support.samples.length,supportSamples:fit.support.samples.length,supportStep:SAMPLE_STEP,supportMargin:MARGIN,geometryOnly:true,dimensional:true,scale};
   model.userData.reservedFootprint=fit.corridor.points;
   if(moving){
    const route={kind:'elongated-water-voyage',center:[fit.x,fit.z],major,minor,axis,clearanceRadius,period:54+boats.length*3.1,direction:boats.length%2?-1:1,phase:boats.length*2.39996,waterSamples:fit.support.samples.length,fullLoopWaterSupport:true,fullLoopCollisionClear:true,continuousPadding:fit.support.continuousPadding};
    model.userData.motion=route;boats.push({model,route});motion.boatCount++;motion.validatedRoutes++;motion.waterSamples+=route.waterSamples;
   }
   if(animation){
    if(animation.kind==='kraken'){animation.shipRest=animation.ship.position.clone();animation.shipRotation=animation.ship.rotation.clone();animation.bubblePose=new THREE.Object3D();motion.krakenCount++;model.userData.animationPeriod=26;}
    if(animation.kind==='serpent'){motion.serpentCount++;model.userData.animationPeriod=34;}
    if(animation.kind==='rig')motion.craneCount++;
    animated.push({model,animation});
   }
   for(const joint of model.children)if(joint.userData.kind==='lobster-claw-joint')claws.push(joint);
   objects.push(model);scene.add(model);decorations.push({name:item.name,geo:drawn,label:item.label,model});
  }
  motion.clawCount=claws.length;update(0);return objects;
 });
 return {count:ITEMS.length,objects,ready,decorations,update,motion};
}
