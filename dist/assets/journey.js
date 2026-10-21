// Travelling marginalia: opaque pigment, fine ink, and engraved coachwork.
// Vehicles face local -Z and keep solid geometry for terrain/depth testing.
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
  return annotateRoute(points, clicked, 'Høvik · Oslo');
}

export function routeTorpToOslo() {
  return annotateRoute(southFromTorp, TORP, 'Oslo waterfront');
}

export function createVehicles({ THREE, scene }) {
  const c = value => new THREE.Color(value);
  const p = {
    body:c(0x57706d), roof:c(0x687e75), highlight:c(0x889b8b),
    ivory:c(0xf2e2b9), linen:c(0xd5c7a5), silver:c(0xb9b5a0), darkSilver:c(0x797f75),
    glass:c(0x344e56), rubber:c(0x292e2b), ink:c(0x30352e), lamp:c(0xf2d99e),
    red:c(0xad4e40), magenta:c(0xb64277), rose:c(0xd16a91), plum:c(0x653f72),
    cobalt:c(0x424d83), engine:c(0x777e7a),
  };
  // Smooth sculpture under opaque printed pigments. Hatching follows the
  // physical model; broad hand-painted shade replaces plastic reflections.
  const paint = new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  paint.name='Smooth engraved atlas vehicles';
  paint.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vEtchingPosition;\nvarying vec3 vEtchingNormal;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvEtchingPosition=position;vEtchingNormal=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vEtchingPosition;\nvarying vec3 vEtchingNormal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',[
      '#include <color_fragment>',
      'float light=dot(normalize(vEtchingNormal),normalize(vec3(-.65,1.,-.55)));',
      'float shade=smoothstep(-.75,.75,light);',
      'float fibre=fract(sin(dot(floor(vEtchingPosition*270.),vec3(12.9898,78.233,37.719)))*43758.5453);',
      'float hatch=1.-smoothstep(.04,.14,abs(fract(dot(vEtchingPosition,vec3(1.,.62,.28))*62.)-.5));',
      'float crosshatch=1.-smoothstep(.035,.13,abs(fract(dot(vEtchingPosition,vec3(.28,-.71,1.))*69.)-.5));',
      'diffuseColor.rgb*=mix(.60,1.06,shade)*(.974+.044*fibre);',
      'diffuseColor.rgb*=1.-hatch*.075*(1.-shade)-crosshatch*.045*pow(1.-shade,2.);',
      'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.57,.49,.32),.025);',
    ].join('\n'));
  };
  paint.customProgramCacheKey=()=>'engraved-smooth-vehicles-v3';
  const ink=new THREE.LineBasicMaterial({color:p.ink,toneMapped:false});
  const gleam=new THREE.LineBasicMaterial({color:p.linen,toneMapped:false});
  function outline(thickness){
    const material=new THREE.MeshBasicMaterial({color:p.ink,side:THREE.BackSide,toneMapped:false});
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed+=normal*'+thickness.toFixed(4)+';');
    };
    material.customProgramCacheKey=()=>'vehicle-fine-ink-'+thickness;return material;
  }
  const carOutline=outline(.005),planeOutline=outline(.007);
  function mesh(geometry,tint,parent,x=0,y=0,z=0){
    const item=new THREE.Mesh(geometry,paint);item.userData.pigment=tint;
    item.position.set(x,y,z);parent.add(item);return item;
  }
  function box(w,h,d,tint,parent,x=0,y=0,z=0){
    return mesh(new THREE.BoxGeometry(w,h,d),tint,parent,x,y,z);
  }
  function egg(w,h,d,tint,parent,x=0,y=0,z=0){
    const small=w<.02||h<.026;
    const geometry=new THREE.SphereGeometry(1,small?16:28,small?10:18);geometry.scale(w,h,d);
    return mesh(geometry,tint,parent,x,y,z);
  }
  function stroke(parent,points,closed=false,highlight=false){
    const key=highlight?'gleam':'ink',lines=parent.userData[key]||(parent.userData[key]=[]);
    for(let i=1;i<points.length;i++)lines.push(...points[i-1],...points[i]);
    if(closed)lines.push(...points[points.length-1],...points[0]);
  }
  function curve(parent,at,steps=30,highlight=false){
    stroke(parent,Array.from({length:steps+1},(_,i)=>at(i/steps)),false,highlight);
  }
  function ring(parent,centre,a,b,ra,rb=ra,highlight=false){
    curve(parent,t=>{const point=[...centre],angle=t*Math.PI*2;
      point[a]+=Math.cos(angle)*ra;point[b]+=Math.sin(angle)*rb;return point;
    },32,highlight);
  }
  function rod(parent,a,b,radius,tint,sides=10){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const item=mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),sides),tint,parent);
    item.position.copy(start.add(end).multiplyScalar(.5));
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return item;
  }
  function panel(parent,points,tint,withInk=true){
    const indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    if(withInk)stroke(parent,points,true);return mesh(geometry,tint,parent);
  }
  function fittedGlazing(parent,at,hint){
    const vertices=[],indices=[],nu=14,nv=10;
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)vertices.push(...at(i/nu,j/nv));
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
      const a=j*(nu+1)+i,b=a+1,d=a+nu+1;indices.push(a,b,d,b,d+1,d);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setIndex(indices);g.computeVertexNormals();
    const n=g.getAttribute('normal'),centre=Math.floor(n.count/2);
    if(new THREE.Vector3().fromBufferAttribute(n,centre).dot(new THREE.Vector3(...hint))<0){
      for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
      g.setIndex(indices);g.computeVertexNormals();
    }
    mesh(g,p.glass,parent);
    for(const fixed of[0,1]){
      curve(parent,t=>at(t,fixed),nu);curve(parent,t=>at(fixed,t),nv);
    }
  }
  function skin(parent,rings,tint,{reverse=false,colorAt=null,cap=true}={}){
    const count=rings[0].length,vertices=rings.flat(2),indices=[];
    const face=(a,b,d)=>reverse?indices.push(a,d,b):indices.push(a,b,d);
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<count;j++){
      const a=i*count+j,b=(i+1)*count+j,d=i*count+(j+1)%count,e=(i+1)*count+(j+1)%count;
      face(a,b,d);face(b,e,d);
    }
    if(cap)for(const end of[0,rings.length-1]){
      const centre=new THREE.Vector3();
      for(const point of rings[end])centre.add(new THREE.Vector3(...point));
      centre.multiplyScalar(1/count);const ci=vertices.length/3;vertices.push(...centre.toArray());
      for(let j=0;j<count;j++){
        const a=end*count+j,b=end*count+(j+1)%count;
        end?face(ci,b,a):face(ci,a,b);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    if(colorAt){
      const colors=[];
      for(let i=0;i<vertices.length;i+=3){
        const col=colorAt(vertices[i],vertices[i+1],vertices[i+2]);colors.push(col.r,col.g,col.b);
      }
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    }
    return mesh(geometry,tint,parent);
  }
  const smooth=t=>t*t*(3-2*t);
  function interpolate(sections,z,index){
    for(let i=1;i<sections.length;i++)if(z<=sections[i][0]){
      const a=sections[i-1],b=sections[i],t=smooth((z-a[0])/(b[0]-a[0]));
      return a[index]+(b[index]-a[index])*t;
    }return sections[sections.length-1][index];
  }
  function revolution(parent,sections,tint,colorAt=null,rings=68){
    const start=sections[0][0],end=sections[sections.length-1][0];
    return skin(parent,Array.from({length:rings+1},(_,i)=>{
      const z=start+(end-start)*i/rings,rx=interpolate(sections,z,1),ry=interpolate(sections,z,2),y=interpolate(sections,z,3);
      return Array.from({length:44},(_,j)=>{
        const angle=j*Math.PI*2/44;return[Math.sin(angle)*rx,y+Math.cos(angle)*ry,z];
      });
    }),tint,{colorAt});
  }
  // Bake panels and their fine engraved strokes. Only wheels and engine fans
  // retain separate transforms, keeping the journey inexpensive to animate.
  function finish(parent,contourMaterial){
    const positions=[],normals=[],colors=[],indices=[];
    for(const item of[...parent.children]){
      if(!item.isMesh||!item.userData.pigment)continue;
      item.updateMatrix();const g=item.geometry.clone().applyMatrix4(item.matrix);
      const position=g.getAttribute('position'),normal=g.getAttribute('normal'),co=g.getAttribute('color');
      const offset=positions.length/3,tint=item.userData.pigment;
      for(let i=0;i<position.count;i++){
        positions.push(position.getX(i),position.getY(i),position.getZ(i));
        normals.push(normal.getX(i),normal.getY(i),normal.getZ(i));
        colors.push(co?co.getX(i):tint.r,co?co.getY(i):tint.g,co?co.getZ(i):tint.b);
      }
      if(g.index)for(const i of g.index.array)indices.push(offset+i);
      else for(let i=0;i<position.count;i++)indices.push(offset+i);
      g.dispose();item.geometry.dispose();parent.remove(item);
    }
    if(positions.length){
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);
      g.computeBoundingBox();g.computeBoundingSphere();
      const surface=new THREE.Mesh(g,paint),contour=new THREE.Mesh(g,contourMaterial);
      surface.name='opaque-pigment';contour.name='ink-silhouette';contour.userData.vehicleInkContour=true;
      parent.add(contour,surface);
    }
    for(const[key,material]of[['ink',ink],['gleam',gleam]])if(parent.userData[key]?.length){
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(parent.userData[key],3));
      const strokes=new THREE.LineSegments(g,material);strokes.name=key+'-engraving';parent.add(strokes);delete parent.userData[key];
    }
  }

  // Contemporary Passat Variant: bonnet, flowing estate roof, three side
  // lights, modern narrow LEDs, alloy wheels and an engraved Volkswagen badge.
  const carModel=new THREE.Group();carModel.name='car-volkswagen-passat-variant';
  const chassis=new THREE.Group();chassis.name='passat-coachwork';carModel.add(chassis);
  const bodySections=[
    [-1.205,.404,.475],[-1.13,.473,.512],[-.91,.493,.535],[-.52,.501,.56],
    [.10,.499,.567],[.70,.491,.566],[1.08,.472,.547],[1.19,.434,.501],
  ];
  const perimeter=[[0,1],[.43,.998],[.78,.97],[.94,.87],[1,.66],[1,.35],[.96,.1],[.8,0],
    [0,0],[-.8,0],[-.96,.1],[-1,.35],[-1,.66],[-.94,.87],[-.78,.97],[-.43,.998]];
  function archBottom(z){
    let bottom=.237;
    for(const axle of[-.765,.765]){
      const d=z-axle;if(Math.abs(d)<.229)bottom=Math.max(bottom,.205+Math.sqrt(.229*.229-d*d));
    }return bottom;
  }
  skin(chassis,Array.from({length:97},(_,i)=>{
    const z=-1.205+2.395*i/96,w=interpolate(bodySections,z,1),top=interpolate(bodySections,z,2),bottom=archBottom(z);
    return perimeter.map(([x,y])=>[x*w,bottom+(top-bottom)*y,z]);
  }),p.body);
  const cabinSections=[[-.615,.430,.553],[-.27,.437,.805],[-.10,.434,.837],
    [.58,.430,.837],[.79,.427,.811],[1.035,.427,.565]];
  function cabinHeight(z){
    if(z<-.27)return .553+(.805-.553)*(z+.615)/.345;
    if(z>.79)return .811+(.565-.811)*(z-.79)/.245;
    return interpolate(cabinSections,z,2);
  }
  const cabinPerimeter=[[0,1],[.56,.997],[.81,.965],[.87,.90],[.94,.63],[1,.10],
    [.98,0],[0,0],[-.98,0],[-1,.10],[-.94,.63],[-.87,.90],[-.81,.965],[-.56,.997]];
  skin(chassis,Array.from({length:57},(_,i)=>{
    const z=-.615+1.65*i/56,w=interpolate(cabinSections,z,1),top=cabinHeight(z);
    return cabinPerimeter.map(([x,y])=>[x*w,.545+(top-.545)*y,z]);
  }),p.roof);
  function sidePoint(side,z,y,lift=.004){
    z=Math.max(-.615,Math.min(1.035,z));
    const w=interpolate(cabinSections,z,1),top=cabinHeight(z);
    const t=Math.max(0,Math.min(1,(y-.545)/(top-.545)));
    const edge=[[0,.98],[.10,1],[.63,.94],[.90,.87],[.965,.81],[.997,.56],[1,0]];
    let x=0;
    for(let i=1;i<edge.length;i++)if(t<=edge[i][0]){
      const a=edge[i-1],b=edge[i],f=(t-a[0])/(b[0]-a[0]);x=a[1]+(b[1]-a[1])*f;break;
    }
    return[side*(w*x+lift),y,z];
  }
  function roofPoint(t,z,lift=.007){
    const x=Math.abs(t),edge=[[0,1],[.56,.997],[.81,.965],[.87,.90],[.94,.63],[1,.10]];
    let height=.10;
    for(let i=1;i<edge.length;i++)if(x<=edge[i][0]){
      const a=edge[i-1],b=edge[i],f=(x-a[0])/(b[0]-a[0]);height=a[1]+(b[1]-a[1])*f;break;
    }
    return[t*interpolate(cabinSections,z,1),.545+(cabinHeight(z)-.545)*height+lift,z];
  }
  for(const side of[-1,1]){
    for(const points of[
      [[-.524,.578],[-.232,.786],[.072,.796],[.072,.578]],
      [[.117,.578],[.117,.796],[.604,.794],[.650,.578]],
      [[.700,.578],[.652,.787],[.757,.779],[.961,.578]],
    ])fittedGlazing(chassis,(u,v)=>{
      const [a,b,c,d]=points;
      const z=(a[0]*(1-u)+d[0]*u)*(1-v)+(b[0]*(1-u)+c[0]*u)*v;
      const y=(a[1]*(1-u)+d[1]*u)*(1-v)+(b[1]*(1-u)+c[1]*u)*v;
      return sidePoint(side,z,y,.007);
    },[side,0,0]);
    stroke(chassis,[[side*.492,.555,-.54],[side*.497,.561,.66],[side*.470,.544,1.08]]);
    stroke(chassis,[[side*.493,.485,-1.06],[side*.504,.480,-.43],[side*.503,.480,.65],[side*.475,.479,1.08]]);
    stroke(chassis,[[side*.504,.546,.085],[side*.506,.285,.09]]);
    stroke(chassis,[[side*.494,.542,.675],[side*.494,.31,.70]]);
    stroke(chassis,[[side*.493,.549,-.48],[side*.502,.335,-.39],[side*.501,.282,.09]]);
    for(const z of[-.03,.55]){
      egg(.013,.015,.065,p.silver,chassis,side*.505,.527,z);
      stroke(chassis,[[side*.519,.528,z-.044],[side*.519,.528,z+.038]],false,true);
    }
    for(const axle of[-.765,.765])curve(chassis,t=>{
      const angle=t*Math.PI;return[side*.505,.205+Math.sin(angle)*.234,axle+Math.cos(angle)*.234];
    },36);
    stroke(chassis,[[side*.479,.272,-.51],[side*.478,.272,.50]]);
    rod(chassis,[side*.445,.594,-.399],[side*.555,.590,-.376],.014,p.darkSilver);
    egg(.067,.034,.074,p.body,chassis,side*.565,.603,-.380);
    panel(chassis,[[side*.616,.583,-.391],[side*.616,.616,-.389],
      [side*.602,.621,-.335],[side*.599,.587,-.329]],p.glass,false);
    curve(chassis,t=>[side*.305,.851+Math.sin(t*Math.PI)*.008,-.075+t*.76],24,true);
    for(const z of[-.06,.64])rod(chassis,[side*.305,.834,z],[side*.305,.851,z],.008,p.silver,8);
    for(const[a,b,c,d]of[[-.25,.62,-.13,.74],[.28,.62,.40,.75],[.74,.61,.76,.72]])
      stroke(chassis,[sidePoint(side,a,b,.012),sidePoint(side,c,d,.012)],false,true);
  }
  fittedGlazing(chassis,(u,v)=>roofPoint((u*2-1)*(.91-.08*v),-.576+.299*v),[0,1,-1]);
  curve(chassis,t=>roofPoint(-.74+t*1.18,-.54,.013),18);
  fittedGlazing(chassis,(u,v)=>roofPoint((u*2-1)*(.82+.11*v),.811+.203*v),[0,1,1]);
  curve(chassis,t=>roofPoint(-.58+t*.9,.966,.013),16);
  for(const side of[-1,1]){
    curve(chassis,t=>[side*(.29+.018*t),.523+.035*t,-1.115+t*.517],24,true);
    panel(chassis,[[side*.241,.472,-1.211],[side*.422,.470,-1.179],
      [side*.452,.501,-1.122],[side*.253,.504,-1.173]],p.lamp);
    stroke(chassis,[[side*.246,.499,-1.211],[side*.420,.495,-1.180],[side*.448,.505,-1.125]],false,true);
    panel(chassis,[[side*.249,.496,1.192],[side*.432,.494,1.161],
      [side*.444,.536,1.137],[side*.258,.538,1.184]],p.red);
    stroke(chassis,[[side*.266,.517,1.197],[side*.426,.516,1.166]],false,true);
  }
  box(.54,.101,.020,p.rubber,chassis,0,.386,-1.216);
  for(let i=0;i<4;i++)stroke(chassis,[[-.248,.347+i*.025,-1.229],[.248,.347+i*.025,-1.229]],false,i===3);
  box(.79,.045,.023,p.darkSilver,chassis,0,.292,-1.198);
  box(.228,.056,.014,p.ivory,chassis,0,.354,-1.233);
  stroke(chassis,[[-.083,.355,-1.241],[.080,.355,-1.241]]);
  const badge=mesh(new THREE.CylinderGeometry(.043,.043,.012,28),p.silver,chassis,0,.481,-1.210);
  badge.rotation.x=Math.PI/2;ring(chassis,[0,.481,-1.218],0,1,.036);
  stroke(chassis,[[-.020,.501,-1.220],[0,.477,-1.220],[.020,.501,-1.220]]);
  stroke(chassis,[[-.025,.485,-1.220],[-.013,.461,-1.220],[0,.475,-1.220],[.013,.461,-1.220],[.025,.485,-1.220]]);
  box(.83,.038,.020,p.darkSilver,chassis,0,.297,1.183);
  box(.215,.056,.016,p.ivory,chassis,0,.414,1.204);
  stroke(chassis,[[-.40,.543,1.180],[.40,.543,1.180]]);
  box(.73,.016,.083,p.roof,chassis,0,.823,.791);
  panel(chassis,[[-.014,.838,.61],[0,.893,.67],[.014,.838,.72]],p.body,false);
  const wheels=[];
  for(const side of[-1,1])for(const z of[-.765,.765]){
    const wheel=new THREE.Group();wheel.position.set(side*.497,.205,z);carModel.add(wheel);
    const tire=mesh(new THREE.TorusGeometry(.151,.051,12,40),p.rubber,wheel);tire.rotation.y=Math.PI/2;
    const well=mesh(new THREE.CylinderGeometry(.153,.153,.109,40),p.rubber,wheel);well.rotation.z=Math.PI/2;
    const rim=mesh(new THREE.CylinderGeometry(.129,.129,.115,40),p.silver,wheel);rim.rotation.z=Math.PI/2;
    const recess=mesh(new THREE.CylinderGeometry(.111,.111,.118,36),p.darkSilver,wheel);recess.rotation.z=Math.PI/2;
    for(const face of[-.062,.062]){
      ring(wheel,[face,0,0],1,2,.128,.128,true);ring(wheel,[face,0,0],1,2,.146);
      for(let i=0;i<5;i++)for(const branch of[-1,1]){
        const a=i*Math.PI*2/5,b=a+branch*.13;
        rod(wheel,[face,Math.cos(a)*.033,Math.sin(a)*.033],
          [face,Math.cos(b)*.115,Math.sin(b)*.115],.013,p.silver,7);
      }
      const hub=mesh(new THREE.CylinderGeometry(.032,.032,.008,20),p.silver,wheel,face,0,0);hub.rotation.z=Math.PI/2;
      ring(wheel,[face+Math.sign(face)*.006,0,0],1,2,.022);
    }
    finish(wheel,carOutline);wheels.push(wheel);
  }
  finish(chassis,carOutline);
  carModel.userData={kind:'car',chassis,cabin:chassis,wheels,footprint:{width:1.264,length:2.482},
    make:'Volkswagen',model:'Passat Variant',style:'smooth-engraved-pigment'};

  // A modern Airbus-family jet, with a slender pressurised hull and the
  // Wizz-inspired ivory, pink and plum livery rendered as antique pigments.
  const flightModel=new THREE.Group();flightModel.name='plane-wizz-inspired-airbus';
  const airframe=new THREE.Group();airframe.name='airbus-airframe';flightModel.add(airframe);
  const fuselageSections=[
    [-2.42,.006,.009,.590],[-2.36,.092,.102,.590],[-2.20,.211,.208,.603],
    [-1.99,.263,.252,.608],[-1.70,.270,.260,.610],[1.40,.270,.260,.610],
    [1.72,.229,.226,.630],[2.10,.126,.135,.682],[2.39,.016,.022,.708],
  ];
  function fuselageTint(x,y,z){
    const ease=(a,b,value)=>smooth(Math.max(0,Math.min(1,(value-a)/(b-a))));
    const transition=.40-(y-.61)*1.15;
    const magenta=Math.max(1-ease(.515,.555,y),ease(transition-.05,transition+.05,z));
    const rear=p.magenta.clone().lerp(p.plum,ease(.89,1.24,z));
    rear.lerp(p.cobalt,ease(1.12,1.30,z)*ease(.59,.74,y));
    return p.ivory.clone().lerp(rear,magenta);
  }
  function fuselagePoint(side,angle,z){
    const rx=interpolate(fuselageSections,z,1)+.008,ry=interpolate(fuselageSections,z,2)+.008;
    return[side*Math.sin(angle)*rx,interpolate(fuselageSections,z,3)+Math.cos(angle)*ry,z];
  }
  revolution(airframe,fuselageSections,p.ivory,fuselageTint,104);
  curve(airframe,t=>{
    const z=-2.14+t*4.29;return[-.046,interpolate(fuselageSections,z,3)+interpolate(fuselageSections,z,2)*.99,z];
  },70,true);
  for(const side of[-1,1]){
    for(let i=0;i<31;i++){
      const z=-1.79+i*.104,rx=interpolate(fuselageSections,z,1),ry=interpolate(fuselageSections,z,2);
      const y=interpolate(fuselageSections,z,3)+.090,x=side*rx*Math.sqrt(1-(.090/ry)**2);
      egg(.009,.023,.017,p.glass,airframe,x,y,z);
    }
    for(const z of[-1.93,-.20,.17,1.46]){
      const x=side*(interpolate(fuselageSections,z,1)+.003);
      stroke(airframe,[[x,.586,z-.043],[x,.779,z-.043],[x,.795,z-.028],
        [x,.795,z+.036],[x,.779,z+.048],[x,.586,z+.048]],true);
      stroke(airframe,[[x+side*.004,.646,z+.007],[x+side*.004,.646,z+.028]]);
    }
    fittedGlazing(airframe,(u,v)=>fuselagePoint(side,.10+u*.57,-2.26+v*.17),[side,1,-1]);
    fittedGlazing(airframe,(u,v)=>fuselagePoint(side,.74+u*.41,-2.21+v*.22),[side,1,-1]);
    curve(airframe,t=>fuselagePoint(side,.19+t*.36,-2.245),16,true);
    curve(airframe,t=>{
      const z=-1.91+t*3.48,rx=interpolate(fuselageSections,z,1),ry=interpolate(fuselageSections,z,2);
      return[side*rx*.982,interpolate(fuselageSections,z,3)+ry*.20,z];
    },50);
    // The livery's prominent zigzag is drawn as round pigment strokes.
    const x=side*.268,y=.57;
    for(const[a,b]of[
      [[x,y+.045,-1.58],[x,y-.055,-1.50]],[[x,y-.055,-1.50],[x,y+.035,-1.42]],
      [[x,y+.035,-1.42],[x,y-.055,-1.34]],[[x,y-.055,-1.34],[x,y+.050,-1.25]],
    ])rod(airframe,a,b,.023,p.magenta,8);
  }
  function wing(side,sections,{tail=false}={}){
    const rings=sections.map(([span,leading,trailing,height])=>{
      const chord=trailing-leading,thick=tail?.022:(.045*(1-span/2.7));
      return[[0,0],[.06,.55],[.20,1],[.42,.80],[.69,.44],[.90,.15],[1,0],
        [.90,-.10],[.69,-.22],[.42,-.31],[.20,-.36],[.06,-.25]]
        .map(([t,h])=>[side*span,height+h*thick,leading+chord*t]);
    });
    skin(airframe,rings,p.linen,{reverse:side>0});
    stroke(airframe,sections.map(([x,l,r,y])=>[side*x,y+.005,l]));
    stroke(airframe,sections.map(([x,l,r,y])=>[side*x,y+.005,r]));
    stroke(airframe,sections.map(([x,l,r,y])=>[side*x,y+.018,l+(r-l)*.73]));
    if(!tail){
      for(const i of[1,2,3]){
        const[x,l,r,y]=sections[i];stroke(airframe,[[side*x,y+.022,l+(r-l)*.34],[side*x,y+.025,r]]);
      }
      curve(airframe,t=>{const x=.44+t*1.57,z=.17+t*.68;return[side*x,.527+x*.032,z];},24,true);
    }
  }
  for(const side of[-1,1]){
    wing(side,[[.19,-.61,.72,.480],[.57,-.47,.82,.494],[1.07,-.12,.93,.514],
      [1.62,.32,1.040,.537],[2.18,.77,1.095,.562]]);
    wing(side,[[.11,1.435,2.235,.748],[.47,1.64,2.255,.778],[.97,1.965,2.310,.814]],{tail:true});
    panel(airframe,[[side*2.158,.564,.770],[side*2.248,.926,.972],
      [side*2.238,.952,1.092],[side*2.172,.563,1.095]],p.cobalt);
    panel(airframe,[[side*2.169,.614,.821],[side*2.225,.867,.977],
      [side*2.228,.877,1.061],[side*2.190,.662,.996]],p.magenta,false);
    egg(.023,.018,.032,side<0?p.red:p.highlight,airframe,side*2.18,.582,1.064);
    panel(airframe,[[side*.766,.445,-.451],[side*.766,.498,-.167],
      [side*.766,.366,-.075],[side*.766,.345,-.468]],p.engine);
  }
  const fin=new THREE.Shape();
  fin.moveTo(-1.27,.720);fin.bezierCurveTo(-1.40,.880,-1.64,1.437,-1.76,1.574);
  fin.quadraticCurveTo(-1.80,1.637,-1.90,1.641);fin.lineTo(-2.018,1.635);
  fin.quadraticCurveTo(-2.052,1.624,-2.058,1.567);fin.lineTo(-2.238,.734);fin.closePath();
  const finGeometry=new THREE.ExtrudeGeometry(fin,{depth:.047,bevelEnabled:true,
    bevelSegments:3,steps:1,bevelSize:.014,bevelThickness:.012,curveSegments:28});
  finGeometry.rotateY(Math.PI/2);finGeometry.translate(-.0235,0,0);mesh(finGeometry,p.cobalt,airframe);
  for(const side of[-1,1]){
    const x=side*.041;
    panel(airframe,[[x,.86,1.49],[x,1.44,1.771],[x,1.57,1.948],[x,1.14,1.873],[x,.84,1.913]],p.magenta);
    stroke(airframe,[[x+side*.003,1.380,1.755],[x+side*.003,1.086,1.738],
      [x+side*.003,1.307,1.907],[x+side*.003,1.015,1.872]],false,true);
    stroke(airframe,[[x,.789,2.130],[x,1.525,1.991]]);
  }
  const engineFans=[];
  for(const side of[-1,1]){
    const engine=new THREE.Group();engine.position.set(side*.778,.263,-.085);airframe.add(engine);
    revolution(engine,[[-.875,.152,.152,0],[-.835,.181,.181,0],[-.72,.191,.191,0],
      [-.42,.174,.174,0],[-.240,.125,.125,0]],p.magenta,null,34);
    mesh(new THREE.TorusGeometry(.151,.023,12,40),p.silver,engine,0,0,-.879);
    const intake=mesh(new THREE.CylinderGeometry(.143,.143,.012,40),p.rubber,engine,0,0,-.880);intake.rotation.x=Math.PI/2;
    ring(engine,[0,0,-.900],0,1,.150,.150,true);
    const nozzle=mesh(new THREE.CylinderGeometry(.095,.111,.065,32),p.darkSilver,engine,0,0,-.222);nozzle.rotation.x=Math.PI/2;
    const hole=mesh(new THREE.CylinderGeometry(.078,.078,.071,32),p.rubber,engine,0,0,-.215);hole.rotation.x=Math.PI/2;
    curve(engine,t=>[-.08,.165,-.80+t*.48],22,true);
    const fan=new THREE.Group();fan.position.set(0,0,-.900);engine.add(fan);
    for(let i=0;i<13;i++){
      const a=i*Math.PI*2/13;
      panel(fan,[[Math.cos(a)*.032,Math.sin(a)*.032,-.003],
        [Math.cos(a+.12)*.132,Math.sin(a+.12)*.132,-.001],
        [Math.cos(a+.32)*.130,Math.sin(a+.32)*.130,0],
        [Math.cos(a+.23)*.043,Math.sin(a+.23)*.043,0]],p.engine,false);
    }
    egg(.033,.033,.047,p.silver,fan,0,0,-.015);
    finish(fan,planeOutline);engineFans.push(fan);finish(engine,planeOutline);
  }
  curve(airframe,t=>[.015,.347,-1.78+t*3.17],42);
  panel(airframe,[[-.012,.863,-.75],[0,.927,-.68],[.012,.863,-.62]],p.linen,false);
  egg(.024,.025,.018,p.rubber,airframe,0,.709,2.397);finish(airframe,planeOutline);
  flightModel.userData={kind:'plane',airframe,engineFans,propeller:engineFans[0],
    footprint:{width:4.52,length:4.85},model:'Airbus-family Wizz-inspired passenger jet',style:'smooth-engraved-pigment'};

  const arrival=new THREE.Mesh(new THREE.RingGeometry(.45,.60,64),
    new THREE.MeshBasicMaterial({color:0xffd56d,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  arrival.name='journey-arrival-ring';arrival.rotation.x=-Math.PI/2;
  carModel.visible=flightModel.visible=false;scene.add(carModel,flightModel,arrival);
  return{flightModel,carModel,arrival};
}

// Inner articulation leaves root heading and height to the route controller.
export function animateVehicle(model,{time=0,progress=0,turn=0,speed=1}={}){
  const data=model.userData;
  if(data.kind==='car'){
    data.chassis.position.y=Math.sin(time*15)*.012*speed;
    data.chassis.rotation.z=Math.max(-.045,Math.min(.045,-turn*.18));
    data.chassis.rotation.x=Math.sin(progress*Math.PI*2)*.012;
    for(const wheel of data.wheels)wheel.rotation.x=-time*15*speed;
  }else if(data.kind==='plane'){
    for(const fan of data.engineFans)fan.rotation.z=time*30;
    data.airframe.rotation.z=Math.max(-.27,Math.min(.27,-turn*.5))+Math.sin(progress*Math.PI*4)*.035;
    data.airframe.rotation.x=-.055*Math.sin(progress*Math.PI);
    data.airframe.position.y=Math.sin(time*2.1)*.020;
  }
}
