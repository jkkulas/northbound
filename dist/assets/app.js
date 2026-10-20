import * as THREE from './vendor/three.module.min.js';

const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),canvas=$('#terrain-canvas'),tooltip=$('#map-tooltip');
const names={en:'English',pl:'Polski',no:'Norsk'},ids={en:1,pl:2,no:3},langs=['','en','pl','no'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=matchMedia('(max-width:760px)').matches;
let busy=false,selected=null,ready=false,overhead=false,renderer,scene,camera,terrain,maskPixels,maskWidth,elevations,geography;
let raf=null,lastActivity=0,lastPointer=0;
const tweens=[],labels=[],hover=[0,0,0],hoverTarget=[0,0,0],pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
const cameraBase=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),look=new THREE.Vector3();
const cities={oslo:[10.7522,59.9139],torp:[10.2586,59.1867],hovik:[10.5817,59.9],pl:[19.1,52.1],en:[-.2,53.6],no:[8.7,62.1]};
let flightModel,carModel,routeLine,routeGlow,arrival;
function go(){location.assign(new URL('../'+selected+'/',import.meta.url))}
$('#skip').addEventListener('click',go);

function highlight(lang){if(busy)return;$$('[data-lang]').forEach(el=>el.classList.toggle('is-active',el.dataset.lang===lang));for(let i=0;i<3;i++)hoverTarget[i]=ids[lang]===i+1?1:0;wake()}
function bindLanguage(el){el.addEventListener('pointerenter',()=>highlight(el.dataset.lang));el.addEventListener('pointerleave',()=>highlight(null));el.addEventListener('focus',()=>highlight(el.dataset.lang));el.addEventListener('blur',()=>highlight(null));el.addEventListener('click',e=>{e.stopPropagation();journey(el.dataset.lang,cities[el.dataset.lang])});if(el.tagName.toLowerCase()==='path')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();journey(el.dataset.lang,cities[el.dataset.lang])}})}
$$('[data-lang]').forEach(bindLanguage);

function heightAt(lon,lat){
 if(!elevations)return .25;
 const x=THREE.MathUtils.clamp((lon+12)/50*400,0,399.999),y=THREE.MathUtils.clamp((73-lat)/26*400,0,399.999),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
 const a=elevations[j*401+i]*(1-fx)+elevations[j*401+i+1]*fx,b=elevations[(j+1)*401+i]*(1-fx)+elevations[(j+1)*401+i+1]*fx;
 return .22+Math.max(0,a*(1-fy)+b*fy)/1000*2.8;
}
function worldPoint([lon,lat],lift=0){return new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4)}
function geographic(point){return[point.x/2.2+13,60-point.z/4.4]}
function regionAt([lon,lat]){const x=Math.floor((lon+12)/50*maskWidth),y=Math.floor((73-lat)/26*maskWidth);return x>=0&&x<maskWidth&&y>=0&&y<maskWidth?Math.round(maskPixels[(y*maskWidth+x)*4]/85):0}
export function projectToScreen(lon,lat){if(!camera)return null;const p=worldPoint([lon,lat],.3).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}
function pointerPosition(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1)}
function hitMap(e){
 pointerPosition(e);raycaster.setFromCamera(pointer,camera);const ray=raycaster.ray;if(ray.direction.y>=0)return null;
 let t=-ray.origin.y/ray.direction.y,point;
 for(let i=0;i<7;i++){point=ray.at(t,new THREE.Vector3());const geo=geographic(point);t=(heightAt(...geo)-ray.origin.y)/ray.direction.y}
 point=ray.at(t,new THREE.Vector3());const geo=geographic(point),id=regionAt(geo);return id?{lang:langs[id],geo}:null;
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
 for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i],p=Math.min(1,(now-tw.start)/tw.duration);tw.update(p);if(p===1){tweens.splice(i,1);tw.resolve()}}
 let changing=false;for(let i=0;i<3;i++){hover[i]+=(hoverTarget[i]-hover[i])*.13;if(Math.abs(hoverTarget[i]-hover[i])>.002)changing=true}
 if(terrain)terrain.material.uniforms.uHover.value.set(...hover);
 const parallax=!busy&&!reduced&&!mobile?1:0;
 const desired=cameraBase.clone().add(new THREE.Vector3(pointer.x*.85*parallax,pointer.y*.35*parallax,0));
 if(camera.position.distanceTo(desired)>.005||look.distanceTo(cameraTarget)>.005)changing=true;
 camera.position.lerp(desired,.11);look.lerp(cameraTarget,.11);camera.lookAt(look);
 updateLabels();renderer.render(scene,camera);
 if(tweens.length||changing||busy||now-lastActivity<400)raf=requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});

const vertexShader=`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;varying float vDepth;
void main(){vUv=uv;vNormal=normal;vWorld=position;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
const fragmentShader=`uniform sampler2D uMask;uniform vec3 uHover;varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;varying float vDepth;
void main(){float region=texture2D(uMask,vUv).r;if(region<.13)discard;
float id=floor(region*3.+.5);float h=vWorld.y;vec3 n=normalize(vNormal);
float light=.38+max(dot(n,normalize(vec3(-.65,.8,.32))),0.)*.88;
vec3 low=vec3(.115,.18,.245),high=vec3(.49,.60,.72);
vec3 color=mix(low,high,pow(clamp((h-.22)/7.,0.,1.),.6));
color=mix(color,vec3(.73,.82,.91),smoothstep(5.2,7.6,h)*.7);
float noise=sin(vWorld.x*3.7+sin(vWorld.z*4.1))*sin(vWorld.z*5.3+cos(vWorld.x*2.7));color+=noise*.009;
color*=light;
float selection=id<1.5?uHover.x:(id<2.5?uHover.y:uHover.z);
color=mix(color,color*.82+vec3(.055,.29,.50),selection*.78);
float contour=1.-smoothstep(.01,.05,abs(fract(h*2.3)-.5));color+=vec3(.03,.065,.095)*contour*smoothstep(.7,2.,h)*.35;
float fog=smoothstep(150.,245.,vDepth);color=mix(color,vec3(.015,.03,.055),fog*.85);
float edge=smoothstep(0.,.028,vUv.x)*smoothstep(0.,.028,1.-vUv.x)*smoothstep(0.,.055,vUv.y)*smoothstep(0.,.055,1.-vUv.y);
gl_FragColor=vec4(color,edge);}`;

function makeTerrain(texture){
 const nx=mobile?160:320,nz=mobile?190:380,geometry=new THREE.PlaneGeometry(110,114.4,nx,nz);geometry.rotateX(-Math.PI/2);
 const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const lon=pos.getX(i)/2.2+13,lat=60-pos.getZ(i)/4.4;pos.setY(i,heightAt(lon,lat))}geometry.computeVertexNormals();
 const material=new THREE.ShaderMaterial({uniforms:{uMask:{value:texture},uHover:{value:new THREE.Vector3()}},vertexShader,fragmentShader,transparent:true,side:THREE.DoubleSide});
 terrain=new THREE.Mesh(geometry,material);scene.add(terrain);
}
function lineSegments(lines,color,opacity,lift=.08){const positions=[];for(const line of lines)for(let i=1;i<line.length;i++){const a=worldPoint(line[i-1],lift),b=worldPoint(line[i],lift);if(a.distanceTo(b)>8)continue;positions.push(...a,...b)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});const object=new THREE.LineSegments(geometry,material);scene.add(object);return object}
function addGeography(){
 lineSegments(geography.coasts,0x5796b9,.3,.055);
 lineSegments(geography.rivers,0x4a9ad3,.33,.1);
 lineSegments(geography.outlines.no,0x8bc5e6,.33,.08);lineSegments(geography.outlines.pl,0x7aa5c9,.25,.07);
 const glowTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#b4e9ff');g.addColorStop(.12,'#52acff');g.addColorStop(.3,'#217add80');g.addColorStop(1,'#1266c800');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
 const places=[cities.oslo,cities.pl,[12.57,55.68],[18.07,59.33],[24.94,60.17],[13.4,52.52],[-.13,51.5],[4.9,52.37],[5.32,60.39],[10.4,63.43],[21.01,52.23],[7.1,50.7],[11.97,57.71],[18.65,54.35]];
 for(const place of places){const material=new THREE.SpriteMaterial({map:glowTexture,color:0x9edcff,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending});const sprite=new THREE.Sprite(material);sprite.position.copy(worldPoint(place,.13));sprite.scale.set(1.25,1.25,1);scene.add(sprite)}
}
function label(name,geo,className,lang,native){
 const el=document.createElement(lang?'button':'span');el.className=className;el.innerHTML=native?`<span class="label-name">${name}</span><span class="label-native">${native}</span>`:name;
 if(lang){el.type='button';el.dataset.lang=lang;el.setAttribute('aria-label',names[lang]+' — begin your journey');bindLanguage(el)}
 $('#map-labels').append(el);const entry={el,geo,position:worldPoint(geo,.55)};labels.push(entry);return entry;
}
function addLabels(){
 $('#map-labels').removeAttribute('aria-hidden');
 label('NORGE',[9.4,64.0],'map-label country-label','no','Norsk ↗');
 label('POLSKA',[19,52.3],'map-label country-label','pl','Polski ↗');
 label('EUROPE',[2.9,53.7],'map-label country-label','en','English ↗');
 label('Oslo',cities.oslo,'city-label is-destination');
 label('Stockholm',[18.07,59.33],'city-label secondary-label');
 label('København',[12.57,55.68],'city-label secondary-label');
 label('NORWEGIAN SEA',[-2.5,66.0],'map-label sea-label');
 label('BALTIC SEA',[20.5,57.0],'map-label sea-label');
}
function updateLabels(){const hero=mobile&&!busy?$('.intro').getBoundingClientRect():null;for(const entry of labels){const p=entry.position.clone().project(camera),x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2,covered=hero&&x>hero.left-15&&x<hero.right+15&&y>hero.top-20&&y<hero.bottom+20;entry.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;entry.el.style.visibility=p.z<1&&p.z>0&&!covered&&(!mobile||x>24&&x<innerWidth-24)?'visible':'hidden';entry.el.style.opacity=busy&&!entry.el.classList.contains('is-destination')?'0':'1'}}

function makeVehicles(){
 flightModel=new THREE.Group();const shape=new THREE.Shape();const outline=[[0,1.7],[.22,.3],[1.6,-.65],[1.6,-.83],[.22,-.3],[.18,-1.3],[.65,-1.65],[.65,-1.8],[0,-1.58],[-.65,-1.8],[-.65,-1.65],[-.18,-1.3],[-.22,-.3],[-1.6,-.83],[-1.6,-.65],[-.22,.3]];outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const plane=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xe9f8ff,side:THREE.DoubleSide,depthTest:false}));plane.rotation.x=-Math.PI/2;flightModel.add(plane);flightModel.visible=false;scene.add(flightModel);
 carModel=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.48,.22,.95),new THREE.MeshBasicMaterial({color:0xd8f0ff,transparent:true,depthTest:false,depthWrite:false}));body.position.y=.15;body.renderOrder=20;carModel.add(body);const roof=new THREE.Mesh(new THREE.BoxGeometry(.39,.18,.4),new THREE.MeshBasicMaterial({color:0x5ca6db,transparent:true,depthTest:false,depthWrite:false}));roof.position.y=.33;roof.renderOrder=21;carModel.add(roof);carModel.visible=false;scene.add(carModel);
 arrival=new THREE.Mesh(new THREE.RingGeometry(.3,.36,48),new THREE.MeshBasicMaterial({color:0x98dcff,transparent:true,opacity:0,side:THREE.DoubleSide,depthTest:false}));arrival.rotation.x=-Math.PI/2;scene.add(arrival);
}
function overview(){
 if(mobile){cameraBase.set(-2,118,109);cameraTarget.set(5,0,-7);camera.fov=42}
 else{cameraBase.set(-10,82,98);cameraTarget.set(-11,0,6);camera.fov=40}
 camera.updateProjectionMatrix();
}
async function cameraTo(position,target,duration=850){const from=cameraBase.clone(),fromTarget=cameraTarget.clone();await tween(duration,p=>{p=ease(p);cameraBase.lerpVectors(from,position,p);cameraTarget.lerpVectors(fromTarget,target,p)})}
$('#view-toggle').addEventListener('click',async()=>{
 if(!ready||busy)return;overhead=!overhead;$('#view-toggle').setAttribute('aria-pressed',String(overhead));const target=mobile?new THREE.Vector3(5,0,-7):new THREE.Vector3(-11,0,6);
 const pos=overhead?target.clone().add(new THREE.Vector3(0,146,.05)):mobile?new THREE.Vector3(-2,118,109):new THREE.Vector3(-10,82,98);
 if(reduced){cameraBase.copy(pos);cameraTarget.copy(target);camera.position.copy(pos);look.copy(target);wake()}else await cameraTo(pos,target);
});
function status(step,text){$('#journey-step').textContent=step;$('#journey-text').textContent=text}
function clearRoute(){for(const object of[routeLine,routeGlow])if(object){scene.remove(object);object.geometry.dispose();object.material.dispose()}}
async function travel(coords,vehicle,duration,flight){
 clearRoute();const points=coords.map(p=>worldPoint(p,flight?.8:.15));
 const curve=new THREE.CatmullRomCurve3(points),samples=[];for(let i=0;i<=160;i++){const t=i/160,p=curve.getPoint(t);if(flight)p.y+=Math.sin(Math.PI*t)*12;else p.y=heightAt(...geographic(p))+.25;samples.push(p)}
 const path=new THREE.CatmullRomCurve3(samples),geometry=new THREE.BufferGeometry().setFromPoints(samples);
 routeLine=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x9cddff,transparent:true,opacity:.9,depthTest:false}));geometry.setDrawRange(0,0);scene.add(routeLine);
 routeGlow=new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples),new THREE.LineDashedMaterial({color:0x3086b9,dashSize:.3,gapSize:.35,transparent:true,opacity:.25,depthWrite:false}));routeGlow.computeLineDistances();scene.add(routeGlow);
 const model=vehicle==='plane'?flightModel:carModel;model.visible=true;
 await tween(duration,p=>{const t=ease(p),point=path.getPoint(t),next=path.getPoint(Math.min(1,t+.003)),prev=path.getPoint(Math.max(0,t-.003));model.position.copy(point);model.rotation.y=Math.atan2(-(next.x-prev.x),-(next.z-prev.z));const scale=camera.position.distanceTo(point)*(flight?.0065:.012);model.scale.setScalar(scale);geometry.setDrawRange(0,Math.max(2,Math.floor(t*160)+1))});
 model.visible=false;
}
async function arrive(geo){const point=worldPoint(geo,.35);arrival.position.copy(point);await tween(500,p=>{arrival.scale.setScalar(1+p*3);arrival.material.opacity=.85*(1-p*.6)})}
async function journey(lang,start){
 if(busy)return;selected=lang;if(reduced||!ready){go();return}
 highlight(lang);busy=true;document.body.classList.add('is-traveling');$$('.language-option').forEach(el=>el.disabled=true);$('#journey-status').classList.add('is-visible');tooltip.classList.remove('visible');
 try{
 if(lang==='no'){
  status('01 / NORTHBOUND','Driving to Høvik.');
  const middle=[(start[0]+cities.hovik[0])/2,(start[1]+cities.hovik[1])/2];
  await travel([start,middle,cities.hovik],'car',2100,false);
  const target=worldPoint(cities.hovik);await cameraTo(target.clone().add(new THREE.Vector3(3,12,14)),target,750);await arrive(cities.hovik);
 }else{
  status('01 / NORTHBOUND','Flying to Sandefjord, Norway.');
  const mid=[(start[0]+cities.torp[0])/2-2,(start[1]+cities.torp[1])/2];
  await travel([start,mid,cities.torp],'plane',2400,true);
  status('02 / THE LAST STRETCH','Landed. Next stop, Oslo.');
  const target=worldPoint([10.48,59.58]);await cameraTo(target.clone().add(new THREE.Vector3(3,12,15)),target,900);
  await travel([cities.torp,[10.4,59.3],[10.35,59.48],[10.22,59.69],[10.43,59.86],cities.oslo],'car',1500,false);await arrive(cities.oslo);
 }
 status('YOU HAVE ARRIVED',names[lang]+'. Welcome.');await tween(500,()=>{});go();
 }catch(error){console.error('Journey failed',error);go()}
}

async function init(){
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.4:1.6));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x04080e);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,600);
  const [geoResponse,heightResponse,texture]=await Promise.all([fetch(new URL('./geography.json',import.meta.url)),fetch(new URL('./terrain.i16',import.meta.url)),new THREE.TextureLoader().loadAsync(new URL('./regions.png',import.meta.url).href)]);
  if(!geoResponse.ok||!heightResponse.ok)throw new Error('Terrain data unavailable');
  geography=await geoResponse.json();elevations=new Int16Array(await heightResponse.arrayBuffer());texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=texture.image.width;const ctx=bitmap.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0);maskWidth=bitmap.width;maskPixels=ctx.getImageData(0,0,maskWidth,maskWidth).data;
  const water=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshBasicMaterial({color:0x050d17}));water.rotation.x=-Math.PI/2;water.position.y=-.05;scene.add(water);
  const grid=new THREE.GridHelper(300,50,0x17334d,0x10263c);grid.position.y=-.035;grid.material.transparent=true;grid.material.opacity=.09;scene.add(grid);
  makeTerrain(texture);addGeography();addLabels();makeVehicles();overview();camera.position.copy(cameraBase);look.copy(cameraTarget);camera.lookAt(look);
  ready=true;canvas.dataset.renderer='webgl';canvas.dataset.quality=mobile?'mobile':'desktop';document.body.classList.add('has-webgl','is-ready');$('#map-loading').hidden=true;
  $$('#terrain-fallback [tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
  if(!reduced){const final=cameraBase.clone();cameraBase.add(new THREE.Vector3(0,8,8));camera.position.copy(cameraBase);cameraTo(final,cameraTarget.clone(),1800)}wake();
 }catch(error){console.warn('Using static map fallback:',error.message);renderer?.dispose();renderer=null;canvas.hidden=true;$('#map-loading').hidden=true;document.body.classList.add('is-ready','no-webgl');$('#view-toggle').hidden=true;$('#map-labels').hidden=true}
}
addEventListener('resize',()=>{if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);wake()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;document.body.classList.remove('has-webgl');canvas.hidden=true;$('#map-labels').hidden=true;$('#view-toggle').hidden=true});
init();
