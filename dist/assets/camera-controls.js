// Optical zoom and a bounded orbit. Camera distance and focal point are fixed
// during navigation; zoom changes the perspective lens, never the page scale.
export function createMapCameraControls({element,canvas,camera,position,target,enabled,minAltitude,wake,onStart,onChange}){
 const radians=Math.PI/180,MIN_POLAR=12*radians,MAX_POLAR=72*radians,MIN_FOV=16,MAX_FOV=62;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 let engaged=false,dragged=false,suppressUntil=0,pinchDistance=0,home;
 let azimuth=0,polar=0,radius=0,wantedAzimuth=0,wantedPolar=0,wantedFov=camera.fov;
 const maxPolar=(distance=radius)=>Math.min(MAX_POLAR,Math.acos(clamp((minAltitude()-target.y)/Math.max(distance,1),0,.999)));
 function setHome(p,t,fov){home={position:p.clone(),target:t.clone(),fov};}
 setHome(position,target,camera.fov);
 function begin(){
  if(!enabled())return false;
  if(!engaged){
   onStart();position.copy(camera.position);
   const x=position.x-target.x,y=position.y-target.y,z=position.z-target.z;
   radius=Math.hypot(x,y,z);azimuth=Math.atan2(x,z);polar=Math.acos(clamp(y/radius,-1,1));
   wantedAzimuth=azimuth;wantedPolar=polar;wantedFov=camera.fov;engaged=true;
  }
  return true;
 }
 function changed(){onChange();wake();}
 function rotate(dx,dy){
  if(!begin())return;
  const scale=Math.PI/Math.max(element.clientHeight,250);
  wantedAzimuth+=dx*scale;wantedPolar=clamp(wantedPolar+dy*scale,MIN_POLAR,maxPolar());changed();
 }
 function zoom(factor){
  if(!begin()||!Number.isFinite(factor)||factor<=0)return;
  wantedFov=clamp(2*Math.atan(Math.tan(wantedFov*radians/2)/factor)/radians,MIN_FOV,MAX_FOV);changed();
 }
 function clearPointers(){
  for(const[id,p]of pointers)if(p.capture?.hasPointerCapture?.(id))p.capture.releasePointerCapture(id);
  pointers.clear();pinchDistance=0;canvas.classList.remove('is-orbiting');
 }
 function stop(){clearPointers();engaged=false;}
 function reset(){
  if(!begin())return;
  clearPointers();target.copy(home.target);radius=home.position.distanceTo(home.target);
  const x=home.position.x-target.x,y=home.position.y-target.y,z=home.position.z-target.z;
  const angle=Math.atan2(x,z);wantedAzimuth=azimuth+Math.atan2(Math.sin(angle-azimuth),Math.cos(angle-azimuth));
  wantedPolar=clamp(Math.acos(y/radius),MIN_POLAR,maxPolar());wantedFov=home.fov;changed();
 }
 function update(delta,immediate=false){
  if(!engaged||!enabled())return false;
  const blend=immediate?1:1-Math.exp(-Math.max(delta,0)*16);
  azimuth+=(wantedAzimuth-azimuth)*blend;polar+=(wantedPolar-polar)*blend;
  // Clamp the actual pose too, including when taking over the opening motion.
  polar=clamp(polar,MIN_POLAR,maxPolar());
  const fov=camera.fov+(wantedFov-camera.fov)*blend;
  const settling=Math.abs(wantedAzimuth-azimuth)+Math.abs(wantedPolar-polar)+Math.abs(wantedFov-fov)>.00001;
  if(!settling){azimuth=wantedAzimuth;polar=wantedPolar;}
  const horizontal=radius*Math.sin(polar);
  position.set(target.x+horizontal*Math.sin(azimuth),target.y+radius*Math.cos(polar),target.z+horizontal*Math.cos(azimuth));
  camera.position.copy(position);camera.lookAt(target);
  if(Math.abs(camera.fov-fov)>.000001){camera.fov=settling?fov:wantedFov;camera.updateProjectionMatrix();onChange();}
  return settling;
 }
 const distance=()=>{const[a,b]=[...pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
 element.addEventListener('pointerdown',event=>{
  if(!enabled()||event.button!==0)return;
  if(!pointers.size){dragged=false;suppressUntil=0;}
  const capture=event.target;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,capture});
  capture.setPointerCapture?.(event.pointerId);
  if(pointers.size>1){dragged=true;pinchDistance=distance();begin();}
 });
 element.addEventListener('pointermove',event=>{
  const p=pointers.get(event.pointerId);if(!p||!enabled())return;
  const dx=event.clientX-p.x,dy=event.clientY-p.y;p.x=event.clientX;p.y=event.clientY;
  if(pointers.size>1){
   const next=distance();if(next>0&&pinchDistance>0)zoom(next/pinchDistance);pinchDistance=next;
  }else{
   const justStarted=!dragged&&Math.hypot(p.x-p.startX,p.y-p.startY)>6;
   if(justStarted)dragged=true;
   if(dragged)rotate(justStarted?p.x-p.startX:dx,justStarted?p.y-p.startY:dy);
  }
  if(dragged){event.preventDefault();canvas.classList.add('is-orbiting');suppressUntil=performance.now()+500;}
 });
 function end(event){
  const p=pointers.get(event.pointerId);if(!p)return;
  pointers.delete(event.pointerId);if(p.capture?.hasPointerCapture?.(event.pointerId))p.capture.releasePointerCapture(event.pointerId);
  if(dragged)suppressUntil=performance.now()+500;
  pinchDistance=distance();for(const point of pointers.values()){point.startX=point.x;point.startY=point.y;}
  if(!pointers.size)canvas.classList.remove('is-orbiting');
 }
 for(const name of['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,end);
 // Capture before either terrain clicks or language-button click handlers.
 element.addEventListener('click',event=>{
  if(event.detail!==0&&performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 element.addEventListener('wheel',event=>{
  if(!enabled())return;event.preventDefault();
  const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?element.clientHeight:1);
  zoom(Math.exp(-clamp(pixels,-500,500)*.0018));
 },{passive:false});
 // Safari emits native trackpad/touch gesture events instead of wheel events.
 let gestureScale=1;
 element.addEventListener('gesturestart',event=>{if(!enabled())return;event.preventDefault();gestureScale=event.scale||1;},{passive:false});
 element.addEventListener('gesturechange',event=>{if(!enabled())return;event.preventDefault();if(pointers.size<2)zoom(event.scale/gestureScale);gestureScale=event.scale;},{passive:false});
 canvas.addEventListener('keydown',event=>{
  if(!enabled()||event.altKey)return;
  const modified=event.metaKey||event.ctrlKey;
  if(modified&&!['+','=','-','_','0'].includes(event.key))return;
  const keys={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};
  if(keys[event.key]){event.preventDefault();rotate(...keys[event.key]);}
  else if(['+','=','-','_','Home'].includes(event.key)||modified&&event.key==='0'){event.preventDefault();event.key==='Home'||event.key==='0'?reset():zoom(event.key==='-'||event.key==='_'?1/1.2:1.2);}
 });
 addEventListener('blur',()=>{if(pointers.size){suppressUntil=performance.now()+500;clearPointers();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPointers();});
 function inspect(){
  const x=camera.position.x-target.x,y=camera.position.y-target.y,z=camera.position.z-target.z,distance=Math.hypot(x,y,z);
  return {engaged,active:pointers.size>0,azimuth:Math.atan2(x,z),polar:Math.acos(clamp(y/distance,-1,1)),radius:distance,minPolar:MIN_POLAR,maxPolar:maxPolar(distance),minFov:MIN_FOV,maxFov:MAX_FOV,minAltitude:minAltitude(),settled:!engaged||Math.abs(wantedAzimuth-azimuth)+Math.abs(wantedPolar-polar)+Math.abs(wantedFov-camera.fov)<.0001};
 }
 return {update,zoom,reset,stop,setHome,get engaged(){return engaged;},get active(){return pointers.size>0;},inspect};
}
