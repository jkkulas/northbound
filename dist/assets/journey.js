// Travelling marginalia: upright isometric illustrations printed in the
// same pigments as the chart. Geographic contact and painted height are
// separate, just as they would be in an illustrated paper diorama.
import { loadPaperAtlas, createPaperCard } from './paper-art.js';
export const TORP = [10.2586, 59.1867];
export const HOVIK = [10.5817, 59.9];
// The Opera is deliberately oversized and grows east from its geographic pin.
// Leave room for the whole car, including its nose while turning, to its west.
export const OSLO_FORECOURT = [10.1, 59.9];

const southFromTorp = [
  TORP, [10.34, 59.25], [10.35, 59.34], [10.31, 59.47],
  [10.23, 59.58], [10.18, 59.70], [10.12, 59.77],
  [10.08, 59.83], OSLO_FORECOURT,
];
const southFromLillehammer = [
  [10.47, 61.11], [10.65, 60.91], [10.68, 60.80],
  [10.61, 60.70], [10.48, 60.52], [10.10, 60.33],
  [10.08, 60.17], [10.09, 60.08], [10.07, 59.98], OSLO_FORECOURT,
];
const gudbrandsdal = [
  [9.54, 61.77],
  [9.87, 61.61], [10.14, 61.53], [10.29, 61.31],
  ...southFromLillehammer,
];
const southCoast = [
  [5.73, 58.97], [5.76, 58.85], [6.01, 58.63],
  [6.29, 58.45], [6.66, 58.30], [7.06, 58.22],
  [7.45, 58.17], [8.00, 58.15], [8.36, 58.35],
  [8.76, 58.55], [9.07, 58.73], [9.30, 58.86],
  [9.49, 59.15], [9.66, 59.22], [9.99, 59.10],
  [10.11, 59.13], ...southFromTorp,
];

// These are scenic cartographic corridors, not a turn-by-turn road dataset.
// They follow the broad eastern valleys and inland southern coast. Western
// passes, fjord ferries and northern islands deliberately use a valley departure
// after the camera fades: a toy car cannot take the real roads' tunnels/ferries.
// Also available to scenery builders so separate peak meshes can leave space.
export const NORWAY_ROAD_CORRIDORS = [gudbrandsdal, southCoast, southFromTorp];

function mapDistanceSquared(a, b) {
  return ((a[0] - b[0]) * 2.2) ** 2 + ((a[1] - b[1]) * 4.4) ** 2;
}

function annotateRoute(points, clicked, destinationName) {
  const route = points.map(point => [...point]);
  Object.defineProperties(route, {
    departure: { value: [...route[0]] },
    clicked: { value: [...clicked] },
    destination: { value: [...OSLO_FORECOURT] },
    destinationName: { value: destinationName },
    snapped: { value: mapDistanceSquared(route[0], clicked) > .04 },
  });
  return route;
}

export function routeNorway(start) {
  const clicked = Array.isArray(start) && start.length >= 2 && start.every(Number.isFinite)
    ? start : [8.7, 62.1];
  let nearest = null;
  for (const corridor of NORWAY_ROAD_CORRIDORS) {
    for (let i = 0; i < corridor.length - 1; i++) {
      const a = corridor[i], b = corridor[i + 1];
      const dx = (b[0] - a[0]) * 2.2, dz = (b[1] - a[1]) * 4.4;
      const t = Math.max(0, Math.min(1,
        (((clicked[0] - a[0]) * 2.2) * dx + ((clicked[1] - a[1]) * 4.4) * dz)
        / (dx * dx + dz * dz || 1)));
      const departure = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const distance = mapDistanceSquared(departure, clicked);
      if (!nearest || distance < nearest.distance) nearest = { corridor, i, departure, distance };
    }
  }
  const points = [nearest.departure, ...nearest.corridor.slice(nearest.i + 1)];
  // A click directly on the destination still gets a short, visible arrival.
  if (points.length < 3 && mapDistanceSquared(points[0], OSLO_FORECOURT) < .006)
    points.splice(0, points.length, [9.96, 59.91], [10.03, 59.9], OSLO_FORECOURT);
  return annotateRoute(points, clicked, 'H\u00f8vik \u00b7 Oslo');
}

export function routeTorpToOslo() {
  return annotateRoute(southFromTorp, TORP, 'Oslo waterfront');
}

export function createVehicles({ THREE, scene, mobile=false, camera=null }) {
  const carModel=new THREE.Group();carModel.name='car-volkswagen-passat-variant';
  const flightModel=new THREE.Group();flightModel.name='plane-wizz-inspired-airbus';
  const carPivot=new THREE.Group(),planePivot=new THREE.Group();
  carPivot.name='passat-paper-illustration';planePivot.name='airbus-paper-illustration';
  carModel.add(carPivot);flightModel.add(planePivot);

  // The wheel rectangle is a geographic contact, not the vertical dimensions
  // of an ink illustration. Terrain clearance probes cover the entire contact.
  const footprint={width:1.18,length:2.37};
  const groundProbes=[];
  for(const x of[-footprint.width/2,0,footprint.width/2])
    for(const z of[-footprint.length/2,-.765,0,.765,footprint.length/2])
      groundProbes.push([x,0,z]);
  carModel.userData={kind:'car',chassis:carPivot,cabin:carPivot,wheels:[],
    illustration:carPivot,camera,groundProbes,footprint,
    make:'Volkswagen',model:'Passat Variant',style:'isometric-paper-diorama',
    dimensional:false,upright:true,artworkAsset:'car'};
  flightModel.userData={kind:'plane',airframe:planePivot,engineFans:[],
    illustration:planePivot,camera,footprint:{width:4.52,length:4.85},
    model:'Airbus-family Wizz-inspired passenger jet',style:'isometric-paper-diorama',
    dimensional:false,upright:true,artworkAsset:'plane'};

  const ready=loadPaperAtlas({THREE,mobile}).then(({atlas,texture})=>{
    for(const[model,pivot,asset,width]of[
      [carModel,carPivot,'car',2.8],[flightModel,planePivot,'plane',5.4],
    ]){
      const card=createPaperCard({THREE,atlas,texture,asset,width,lean:-.18,kind:'vehicle'});
      card.name=asset+'-upright-isometric-painting';
      card.userData.vehiclePaperArtwork=true;
      pivot.add(card);model.userData.illustrationCard=card;
      model.userData.artworkReady=true;
    }
    return{carModel,flightModel};
  });
  const arrival=new THREE.Mesh(new THREE.RingGeometry(.45,.60,64),
    new THREE.MeshBasicMaterial({color:0xffd56d,transparent:true,opacity:0,
      side:THREE.DoubleSide,depthWrite:false}));
  arrival.name='journey-arrival-ring';arrival.rotation.x=-Math.PI/2;
  carModel.visible=flightModel.visible=false;scene.add(carModel,flightModel,arrival);
  return{flightModel,carModel,arrival,ready};
}

// The route rotates a contact footprint, while its upright illustration keeps
// facing the reader. Banking and suspension move the whole printed image;
// they do not introduce a second style of volumetric wheels or engines.
export function animateVehicle(model,{time=0,progress=0,turn=0,speed=1}={}){
  const data=model.userData,pivot=data.illustration;
  if(!pivot)return;
  const heading=model.rotation.y;
  let facing=0;
  if(data.camera){
    const dx=data.camera.position.x-model.position.x,dz=data.camera.position.z-model.position.z;
    facing=Math.atan2(dx,dz);
  }
  // Cancel heading plus the road's pitch/roll, preserving an upright paper
  // plane even on slopes and at the route's tightest bends.
  const target=new model.quaternion.constructor();
  target.setFromAxisAngle(model.up,facing);
  pivot.quaternion.copy(model.quaternion).invert().multiply(target);
  const card=data.illustrationCard;
  if(card){
    // Source vehicles point left. A simple ink-image reflection gives a
    // sensible left/right direction without ever exposing an edge-on card.
    const rightward=-Math.sin(heading-facing);
    if(Math.abs(rightward)>.18)card.scale.x=rightward>0?-1:1;
  }
  if(data.kind==='car'){
    pivot.position.y=Math.sin(time*15)*.009*speed;
    pivot.rotateZ(Math.max(-.035,Math.min(.035,-turn*.14)));
  }else if(data.kind==='plane'){
    pivot.position.y=Math.sin(time*2.1)*.020;
    pivot.rotateZ(Math.max(-.20,Math.min(.20,-turn*.4))+Math.sin(progress*Math.PI*4)*.022);
  }
}
