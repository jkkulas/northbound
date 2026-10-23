import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';

const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const smokeOnly=process.env.NORTHBOUND_CAMERA_QA_FOCUS==='smoke';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[],errors=[];
const near=(a,b,tolerance=1e-5)=>Math.abs(a-b)<=tolerance;
const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
const radius=camera=>distance(camera.position,camera.target);
const inspect=page=>page.evaluate(()=>window.__cameraQA.inspectScene());
const state=async page=>(await inspect(page)).camera;
const labelFonts=page=>page.locator('.map-label .label-name').evaluateAll(labels=>labels.map(label=>getComputedStyle(label).fontSize));

function fixedPoint(actual,expected,message){assert.ok(distance(actual,expected)<1e-4,`${message}: ${JSON.stringify({actual,expected})}`);}
function inBounds(camera){
 const c=camera.controls;
 assert.ok([...camera.position,...camera.target,c.azimuth,c.polar,c.radius,c.minPolar,c.maxPolar,c.minFov,c.maxFov].every(Number.isFinite),'Camera and control limits remain finite');
 assert.ok(c.minPolar>=0&&c.maxPolar<Math.PI/2,'Orbit stays on the upper hemisphere');
 assert.ok(c.polar>=c.minPolar-1e-5&&c.polar<=c.maxPolar+1e-5,'Camera polar angle stays within its limits');
 assert.ok(camera.fov>=c.minFov-1e-5&&camera.fov<=c.maxFov+1e-5,'FOV stays within its limits');
 assert.ok(camera.position[1]>camera.target[1],'Camera remains above its focal point');
 assert.ok(near(radius(camera),c.radius,1e-4),'Inspected radius matches the rendered camera');
 if(Number.isFinite(c.minAltitude))assert.ok(camera.position[1]>=c.minAltitude-1e-4,'Camera clears the explicit minimum terrain altitude');
}
function unchangedZoomPose(actual,expected){
 fixedPoint(actual.position,expected.position,'FOV zoom does not dolly the camera');
 fixedPoint(actual.target,expected.target,'FOV zoom does not move the focal point');
 assert.ok(near(radius(actual),radius(expected),1e-4),'FOV zoom preserves orbit radius');
}
function orbitPose(actual,expected){
 fixedPoint(actual.target,expected.target,'Orbit keeps the focal point fixed');
 assert.ok(near(radius(actual),radius(expected),1e-4),'Orbit preserves its radius');
 inBounds(actual);
}
async function newMap({touch=false,reduced=true,viewport=touch?{width:390,height:844}:{width:1440,height:1000}}={}){
 const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage();
 page.setDefaultTimeout(30000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'||message.text().includes('Using static map fallback'))errors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto(rootURL);
 await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.renderer==='webgl'||document.body.classList.contains('no-webgl'),null,{timeout:60000});
 assert.equal(await page.locator('#terrain-canvas').getAttribute('data-renderer'),'webgl',`Scene initializes: ${errors.join('; ')}`);
 await page.evaluate(async()=>{window.__cameraQA=await import(new URL('./assets/app.js',document.baseURI).href);});
 await page.waitForFunction(()=>!!window.__cameraQA.inspectScene().camera.controls);
 if(reduced)await idle(page);else await page.waitForTimeout(2400);
 inBounds(await state(page));
 return{context,page};
}
async function idle(page){await page.waitForFunction(()=>{const scene=window.__cameraQA.inspectScene();return!scene.performance.active&&scene.camera.controls.settled;},null,{timeout:10000});}
async function noJourney(page){
 assert.equal(page.url(),new URL(rootURL).href,'Gestures do not navigate');
 assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('is-traveling')),false,'Gesture release does not start a journey');
}
async function drag(page,from,to,steps=6){
 from=await page.evaluate(([x,y])=>{for(const[dx,dy]of[[0,0],[-25,0],[25,0],[0,-25],[0,25],[-60,0],[60,0]])if(document.elementFromPoint(x+dx,y+dy)?.id==='terrain-canvas')return[x+dx,y+dy];throw new Error('No unobscured canvas point at drag origin');},from);
 await page.mouse.move(...from);await page.mouse.down();await page.mouse.move(...to,{steps});await page.mouse.up();
 await idle(page);await noJourney(page);
}
async function canvasLandPoint(page){
 return page.evaluate(()=>{
  for(const geo of[[19.1,52.1],[20.4,53.0],[17.2,52.3],[2.0,48.5],[8.0,50.0]]){
   const point=window.__cameraQA.projectToScreen(...geo);
   if(point&&point.x>30&&point.x<innerWidth-60&&point.y>30&&point.y<innerHeight-30&&document.elementFromPoint(point.x,point.y)?.id==='terrain-canvas')return{...point,geo};
  }
  return null;
 });
}
async function touchEvent(cdp,type,touches){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:touches.map(([id,x,y])=>({id,x,y,radiusX:4,radiusY:4,force:1}))});}
async function pinch(cdp,{center=[195,180],start=50,end=130}={}){
 const [x,y]=center;await touchEvent(cdp,'touchStart',[[1,x-start,y],[2,x+start,y]]);
 for(let step=1;step<=10;step++){const span=start+(end-start)*step/10;await touchEvent(cdp,'touchMove',[[1,x-span,y],[2,x+span,y]]);}
 await touchEvent(cdp,'touchEnd',[]);
}
async function labelLayout(page){
 const layout=await page.evaluate(()=>{
  const rect=element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
  return{width:innerWidth,height:innerHeight,toolbar:rect(document.querySelector('.map-controls')),labels:[...document.querySelectorAll('.map-label')].map(element=>({...rect(element),name:element.textContent,visible:getComputedStyle(element).visibility==='visible'}))};
 });
 const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 for(let i=0;i<layout.labels.length;i++){
  const label=layout.labels[i];assert.ok(label.visible,`${label.name} remains visible after camera changes`);
  assert.ok(label.left>=0&&label.right<=layout.width+.01&&label.top>=0&&label.bottom<=layout.height+.01,`${label.name} remains in the viewport`);
  assert.ok(!overlap(label,layout.toolbar),`${label.name} stays clear of the camera controls`);
  for(const prior of layout.labels.slice(0,i))assert.ok(!overlap(label,prior),`${label.name} and ${prior.name} remain separately readable`);
 }
 return layout;
}

async function finalSourceSmoke(){
 for(const touch of[false,true]){
  const {context,page}=await newMap({touch}),initial=await state(page),fonts=await labelFonts(page),beforeLabels=await labelLayout(page);
  if(touch){const cdp=await context.newCDPSession(page);await pinch(cdp);}
  else{await page.mouse.move(700,180);await page.mouse.wheel(0,-300);}
  await idle(page);const zoomed=await state(page);unchangedZoomPose(zoomed,initial);assert.ok(zoomed.fov<initial.fov);inBounds(zoomed);
  const zoomLabels=await labelLayout(page);assert.notDeepEqual(zoomLabels.labels,beforeLabels.labels,'FOV changes reproject the language labels');
  await drag(page,touch?[150,180]:[700,180],touch?[275,210]:[1090,230]);const orbited=await state(page);orbitPose(orbited,initial);await labelLayout(page);
  await page.setViewportSize(touch?{width:320,height:568}:{width:1200,height:800});await idle(page);const resized=await state(page);unchangedZoomPose(resized,orbited);assert.ok(near(resized.fov,orbited.fov));await labelLayout(page);
  if(touch)assert.ok((await page.locator('.map-controls button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().width))).every(width=>width>=44),'Phone controls keep a44px touch target');
  // Font size may follow the viewport breakpoint, but camera-only changes above
  // must leave it unchanged. Return to the starting viewport for comparison.
  await page.setViewportSize(touch?{width:390,height:844}:{width:1440,height:1000});await idle(page);assert.deepEqual(await labelFonts(page),fonts);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>window.__cameraQA.inspectAmbientLife().enabled);
  await page.evaluate(()=>{window.__labelWrites=0;window.__labelObserver=new MutationObserver(records=>window.__labelWrites+=records.length);window.__labelObserver.observe(document.querySelector('#map-labels'),{subtree:true,attributes:true,attributeFilter:['style']});});
  const ambientBefore=await page.evaluate(()=>window.__cameraQA.inspectAmbientLife().time);await page.waitForFunction(time=>window.__cameraQA.inspectAmbientLife().time>time+.6,ambientBefore);
  assert.equal(await page.evaluate(()=>window.__labelWrites),0,'Settled camera labels are not rewritten on ambient frames');
  await page.screenshot({path:`outputs/camera-controls-final-${touch?'touch':'desktop'}.png`});
  reports.push({kind:touch?'touch-smoke':'desktop-smoke',initial,zoomed,orbited,resized});await context.close();console.log(`${touch?'Touch':'Desktop'} final camera smoke passed.`);
 }
}

try{
 if(smokeOnly)await finalSourceSmoke();else{
 // A frozen ambient clock isolates user-driven camera movement and proves the
 // controls remain usable when the visitor requests reduced motion.
 const {context,page}=await newMap(),initial=await state(page),fonts=await labelFonts(page);
 await page.mouse.move(700,180);await page.mouse.wheel(0,-300);await idle(page);
 const zoomed=await state(page);assert.ok(zoomed.fov<initial.fov,'Wheel-up narrows the camera field of view');unchangedZoomPose(zoomed,initial);inBounds(zoomed);
 assert.deepEqual(await labelFonts(page),fonts,'Camera zoom does not change label font sizes');
 const pageScale=await page.evaluate(()=>visualViewport.scale);await page.keyboard.down('Control');await page.mouse.wheel(0,-100);await page.keyboard.up('Control');await idle(page);const trackpad=await state(page);
 assert.ok(trackpad.fov<zoomed.fov,'Ctrl+wheel trackpad pinch changes optical FOV');unchangedZoomPose(trackpad,initial);assert.equal(await page.evaluate(()=>visualViewport.scale),pageScale,'Trackpad pinch does not zoom the webpage');assert.deepEqual(await labelFonts(page),fonts,'Trackpad pinch keeps text size unchanged');
 await page.mouse.wheel(0,-100000);await idle(page);const close=await state(page);assert.ok(near(close.fov,close.controls.minFov,.01),'Wheel zoom clamps at its near limit');unchangedZoomPose(close,initial);
 for(let step=0;step<3;step++){await page.mouse.wheel(0,100000);await idle(page);}const wide=await state(page);assert.ok(near(wide.fov,wide.controls.maxFov,.01),'Wheel zoom clamps at its wide limit');unchangedZoomPose(wide,initial);
 await noJourney(page);

 // Start a drag over actual clickable land; the synthesized browser click at
 // pointer-up must not accidentally choose the underlying language.
 const land=await canvasLandPoint(page);assert.ok(land,'A real land area remains available for dragging');
 await drag(page,[land.x,land.y],[land.x+30,land.y+5]);const smallOrbit=await state(page);orbitPose(smallOrbit,initial);assert.ok(distance(smallOrbit.position,initial.position)>.05,'Mouse drag actually moves the camera around the map');
 await drag(page,[700,450],[1080,450]);const sideways=await state(page);orbitPose(sideways,initial);assert.ok(Math.abs(sideways.controls.azimuth-smallOrbit.controls.azimuth)>.1,'Horizontal drag changes the orbit azimuth');
 await drag(page,[700,900],[700,100]);
 const poleA=await state(page);orbitPose(poleA,initial);
 await drag(page,[700,100],[700,900]);
 const poleB=await state(page);orbitPose(poleB,initial);
 const poles=[poleA.controls.polar,poleB.controls.polar].sort((a,b)=>a-b);
 assert.ok(near(poles[0],poleB.controls.minPolar,.01)&&near(poles[1],poleB.controls.maxPolar,.01),'Dragging beyond both vertical limits reaches and respects both bounds');
 assert.deepEqual(await labelFonts(page),fonts,'Orbit does not resize the text');
 const beforeResize=await state(page);await page.setViewportSize({width:1200,height:800});await idle(page);const resized=await state(page);
 unchangedZoomPose(resized,beforeResize);assert.ok(near(resized.fov,beforeResize.fov),'Resize preserves the chosen FOV');assert.ok(near(resized.aspect,1.5),'Resize updates the projection aspect');
 assert.equal((await page.evaluate(()=>window.__cameraQA.inspectAmbientLife())).enabled,false,'Reduced motion stays enabled while controls work');
 const frozen=await inspect(page);await page.waitForTimeout(250);assert.equal((await inspect(page)).performance.framesRendered,frozen.performance.framesRendered,'Reduced-motion controls let the renderer sleep after interaction');
 await page.screenshot({path:'outputs/camera-controls-orbit.png'});
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await idle(page);const toolbarZoom=await state(page);assert.ok(toolbarZoom.fov<resized.fov,'The visible zoom-in button changes FOV');unchangedZoomPose(toolbarZoom,resized);
 await page.getByRole('button',{name:'Zoom out',exact:true}).click();await idle(page);assert.ok((await state(page)).fov>toolbarZoom.fov,'The visible zoom-out button changes FOV');
 await page.locator('#terrain-canvas').focus();const beforeKey=await state(page);await page.keyboard.press('ArrowLeft');await idle(page);const keyOrbit=await state(page);orbitPose(keyOrbit,beforeKey);assert.ok(distance(keyOrbit.position,beforeKey.position)>.05,'Arrow keys orbit the focused map');
 await page.keyboard.press('Shift+Equal');await idle(page);const keyZoom=await state(page);assert.ok(keyZoom.fov<keyOrbit.fov,'The plus key narrows FOV');unchangedZoomPose(keyZoom,keyOrbit);
 await page.keyboard.press('Minus');await idle(page);assert.ok((await state(page)).fov>keyZoom.fov,'The minus key widens FOV');
 const shortcutBefore=await state(page);await page.keyboard.press('Control+Equal');await idle(page);const shortcutZoom=await state(page);assert.ok(shortcutZoom.fov<shortcutBefore.fov,'Focused canvas intercepts Ctrl+plus for camera zoom');unchangedZoomPose(shortcutZoom,shortcutBefore);assert.equal(await page.evaluate(()=>visualViewport.scale),pageScale,'Focused zoom shortcut does not scale the webpage');
 await page.keyboard.press('Home');await idle(page);const home=await state(page);unchangedZoomPose(home,initial);assert.ok(near(home.fov,initial.fov),'Home restores the default view');
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await idle(page);await page.getByRole('button',{name:'Reset map view',exact:true}).click();await idle(page);const reset=await state(page);unchangedZoomPose(reset,initial);assert.ok(near(reset.fov,initial.fov),'Reset map view restores the default FOV');
 await page.screenshot({path:'outputs/camera-controls-desktop.png'});
 console.log('Desktop camera controls passed.');
 reports.push({kind:'desktop',initial,zoomed,close,wide,orbit:resized});await context.close();

 // Pinch uses real Chromium touch input so Pointer Events, touch-action and
 // pointer capture are exercised together rather than bypassed by JS events.
 const mobile=await newMap({touch:true}),touchPage=mobile.page,cdp=await mobile.context.newCDPSession(touchPage),touchBefore=await state(touchPage),touchFonts=await labelFonts(touchPage);
 await pinch(cdp);await idle(touchPage);const pinched=await state(touchPage);
 assert.ok(pinched.fov<touchBefore.fov,'Spreading two fingers zooms in through FOV');unchangedZoomPose(pinched,touchBefore);inBounds(pinched);await noJourney(touchPage);
 await pinch(cdp,{start:130,end:50});await idle(touchPage);const unpinched=await state(touchPage);assert.ok(unpinched.fov>pinched.fov,'Closing two fingers zooms back out');unchangedZoomPose(unpinched,touchBefore);
 await touchEvent(cdp,'touchStart',[[1,130,180]]);for(let step=1;step<=10;step++)await touchEvent(cdp,'touchMove',[[1,130+step*10,180+step*2]]);await touchEvent(cdp,'touchEnd',[]);await idle(touchPage);
 const touchOrbit=await state(touchPage);orbitPose(touchOrbit,touchBefore);assert.ok(distance(touchOrbit.position,touchBefore.position)>.1,'A single-finger drag orbits the map');await noJourney(touchPage);
 assert.deepEqual(await labelFonts(touchPage),touchFonts,'Pinching and dragging do not resize labels');
 assert.equal(await touchPage.evaluate(()=>scrollY),0,'Touch gestures do not scroll the page');
 await touchPage.screenshot({path:'outputs/camera-controls-touch.png'});
 await touchPage.locator('.map-label[data-lang="en"]').tap();await touchPage.waitForURL(new URL('en/',rootURL).href);assert.equal(await touchPage.locator('h1').textContent(),'English','An intentional tap still selects a language after gestures');
 reports.push({kind:'touch',initial:touchBefore,pinched,orbit:touchOrbit});await mobile.context.close();
 console.log('Touch camera controls passed.');

 // Keep ordinary map clicks working, including the reduced-motion shortcut.
 const clickMap=await newMap();const clickPoint=await canvasLandPoint(clickMap.page);assert.ok(clickPoint);
 await clickMap.page.mouse.click(clickPoint.x,clickPoint.y);await clickMap.page.waitForURL(url=>/\/(en|pl|no)\/$/.test(url.pathname));assert.ok(['English','Polski','Norsk'].includes(await clickMap.page.locator('h1').textContent()),'An ordinary map click still navigates');await clickMap.context.close();

 const animated=await newMap({reduced:false}),liveBefore=await animated.page.evaluate(()=>window.__cameraQA.inspectAmbientLife());
 const animatedPose=await state(animated.page);await animated.page.mouse.move(700,180);await animated.page.mouse.wheel(0,-300);await animated.page.waitForFunction(fov=>window.__cameraQA.inspectScene().camera.fov<fov,animatedPose.fov);
 unchangedZoomPose(await state(animated.page),animatedPose);
 await animated.page.waitForFunction(time=>window.__cameraQA.inspectAmbientLife().time>time+.2,liveBefore.time);
 assert.equal((await animated.page.evaluate(()=>window.__cameraQA.inspectAmbientLife())).enabled,true,'Normal ambient animation continues after camera interaction');
 await animated.context.close();
 }
 assert.deepEqual(errors,[],'Camera gestures produce no runtime, shader or resource errors');
 await fs.writeFile(`outputs/camera-controls${smokeOnly?'-final-smoke':''}.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
}finally{await browser.close();}
