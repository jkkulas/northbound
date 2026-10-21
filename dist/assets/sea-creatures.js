import {createMapModelMaterial} from './atlas-models.js';
import {createMaritimeModel} from './sea-models.js';

// Every vignette is solid geometry. Geographic roots remain beside the nearby
// drawing position: enlarged miniatures never require a false island or an
// opaque patch of water, and their entire footprint must be clear of the coast.
const ITEMS=[
 {name:'Jörmungandr',asset:'serpent_attack',geo:[-4.8,69.3],mobileGeo:[2.0,69.4],width:14.6,mobileWidth:10.7,label:true,yaw:.08},
 {name:'Kraken',asset:'kraken_attack',geo:[-1.1,62.8],mobileGeo:[1.0,62.2],width:12.2,mobileWidth:8.7,label:true,yaw:.02},
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

function supportSamples(bounds){
 const samples=[],x0=bounds.min.x-MARGIN,x1=bounds.max.x+MARGIN,z0=bounds.min.z-MARGIN,z1=bounds.max.z+MARGIN,nx=Math.ceil((x1-x0)/SAMPLE_STEP),nz=Math.ceil((z1-z0)/SAMPLE_STEP);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)samples.push([x0+(x1-x0)*i/nx,z0+(z1-z0)*j/nz]);
 return {samples,footprint:[x0,z0,x1,z1],quick:[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[(x0+x1)/2,(z0+z1)/2]]};
}

function placeAtSea({THREE,origin,bounds,regionAt,camera,occupied,landmarks,maxDistance=15}){
 const support=supportSamples(bounds),candidates=[{x:origin[0],z:origin[1],distance:0}];
 for(let dz=-maxDistance;dz<=maxDistance;dz+=.8)for(let dx=-maxDistance;dx<=maxDistance;dx+=.8){const distance=Math.hypot(dx,dz);if(distance<.1||distance>maxDistance)continue;candidates.push({x:origin[0]+dx,z:origin[1]+dz,distance});}
 candidates.sort((a,b)=>a.distance-b.distance);
 const water=(c,list)=>list.every(([x,z])=>!regionAt(toGeo(c.x+x,c.z+z)));
 // Check visual space first, then a dense grid over the complete XZ bounds.
 // Tall sails and curled tentacles are covered as well as the waterline.
 for(const visibility of[.99,1.18,Infinity])for(const c of candidates){
  const box=projectionBox(THREE,bounds,camera,c.x,c.z);
  if(box[0]<-visibility||box[1]<-visibility||box[2]>visibility||box[3]>visibility)continue;
  if(occupied.some(b=>overlap(box,b)>Math.min(area(box),area(b))*.025))continue;
  if(landmarks.some(b=>overlap(box,b)>Math.min(area(box),area(b))*.025))continue;
  if(!water(c,support.quick)||!water(c,support.samples))continue;
  occupied.push(box);return {...c,clear:true,visible:visibility===.99,box,support};
 }
 // The caller can reduce a scarce-water miniature; it must never silently
 // accept a coastal collision or mark a failed placement as supported.
 return null;
}

export function addSeaCreatures({THREE,scene,mobile=false,regionAt,camera,landmarks=[]}){
 const objects=[],decorations=[],material=createMapModelMaterial(THREE),occupied=[];
 const ready=Promise.resolve().then(()=>{
  camera.updateMatrixWorld(true);
  const landmarkBoxes=landmarks.map(model=>{model.updateMatrixWorld(true);return projectionBox(THREE,new THREE.Box3().setFromObject(model),camera);});
  for(const item of ITEMS){
   const model=createMaritimeModel(THREE,item.asset,{material,name:item.name}),sourceBounds=new THREE.Box3().setFromObject(model),width=mobile?(item.mobileWidth||item.width*.82):item.width,baseScale=width/(sourceBounds.max.x-sourceBounds.min.x),geo=mobile&&item.mobileGeo?item.mobileGeo:item.geo,origin=[(geo[0]-13)*2.2,(60-geo[1])*4.4];
   model.rotation.y=item.yaw||0;model.position.y=SEA;
   let fit=null,bounds=null,scale=baseScale;
   for(const factor of[1,.92,.84,.74]){
    scale=baseScale*factor;model.scale.setScalar(scale);model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model);
    fit=placeAtSea({THREE,origin,bounds,regionAt,camera,occupied,landmarks:landmarkBoxes,maxDistance:item.offshore?7:18});if(fit)break;
   }
   if(!fit)throw new Error(`No open-water support for the ${item.name} model`);
   model.position.x=fit.x;model.position.z=fit.z;model.updateMatrixWorld(true);
   const worldBounds=new THREE.Box3().setFromObject(model),drawn=toGeo(fit.x,fit.z),footprint=fit.support.footprint.map((n,i)=>n+(i%2?fit.z:fit.x));
   model.userData={...model.userData,title:item.name,kind:'sea-model',asset:item.asset,coordinates:[...item.geo],drawingCoordinates:drawn,width:worldBounds.max.x-worldBounds.min.x,height:worldBounds.max.y-worldBounds.min.y,depth:worldBounds.max.z-worldBounds.min.z,footprint,worldBounds:{min:worldBounds.min.toArray(),max:worldBounds.max.toArray()},fullWaterSupport:true,fullViewportVisibility:fit.visible,landmarkOcclusionClear:true,sourceSamples:fit.support.samples.length,supportSamples:fit.support.samples.length,supportStep:SAMPLE_STEP,supportMargin:MARGIN,geometryOnly:true,dimensional:true,scale};
   objects.push(model);scene.add(model);decorations.push({name:item.name,geo:drawn,label:item.label,model});
  }
  return objects;
 });
 return {count:ITEMS.length,objects,ready,decorations};
}
