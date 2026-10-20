import * as THREE from './vendor/three.module.min.js';
import {addLandmarks} from './landmarks.js';
import {addSeaCreatures} from './sea-creatures.js';
import {createIllustration} from './illustrations.js';
import {createVehicles,animateVehicle,routeNorway,routeTorpToOslo,OSLO_FORECOURT} from './journey.js';

const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),canvas=$('#terrain-canvas'),tooltip=$('#map-tooltip');
const names={en:'English',pl:'Polski',no:'Norsk'},ids={en:1,pl:2,no:3},langs=['','en','pl','no'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=matchMedia('(max-width:760px)').matches;
let busy=false,selected=null,ready=false,renderer,scene,camera,terrain,maskPixels,maskWidth,elevations,geography;
let raf=null,lastActivity=0,lastPointer=0,lastFrame=0,cameraMotion=0;
const tweens=[],labels=[],hover=[0,0,0],hoverTarget=[0,0,0],pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
const cameraBase=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),look=new THREE.Vector3();
const cities={oslo:[10.7522,59.9139],torp:[10.2586,59.1867],hovik:[10.5817,59.9],pl:[19.1,52.1],en:[-.2,53.6],no:[8.7,62.1]};
let flightModel,carModel,routeLine,routeGlow,arrival;
let terrainMaxHeight=0,landmarkObjects=[],journeyPhase='',routeSamples=[],carClearance=null,operaClearance=null;
const carVertexProbes=[];
function go(){location.assign(new URL('../'+selected+'/',import.meta.url))}
$('#skip').addEventListener('click',go);

function highlight(lang){if(busy)return;$$('[data-lang]').forEach(el=>el.classList.toggle('is-active',el.dataset.lang===lang));for(let i=0;i<3;i++)hoverTarget[i]=ids[lang]===i+1?1:0;wake()}
function bindLanguage(el){el.addEventListener('pointerenter',()=>highlight(el.dataset.lang));el.addEventListener('pointerleave',()=>highlight(null));el.addEventListener('focus',()=>highlight(el.dataset.lang));el.addEventListener('blur',()=>highlight(null));el.addEventListener('click',e=>{e.stopPropagation();journey(el.dataset.lang,cities[el.dataset.lang])});if(el.tagName.toLowerCase()==='path')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();journey(el.dataset.lang,cities[el.dataset.lang])}})}
$$('[data-lang]').forEach(bindLanguage);

function heightAt(lon,lat){
 if(!elevations)return .25;
 const x=THREE.MathUtils.clamp((lon+12)/50*400,0,399.999),y=THREE.MathUtils.clamp((73-lat)/26*400,0,399.999),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
 const a=elevations[j*401+i]*(1-fx)+elevations[j*401+i+1]*fx,b=elevations[(j+1)*401+i]*(1-fx)+elevations[(j+1)*401+i+1]*fx;
 const feather=THREE.MathUtils.smoothstep(lon,-12,-9)*(1-THREE.MathUtils.smoothstep(lon,35,38))*THREE.MathUtils.smoothstep(lat,47,49)*(1-THREE.MathUtils.smoothstep(lat,71,73));
 return .22+Math.max(0,a*(1-fy)+b*fy)/1000*3.2*feather;
}
function worldPoint([lon,lat],lift=0){return new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4)}
function geographic(point){return[point.x/2.2+13,60-point.z/4.4]}
function regionAt([lon,lat]){const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*maskWidth),y=Math.floor((b.north-lat)/(b.north-b.south)*maskWidth);return x>=0&&x<maskWidth&&y>=0&&y<maskWidth?Math.round(maskPixels[(y*maskWidth+x)*4]/85):0}
export function projectToScreen(lon,lat){if(!camera)return null;const p=worldPoint([lon,lat],.3).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}
export function inspectScene(){
 const model=flightModel?.visible?flightModel:carModel?.visible?carModel:null;
 let width=0,height=0;
 if(model){model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),points=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));width=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*innerWidth/2;height=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*innerHeight/2}
 return{camera:{position:camera?.position.toArray(),target:look.toArray()},hover:[...hover],terrainMaxHeight,landmarkCount:landmarkObjects.length,creatureCount:Number(canvas.dataset.creatures),artwork:canvas.dataset.artwork,fadeOpacity:Number(getComputedStyle($('#journey-fade')).opacity),journey:{phase:journeyPhase,vehicle:{type:model===flightModel?'plane':model?'car':null,visible:!!model,screenSize:{width,height}},routeSamples,carClearance,operaClearance}};
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
 if(hit&&e.pointerType==='mouse'){tooltip.firstElementChild.textContent=names[hit.lang]+' · Begin your journey';tooltip.style.transform=`translate(${Math.max(8,Math.min(e.clientX+18,innerWidth-250))}px,${Math.max(8,e.clientY-48)}px)`;tooltip.classList.add('visible')}else tooltip.classList.remove('visible');wake();
});
canvas.addEventListener('pointerleave',()=>{if(busy)return;pointer.set(0,0);highlight(null);tooltip.classList.remove('visible');wake()});
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
 updateLabels();renderer.render(scene,camera);
 if(tweens.length||changing||busy||now-lastActivity<400)raf=requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});

const vertexShader=`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;varying float vDepth;
void main(){vUv=uv;vNormal=normal;vWorld=position;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
const paperNoise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float wash(vec2 p){return noise(p)*.58+noise(p*2.03)*.28+noise(p*4.13)*.14;}`;
const auraShader=`
uniform sampler2D uAura;uniform vec3 uHover;
uniform vec4 uAtlasBounds;
vec2 atlasUv(vec3 world){return vec2((world.x-uAtlasBounds.x)/uAtlasBounds.z,1.-(world.z-uAtlasBounds.y)/uAtlasBounds.w);}
vec3 countryLight(vec3 color,vec2 uv){
if(dot(uHover,vec3(1.))<.001)return color;
vec3 distances=(texture2D(uAura,uv).rgb*2.-1.)*6.;
vec3 edge=exp(-abs(distances)*1.6),outer=exp(-abs(distances)*.7);
float rim=dot(edge,uHover),halo=dot(outer,uHover);
color=mix(color,vec3(1.,.92,.39),clamp(rim*.72,0.,.8));
color+=vec3(.15,.12,.015)*halo;
return color;
}`;
const fragmentShader=`uniform sampler2D uMask;varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;varying float vDepth;
${auraShader}
${paperNoise}
void main(){float region=texture2D(uMask,vUv).r;if(region<.13)discard;
float id=floor(region*3.+.5),h=vWorld.y;vec3 n=normalize(vNormal);
vec2 p=vWorld.xz;
float pigment=wash(p*.19),flecks=noise(p*7.);
vec3 color=mix(vec3(.63,.67,.46),vec3(.77,.75,.52),pigment);
color=mix(color,vec3(.49,.59,.43),smoothstep(.5,.79,wash(p*.37+35.))*.45);
color=mix(color,vec3(.57,.62,.43),smoothstep(.6,2.5,h)*.42);
color=mix(color,vec3(.83,.81,.65),smoothstep(2.,5.,h)*.8);
color=mix(color,vec3(.94,.91,.78),smoothstep(4.8,6.1,h)*.82);
float light=.64+max(dot(n,normalize(vec3(-.65,.7,.34))),0.)*.48;color*=light;
float contours=1.-smoothstep(.025,.08,abs(fract(h*2.8)-.5));
color-=vec3(.14,.15,.09)*contours*smoothstep(.7,2.,h)*.2;
float grain=hash(gl_FragCoord.xy)-.5;color+=(grain*.034+(flecks-.5)*.024);
float selection=id<1.5?uHover.x:(id<2.5?uHover.y:uHover.z);
color=mix(color,vec3(.91,.81,.46),selection*.24);
color=countryLight(color,vUv);
gl_FragColor=vec4(color,1.);}`;

function makeWater(aura){
 const geometry=new THREE.PlaneGeometry(1800,1800);geometry.rotateX(-Math.PI/2);
 const b=geography.bounds,atlasBounds=new THREE.Vector4((b.west-13)*2.2,(60-b.north)*4.4,(b.east-b.west)*2.2,(b.north-b.south)*4.4);
 const material=new THREE.ShaderMaterial({uniforms:{uAura:{value:aura},uHover:{value:new THREE.Vector3()},uAtlasBounds:{value:atlasBounds}},vertexShader,fragmentShader:`varying vec2 vUv;varying vec3 vWorld;${paperNoise}${auraShader}
 void main(){vec2 p=vWorld.xz;float pigment=wash(p*.055);vec3 color=mix(vec3(.61,.69,.65),vec3(.69,.76,.70),pigment);
 float grain=hash(gl_FragCoord.xy)-.5;color+=grain*.027+(noise(p*6.)-.5)*.014;
 // Very fine engraved currents, broken into short, softly bowed strokes.
 vec2 cell=floor(p/vec2(5.8,3.2)),q=fract(p/vec2(5.8,3.2));float curve=.48+.04*sin(q.x*6.28);
 float ink=(1.-smoothstep(.005,.018,abs(q.y-curve)))*smoothstep(.15,.22,q.x)*(1.-smoothstep(.55,.72,q.x))*step(.3,hash(cell));
 color-=ink*vec3(.08,.09,.07)*.38;color=countryLight(color,atlasUv(vWorld));gl_FragColor=vec4(color,1.);}`});
 const water=new THREE.Mesh(geometry,material);water.position.y=-.05;scene.add(water);
 scene.userData.water=water;
}

function makeTerrain(texture,aura){
 const b=geography.bounds,nx=mobile?240:520,nz=mobile?260:520,geometry=new THREE.PlaneGeometry((b.east-b.west)*2.2,(b.north-b.south)*4.4,nx,nz);geometry.rotateX(-Math.PI/2);geometry.translate(((b.east+b.west)/2-13)*2.2,0,(60-(b.north+b.south)/2)*4.4);
 const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const lon=pos.getX(i)/2.2+13,lat=60-pos.getZ(i)/4.4,h=heightAt(lon,lat);pos.setY(i,h);terrainMaxHeight=Math.max(terrainMaxHeight,h)}geometry.computeVertexNormals();
 const material=new THREE.ShaderMaterial({uniforms:{uMask:{value:texture},uAura:{value:aura},uHover:{value:new THREE.Vector3()},uAtlasBounds:{value:scene.userData.water.material.uniforms.uAtlasBounds.value}},vertexShader,fragmentShader,transparent:true,side:THREE.DoubleSide});
 terrain=new THREE.Mesh(geometry,material);scene.add(terrain);
}
function lineSegments(lines,color,opacity,lift=.08){const positions=[];for(const line of lines)for(let i=1;i<line.length;i++){const a=worldPoint(line[i-1],lift),b=worldPoint(line[i],lift);if(a.distanceTo(b)>8)continue;positions.push(...a,...b)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});const object=new THREE.LineSegments(geometry,material);scene.add(object);return object}
function addGeography(){
 lineSegments(geography.coasts,0x4c6150,.46,.055);
 lineSegments(geography.rivers,0x4a7e77,.64,.11);
 lineSegments(geography.outlines.no,0x59654b,.48,.08);lineSegments(geography.outlines.pl,0x806c45,.46,.07);
 const glowTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff1bd');g.addColorStop(.12,'#e9c76b');g.addColorStop(.3,'#c79e4f60');g.addColorStop(1,'#b1813800');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
 const places=[cities.oslo,cities.pl,[12.57,55.68],[18.07,59.33],[24.94,60.17],[13.4,52.52],[-.13,51.5],[4.9,52.37],[5.32,60.39],[10.4,63.43],[21.01,52.23],[7.1,50.7],[11.97,57.71],[18.65,54.35]];
 for(const place of places){const material=new THREE.SpriteMaterial({map:glowTexture,color:0xffe6a3,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending});const sprite=new THREE.Sprite(material);sprite.position.copy(worldPoint(place,.13));sprite.scale.set(1.1,1.1,1);scene.add(sprite)}
}
function addForests(){
 const groves=[[6.2,61.6],[7.8,60.4],[12.8,62.5],[14.1,60.8],[16.2,63.5],[19.2,65.4],[24.3,64.2],[26,61.2],[22.5,53.2],[15.4,54],[-4.4,56.7],[-7.4,53.7]];
 const trunks=[],crowns=[],geometry=new THREE.ConeGeometry(.25,.8,5),trunkGeometry=new THREE.CylinderGeometry(.045,.06,.24,5);
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();let seed=218;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(const center of groves)for(let i=0;i<(mobile?5:10);i++){
  const geo=[center[0]+(random()-.5)*1.5,center[1]+(random()-.5)*.6];if(!regionAt(geo)||heightAt(...geo)>4.2)continue;
  if(geo[0]>9&&geo[0]<12&&geo[1]<64)continue;
  const p=worldPoint(geo,.04),size=.65+random()*.65;scale.setScalar(size);matrix.compose(p.clone().add(new THREE.Vector3(0,.12*size,0)),rotation,scale);trunks.push(matrix.clone());matrix.compose(p.clone().add(new THREE.Vector3(0,.55*size,0)),rotation,scale);crowns.push(matrix.clone());
 }
 const trunk=new THREE.InstancedMesh(trunkGeometry,new THREE.MeshStandardMaterial({color:0x766b4e,roughness:1}),trunks.length),crown=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:0x57725b,roughness:1,flatShading:true}),crowns.length);
 trunks.forEach((m,i)=>trunk.setMatrixAt(i,m));crowns.forEach((m,i)=>crown.setMatrixAt(i,m));scene.add(trunk,crown);
}
function label(name,geo,className,lang,native){
 const el=document.createElement(lang?'button':'span');el.className=className;el.innerHTML=native?`<span class="label-name">${name}</span><span class="label-native">${native}</span>`:name;
 if(lang){el.type='button';el.dataset.lang=lang;el.setAttribute('aria-label',names[lang]+' — begin your journey');bindLanguage(el)}
 $('#map-labels').append(el);const entry={el,geo,position:worldPoint(geo,.55)};labels.push(entry);return entry;
}
function addLabels(decorations=[]){
 $('#map-labels').removeAttribute('aria-hidden');
 label('Norge',[9.4,64.0],'map-label country-label','no','Norsk ↗');
 label('Polska',[23.2,53.5],'map-label country-label','pl','Polski ↗');
 label('Europe',[6.1,54.1],'map-label country-label','en','English ↗');
 label('Oslo',cities.oslo,'city-label is-destination');
 label('Stockholm',[18.07,59.33],'city-label secondary-label');
 label('København',[12.57,55.68],'city-label secondary-label');
 label('Gdańsk',[18.65,54.35],'city-label secondary-label');
 label('London',[-.13,51.5],'city-label secondary-label');
 label('Norwegian Sea',[-3.8,67.8],'map-label sea-label');
 label('Baltic Sea',[20.5,57.2],'map-label sea-label');
 for(const decoration of decorations)if(decoration.label)label(decoration.name,[decoration.geo[0],decoration.geo[1]-.35],'map-label sea-label creature-label');
}
function updateLabels(){
 const obstacles=busy?[]:[$('.intro'),$('.language-picker'),$('.wordmark')].map(el=>el.getBoundingClientRect());
 for(const entry of labels){
  const p=entry.position.clone().project(camera),x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
  const halfWidth=entry.el.offsetWidth/2,halfHeight=entry.el.offsetHeight/2;
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
  if(!object.isMesh||object.material.map)return;
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
 highlight(lang);busy=true;document.body.classList.add('is-traveling');$$('.language-option').forEach(el=>el.disabled=true);$('#journey-status').classList.add('is-visible');tooltip.classList.remove('visible');
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
  renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.4:1.6));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0xa7b7a9);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,600);
  const [geoResponse,heightResponse,texture,aura]=await Promise.all([fetch(new URL('./geography.json',import.meta.url)),fetch(new URL('./terrain.i16',import.meta.url)),new THREE.TextureLoader().loadAsync(new URL('./regions.png',import.meta.url).href),new THREE.TextureLoader().loadAsync(new URL('./aura.png',import.meta.url).href)]);
  if(!geoResponse.ok||!heightResponse.ok)throw new Error('Terrain data unavailable');
  geography=await geoResponse.json();elevations=new Int16Array(await heightResponse.arrayBuffer());texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  aura.minFilter=THREE.LinearFilter;aura.magFilter=THREE.LinearFilter;aura.generateMipmaps=false;
  const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=texture.image.width;const ctx=bitmap.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0);maskWidth=bitmap.width;maskPixels=ctx.getImageData(0,0,maskWidth,maskWidth).data;
  makeWater(aura);
  scene.add(new THREE.HemisphereLight(0xfff4d5,0x416f6a,2.2));const sun=new THREE.DirectionalLight(0xffe4ad,2.4);sun.position.set(-35,70,40);scene.add(sun);const sky=new THREE.DirectionalLight(0xc5e6f0,.7);sky.position.set(40,35,-30);scene.add(sky);
  makeTerrain(texture,aura);addGeography();addForests();
  const landmarks=addLandmarks({THREE,scene,worldPoint,mobile}),creatures=addSeaCreatures({THREE,scene,mobile});
  landmarkObjects=landmarks.objects;
  const compass=createIllustration({THREE,scene,url:new URL('./illustrations/compass.svg',import.meta.url),position:worldPoint([-16,58.5],.1),width:7,height:7.9});
  await Promise.all([landmarks.ready,creatures.ready,compass.ready]);
  canvas.dataset.landmarks=String(landmarks.count);canvas.dataset.creatures=String(creatures.count);canvas.dataset.artwork='sculpted-paper';addLabels(creatures.decorations);makeVehicles();overview();camera.position.copy(cameraBase);look.copy(cameraTarget);camera.lookAt(look);
  ready=true;canvas.dataset.renderer='webgl';canvas.dataset.quality=mobile?'mobile':'desktop';document.body.classList.add('has-webgl','is-ready');$('#map-loading').hidden=true;
  $$('#terrain-fallback [tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
  if(!reduced){const final=cameraBase.clone();cameraBase.add(new THREE.Vector3(0,8,8));camera.position.copy(cameraBase);cameraTo(final,cameraTarget.clone(),1800)}wake();
 }catch(error){console.warn('Using static map fallback:',error.message);renderer?.dispose();renderer=null;canvas.hidden=true;$('#map-loading').hidden=true;document.body.classList.add('is-ready','no-webgl');$('#map-labels').hidden=true}
}
addEventListener('resize',()=>{if(!renderer)return;camera.aspect=innerWidth/innerHeight;if(!busy)overview();else camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);wake()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;document.body.classList.remove('has-webgl');canvas.hidden=true;$('#map-labels').hidden=true});
init();
