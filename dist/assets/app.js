import * as THREE from './vendor/three.module.min.js';
import {addLandmarks} from './landmarks.js';
import {addSeaCreatures} from './sea-creatures.js';
import {createIllustration} from './illustrations.js';
import {vertexShader,fragmentShader,waterFragmentShader,addIllustratedVegetation,addIllustratedGeography} from './atlas-terrain.js';
import {createLandMeshGeometry} from './terrain-mesh.js';
import {sampleTerrainHeight} from './terrain-height.js';
import {addMapScenery} from './map-scenery.js';
import {createVehicles,animateVehicle,routeNorway,routeTorpToOslo,OSLO_FORECOURT} from './journey.js';

const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),canvas=$('#terrain-canvas');
const names={en:'English',pl:'Polski',no:'Norsk'},ids={en:1,pl:2,no:3},langs=['','en','pl','no'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=matchMedia('(max-width:760px)').matches;
let busy=false,selected=null,ready=false,renderer,scene,camera,terrain,maskPixels,maskWidth,elevations,geography;
let raf=null,lastActivity=0,lastPointer=0,lastFrame=0,cameraMotion=0;
let framesRendered=0,readyAt=0;
const tweens=[],labels=[],hover=[0,0,0],hoverTarget=[0,0,0],pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
const projectedLabel=new THREE.Vector3();
let labelLayoutDirty=true,labelObstacles=[];
const cameraBase=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),look=new THREE.Vector3();
const cities={oslo:[10.7522,59.9139],torp:[10.2586,59.1867],hovik:[10.5817,59.9],pl:[19.1,52.1],en:[-.2,53.6],no:[8.7,62.1]};
let flightModel,carModel,routeLine,routeGlow,arrival;
let terrainMaxHeight=0,landmarkObjects=[],creatureObjects=[],journeyPhase='',routeSamples=[],carClearance=null,operaClearance=null;
const carVertexProbes=[];
function go(){location.assign(new URL('../'+selected+'/',import.meta.url))}
$('#skip').addEventListener('click',go);

function highlight(lang){if(busy)return;$$('[data-lang]').forEach(el=>el.classList.toggle('is-active',el.dataset.lang===lang));for(let i=0;i<3;i++)hoverTarget[i]=ids[lang]===i+1?1:0;wake()}
function bindLanguage(el){el.addEventListener('pointerenter',()=>highlight(el.dataset.lang));el.addEventListener('pointerleave',()=>highlight(null));el.addEventListener('focus',()=>highlight(el.dataset.lang));el.addEventListener('blur',()=>highlight(null));el.addEventListener('click',e=>{e.stopPropagation();journey(el.dataset.lang,cities[el.dataset.lang])});if(el.tagName.toLowerCase()==='path')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();journey(el.dataset.lang,cities[el.dataset.lang])}})}
$$('[data-lang]').forEach(bindLanguage);

function heightAt(lon,lat){return sampleTerrainHeight(elevations,lon,lat)}
function worldPoint([lon,lat],lift=0){return new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4)}
function geographic(point){return[point.x/2.2+13,60-point.z/4.4]}
function regionAt([lon,lat]){const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*maskWidth),y=Math.floor((b.north-lat)/(b.north-b.south)*maskWidth);return x>=0&&x<maskWidth&&y>=0&&y<maskWidth?Math.round(maskPixels[(y*maskWidth+x)*4]/85):0}
export function projectToScreen(lon,lat){if(!camera)return null;const p=worldPoint([lon,lat],.3).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}
export function inspectScene({artwork=false}={}){
 const model=flightModel?.visible?flightModel:carModel?.visible?carModel:null;
 let width=0,height=0;
 if(model){model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),points=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));width=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*innerWidth/2;height=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*innerHeight/2}
 const architecture=artwork?landmarkObjects.map(object=>{
  object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object),meshes=[];
  object.traverse(part=>{if(part.isMesh)meshes.push({name:part.name,vertices:part.geometry.attributes.position.count,triangles:(part.geometry.index?.count||part.geometry.attributes.position.count)/3,opaque:part.material.transparent===false,depthWrite:part.material.depthWrite});});
  return {name:object.name,userData:object.userData,anchor:object.position.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},meshes};
 }):[];
 return{camera:{position:camera?.position.toArray(),target:look.toArray(),fov:camera?.fov,aspect:camera?.aspect},hover:[...hover],terrainMaxHeight,landmarkCount:landmarkObjects.length,creatureCount:Number(canvas.dataset.creatures),artwork:canvas.dataset.artwork,scenery:scene?.userData.mapScenery,landmarkArtwork:architecture,seaArtwork:!artwork?[]:creatureObjects.map(object=>({name:object.name,userData:object.userData,matrixWorld:object.matrixWorld.toArray(),geometryPosition:Array.from(object.geometry.attributes.position.array),geometryUv:Array.from(object.geometry.attributes.uv.array),geometryPictureUv:Array.from(object.geometry.attributes.pictureUv.array),geometryIndex:Array.from(object.geometry.index.array),atlas:object.material.uniforms.uArtwork.value?.image?.src})),performance:{readyAt,framesRendered,active:raf!==null,calls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,textures:renderer?.info.memory.textures,geometries:renderer?.info.memory.geometries,terrainTriangles:terrain?.geometry.index?.count/3},fadeOpacity:Number(getComputedStyle($('#journey-fade')).opacity),journey:{phase:journeyPhase,vehicle:{type:model===flightModel?'plane':model?'car':null,visible:!!model,screenSize:{width,height}},routeSamples,carClearance,operaClearance}};
}
function pointerPosition(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1)}
function hitMap(e){
 pointerPosition(e);raycaster.setFromCamera(pointer,camera);const ray=raycaster.ray;if(ray.direction.y>=0)return null;
 const point=new THREE.Vector3(),start=Math.max(0,(terrainMaxHeight+.4-ray.origin.y)/ray.direction.y),end=-ray.origin.y/ray.direction.y;
 let low=start,high=end;
 // Find the frontmost surface: simple height iteration can jump to the far
 // side of an exaggerated ridge at this low camera angle.
 for(let i=1;i<=48;i++){const t=start+(end-start)*i/48;ray.at(t,point);if(point.y<=heightAt(...geographic(point))){high=t;break}low=t}
 for(let i=0;i<12;i++){const t=(low+high)/2;ray.at(t,point);if(point.y>heightAt(...geographic(point)))low=t;else high=t}
 ray.at(high,point);const geo=geographic(point),id=regionAt(geo);return id?{lang:langs[id],geo}:null;
}
canvas.addEventListener('pointermove',e=>{
 if(!ready||busy)return;if(performance.now()-lastPointer<35)return;lastPointer=performance.now();const hit=hitMap(e);highlight(hit?.lang);canvas.style.cursor=hit?'pointer':'default';
 wake();
});
canvas.addEventListener('pointerleave',()=>{if(busy)return;pointer.set(0,0);highlight(null);wake()});
canvas.addEventListener('click',e=>{if(!ready||busy)return;const hit=hitMap(e);if(hit)journey(hit.lang,hit.geo)});

function wake(){lastActivity=performance.now();if(renderer&&raf===null&&!document.hidden)raf=requestAnimationFrame(frame)}
function tween(duration,update){return new Promise(resolve=>{tweens.push({start:performance.now(),duration,update,resolve});wake()})}
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
function frame(now){
 raf=null;if(document.hidden)return;
 const delta=Math.min(.12,(now-lastFrame)/1000||.016);lastFrame=now;const damping=1-Math.exp(-delta*12);
 for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i],p=Math.min(1,(now-tw.start)/tw.duration);tw.update(p);if(p===1){tweens.splice(i,1);tw.resolve()}}
 let changing=false;for(let i=0;i<3;i++){hover[i]+=(hoverTarget[i]-hover[i])*damping;if(Math.abs(hoverTarget[i]-hover[i])>.002)changing=true}
 if(terrain)terrain.material.uniforms.uHover.value.set(...hover);
 if(scene?.userData.water)scene.userData.water.material.uniforms.uHover.value.set(...hover);
 const desired=cameraBase;
 if(camera.position.distanceTo(desired)>.005||look.distanceTo(cameraTarget)>.005)changing=true;
 camera.position.lerp(desired,damping);look.lerp(cameraTarget,damping);camera.lookAt(look);
 updateLabels();renderer.render(scene,camera);framesRendered++;
 if(tweens.length||changing||busy||now-lastActivity<400)raf=requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});

function makeWater(aura){
 const geometry=new THREE.PlaneGeometry(1800,1800);geometry.rotateX(-Math.PI/2);
 const b=geography.bounds,atlasBounds=new THREE.Vector4((b.west-13)*2.2,(60-b.north)*4.4,(b.east-b.west)*2.2,(b.north-b.south)*4.4);
 const material=new THREE.ShaderMaterial({uniforms:{uAura:{value:aura},uHover:{value:new THREE.Vector3()},uAtlasBounds:{value:atlasBounds}},vertexShader,fragmentShader:waterFragmentShader});
 const water=new THREE.Mesh(geometry,material);water.position.y=-.05;scene.add(water);
 scene.userData.water=water;
}

function makeTerrain(texture,aura){
 const {geometry,maxHeight}=createLandMeshGeometry({THREE,bounds:geography.bounds,mobile,heightAt,regionAt});
 terrainMaxHeight=maxHeight;
 const material=new THREE.ShaderMaterial({uniforms:{uMask:{value:texture},uAura:{value:aura},uHover:{value:new THREE.Vector3()},uAtlasBounds:{value:scene.userData.water.material.uniforms.uAtlasBounds.value}},vertexShader,fragmentShader,side:THREE.FrontSide});
 terrain=new THREE.Mesh(geometry,material);scene.add(terrain);
}
function addGeography(){addIllustratedGeography({THREE,scene,geography,worldPoint,heightAt,regionAt,mobile})}
function addForests(){addIllustratedVegetation({THREE,scene,worldPoint,heightAt,regionAt,mobile})}
function label(name,geo,className,lang,native){
 const el=document.createElement(lang?'button':'span');el.className=className;el.innerHTML=native?`<span class="label-name">${name}</span><span class="label-native">${native}</span>`:name;
 if(lang){el.type='button';el.dataset.lang=lang;el.setAttribute('aria-label',names[lang]+' — begin your journey');bindLanguage(el)}
 $('#map-labels').append(el);const entry={el,geo,position:worldPoint(geo,.55)};labels.push(entry);return entry;
}
function addLabels(decorations=[]){
 $('#map-labels').removeAttribute('aria-hidden');
 label('Norge',[9.5,64.8],'map-label country-label','no','Norsk ↗');
 label('Polska',[23.2,53.5],'map-label country-label','pl','Polski ↗');
 label('Europe',[6.1,54.1],'map-label country-label','en','English ↗');
 label('Norwegian Sea',[-13,72],'map-label sea-label');
 label('Baltic Sea',[20.5,57.2],'map-label sea-label');
 for(const decoration of decorations)if(decoration.label)label(decoration.name,[decoration.geo[0],decoration.geo[1]-.35],'map-label sea-label creature-label');
}
function updateLabels(){
 if(labelLayoutDirty){
  labelObstacles=[$('.intro'),$('.language-picker'),$('.wordmark'),$('.atlas-caption')].filter(Boolean).map(el=>el.getBoundingClientRect());
  for(const entry of labels){entry.halfWidth=entry.el.offsetWidth/2;entry.halfHeight=entry.el.offsetHeight/2}
  labelLayoutDirty=false;
 }
 const obstacles=busy?[]:labelObstacles;
 for(const entry of labels){
  const p=projectedLabel.copy(entry.position).project(camera),x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
  const {halfWidth,halfHeight}=entry;
  const covered=obstacles.some(rect=>x+halfWidth>rect.left-8&&x-halfWidth<rect.right+8&&y+halfHeight>rect.top-8&&y-halfHeight<rect.bottom+8);
  entry.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
  entry.el.style.visibility=p.z<1&&p.z>0&&!covered&&y>20&&y<innerHeight-20&&(!mobile||x>24&&x<innerWidth-24)?'visible':'hidden';
  entry.el.style.opacity=busy&&!entry.el.classList.contains('is-destination')?'0':'1';
 }
}

function makeVehicles(){
 ({flightModel,carModel,arrival}=createVehicles({THREE,scene}));
 carModel.updateMatrixWorld(true);
 carModel.traverse(object=>{
  if(!object.isMesh||object.material.map||object.userData.vehicleInkContour)return;
  const vertices=object.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++)carVertexProbes.push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld));
 });
}
function overview(){
 if(innerWidth<=760){cameraBase.set(-5,77,110);cameraTarget.set(-5,0,3);camera.fov=44}
 else{cameraBase.set(-14,65,104);cameraTarget.set(-14,0,5);camera.fov=40}
 camera.updateProjectionMatrix();
}
async function cameraTo(position,target,duration=850){const motion=++cameraMotion,from=cameraBase.clone(),fromTarget=cameraTarget.clone();await tween(duration,p=>{if(motion!==cameraMotion)return;p=ease(p);cameraBase.lerpVectors(from,position,p);cameraTarget.lerpVectors(fromTarget,target,p)})}
function status(step,text){$('#journey-step').textContent=step;$('#journey-text').textContent=text}
function clearRoute(){for(const object of[routeLine,routeGlow])if(object){scene.remove(object);object.geometry.dispose();object.material.dispose()}}
function roadPose(point,heading){
 // Support the entire toy, including both wheel tracks and the front bumper.
 // This avoids the old centre-only test that let its nose enter rising terrain.
 let highest=-Infinity;const c=Math.cos(heading),s=Math.sin(heading);
 const sample=(x,z)=>heightAt((point.x+x*c+z*s)/2.2+13,60-(point.z-x*s+z*c)/4.4);
 const pitch=Math.atan2(sample(0,-.5)-sample(0,.5),1),roll=Math.atan2(sample(.4,0)-sample(-.4,0),.8);
 const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,heading,roll,'YXZ'));
 for(const x of[-.53,0,.53])for(const z of[-.85,-.42,0,.42,.85]){
  const offset=new THREE.Vector3(x,0,z).applyQuaternion(rotation);highest=Math.max(highest,heightAt((point.x+offset.x)/2.2+13,60-(point.z+offset.z)/4.4)-offset.y);
 }
 return{height:highest+.065,pitch,roll,rotation};
}
async function travel(coords,vehicle,duration,flight){
 clearRoute();journeyPhase=flight?'flying':'driving';carClearance=flight?null:Infinity;operaClearance=flight?null:Infinity;
 const points=coords.map(p=>worldPoint(p,flight?2.5:.15)),curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),samples=[];
 for(let i=0;i<=320;i++){const t=i/320,p=curve.getPointAt(t);if(flight)p.y+=Math.sin(Math.PI*t)*18;else p.y=heightAt(...geographic(p))+.12;samples.push(p)}
 const path=new THREE.CatmullRomCurve3(samples,false,'centripetal'),geometry=new THREE.BufferGeometry().setFromPoints(samples);
 routeLine=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffdb75,transparent:true,opacity:.95,depthWrite:false}));geometry.setDrawRange(0,0);scene.add(routeLine);
 routeGlow=new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples),new THREE.LineDashedMaterial({color:0x746646,dashSize:.17,gapSize:.17,transparent:true,opacity:.48,depthWrite:false}));routeGlow.computeLineDistances();scene.add(routeGlow);
 const opera=landmarkObjects.find(o=>o.name==='landmark-oslo'),footprint=opera?.userData.footprint;
 // The artwork's contact shadow is translucent scenery, not a solid obstacle.
 const operaBounds=footprint?new THREE.Box3(new THREE.Vector3(opera.position.x+footprint.minX,opera.position.y,opera.position.z+footprint.minZ),new THREE.Vector3(opera.position.x+footprint.maxX,opera.position.y+2.3,opera.position.z+footprint.maxZ)):null;
 routeSamples=samples.map((point,i)=>{
  const next=samples[Math.min(320,i+1)],prev=samples[Math.max(0,i-1)],heading=Math.atan2(-(next.x-prev.x),-(next.z-prev.z)),height=heightAt(...geographic(point)),pose=flight?null:roadPose(point,heading),supported=flight?point.y:pose.height;
  if(!flight){
   // Audit the actual solid vehicle vertices independently of its support grid.
   // Translucent contact shadows are excluded from physical ground clearance.
   for(const local of carVertexProbes){const vertex=local.clone().multiplyScalar(.65).applyQuaternion(pose.rotation);vertex.x+=point.x;vertex.y+=supported;vertex.z+=point.z;carClearance=Math.min(carClearance,vertex.y-heightAt(...geographic(vertex)))}
   if(operaBounds)operaClearance=Math.min(operaClearance,operaBounds.distanceToPoint(new THREE.Vector3(point.x,supported,point.z))-.95);
  }
  return{position:[point.x,supported,point.z],terrainHeight:height,region:regionAt(geographic(point))};
 });
 const model=vehicle==='plane'?flightModel:carModel;let previousHeading=0;
 const update=p=>{const t=ease(p),point=path.getPoint(t),next=path.getPoint(Math.min(1,t+.002)),prev=path.getPoint(Math.max(0,t-.002)),heading=Math.atan2(-(next.x-prev.x),-(next.z-prev.z));
  const pose=flight?null:roadPose(point,heading);if(pose)point.y=pose.height;
  model.position.copy(point);model.rotation.set(pose?.pitch||0,heading,pose?.roll||0,'YXZ');model.scale.setScalar(flight?Math.max(.95,camera.position.distanceTo(point)*.013):.65);
  const turn=Math.atan2(Math.sin(heading-previousHeading),Math.cos(heading-previousHeading));animateVehicle(model,{time:performance.now()/1000,progress:t,turn,speed:p<.96?1:.2});previousHeading=heading;
  if(!flight){cameraTarget.copy(point).add(new THREE.Vector3(1,0,-2));cameraBase.copy(point).add(new THREE.Vector3(5,19,27))}
  geometry.setDrawRange(0,Math.max(2,Math.floor(t*320)+1));
 };
 update(0);model.visible=true;await tween(duration,update);
 model.visible=false;
}
async function arrive(geo){journeyPhase='arriving';const point=worldPoint(geo,.35);arrival.position.copy(point);await tween(650,p=>{arrival.scale.setScalar(1+p*3);arrival.material.opacity=.85*(1-p)})}
async function zoomToRoad(geo){
 journeyPhase='zooming';document.body.classList.add('is-zooming');const target=worldPoint(geo),fade=$('#journey-fade');
 fade.style.transition='none';fade.style.opacity='.42';
 const zoom=cameraTo(target.clone().add(new THREE.Vector3(5,19,27)),target.clone().add(new THREE.Vector3(1,0,-2)),1000);
 // Give the veil a painted frame before fading it away, even on a slow GPU.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 await Promise.all([zoom,tween(650,p=>{fade.style.opacity=String(.42*(1-ease(p)))})]);
 document.body.classList.remove('is-zooming');fade.style.opacity='0';fade.style.transition='';
}
async function journey(lang,start){
 if(busy)return;selected=lang;if(reduced||!ready){go();return}
 highlight(lang);busy=true;document.body.classList.add('is-traveling');$$('.language-option').forEach(el=>el.disabled=true);$('#journey-status').classList.add('is-visible');
 try{
 if(lang==='no'){
  status('A little road trip','Driving to Høvik.');
  const road=routeNorway(start);await zoomToRoad(road.departure);
  await travel(road,'car',3600,false);await arrive(OSLO_FORECOURT);
 }else{
  status('Up, up and away','Flying to Sandefjord, Norway.');
  const mid=[(start[0]+cities.torp[0])/2-2,(start[1]+cities.torp[1])/2];
  await travel([start,mid,cities.torp],'plane',3300,true);
  status('Nearly there','Landed. Next stop, Oslo.');
  await zoomToRoad(cities.torp);
  await travel(routeTorpToOslo(),'car',2400,false);await arrive(OSLO_FORECOURT);
 }
 status('You made it!',names[lang]+'. Welcome.');await tween(500,()=>{});go();
 }catch(error){console.error('Journey failed',error);go()}
}

async function init(){
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.4:1.6));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x96bfb2);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,600);
  const [geoResponse,heightResponse,texture,aura]=await Promise.all([fetch(new URL('./geography.json',import.meta.url)),fetch(new URL('./terrain.i16',import.meta.url)),new THREE.TextureLoader().loadAsync(new URL('./regions.png',import.meta.url).href),new THREE.TextureLoader().loadAsync(new URL('./aura.png',import.meta.url).href)]);
  if(!geoResponse.ok||!heightResponse.ok)throw new Error('Terrain data unavailable');
  geography=await geoResponse.json();elevations=new Int16Array(await heightResponse.arrayBuffer());texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  aura.minFilter=THREE.LinearFilter;aura.magFilter=THREE.LinearFilter;aura.generateMipmaps=false;
  const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=texture.image.width;const ctx=bitmap.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0);maskWidth=bitmap.width;maskPixels=ctx.getImageData(0,0,maskWidth,maskWidth).data;
  makeWater(aura);
  scene.add(new THREE.HemisphereLight(0xfff4d5,0x416f6a,2.2));const sun=new THREE.DirectionalLight(0xffe4ad,2.4);sun.position.set(-35,70,40);scene.add(sun);const sky=new THREE.DirectionalLight(0xc5e6f0,.7);sky.position.set(40,35,-30);scene.add(sky);
  overview();camera.position.copy(cameraBase);look.copy(cameraTarget);camera.lookAt(look);camera.updateMatrixWorld(true);
  makeTerrain(texture,aura);addGeography();addForests();
  const scenery=addMapScenery({THREE,scene,worldPoint,heightAt,regionAt,mobile});scene.userData.mapScenery=scenery.group?.userData||scenery;
  const landmarks=addLandmarks({THREE,scene,worldPoint,mobile,heightAt,regionAt,camera}),creatures=addSeaCreatures({THREE,scene,mobile,regionAt,camera});
  landmarkObjects=landmarks.objects;creatureObjects=creatures.objects;
  const compass=createIllustration({THREE,scene,url:new URL('./illustrations/compass.svg',import.meta.url),position:worldPoint([-16,58.5],.1),width:7,height:7.9});
  await Promise.all([landmarks.ready,creatures.ready,compass.ready,document.fonts.ready]);

  canvas.dataset.landmarks=String(landmarks.count);canvas.dataset.creatures=String(creatures.count);canvas.dataset.artwork='illuminated-atlas';addLabels(creatures.decorations);makeVehicles();overview();camera.position.copy(cameraBase);look.copy(cameraTarget);camera.lookAt(look);
  ready=true;readyAt=performance.now();canvas.dataset.renderer='webgl';canvas.dataset.quality=mobile?'mobile':'desktop';document.body.classList.add('has-webgl','is-ready');$('#map-loading').hidden=true;
  $$('#terrain-fallback [tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
  if(!reduced){const final=cameraBase.clone();cameraBase.add(new THREE.Vector3(0,8,8));camera.position.copy(cameraBase);cameraTo(final,cameraTarget.clone(),1800)}wake();
 }catch(error){console.warn('Using static map fallback:',error.message);renderer?.dispose();renderer=null;canvas.hidden=true;$('#map-loading').hidden=true;document.body.classList.add('is-ready','no-webgl');$('#map-labels').hidden=true}
}
addEventListener('resize',()=>{labelLayoutDirty=true;if(!renderer)return;camera.aspect=innerWidth/innerHeight;if(!busy)overview();else camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);wake()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;document.body.classList.remove('has-webgl');canvas.hidden=true;$('#map-labels').hidden=true});
init();
