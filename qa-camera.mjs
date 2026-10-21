import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const reports=[];
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.01,`${label}: ${a} vs ${b}`);
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||message.text().includes('Using static map fallback'))errors.push(message.text());});
  await page.goto(rootURL);
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas').dataset.renderer==='webgl'||document.body.classList.contains('no-webgl'),null,{timeout:60000});
  assert.deepEqual(errors,[],'Camera test initializes the illustrated map');
  assert.equal(await page.locator('body.no-webgl').count(),0);
  await page.evaluate(async()=>{window.__cameraInspect=(await import(new URL('./assets/app.js',document.baseURI))).inspectScene;});
  const settle=()=>page.waitForFunction(()=>{const p=window.__cameraInspect().performance;return p.framesRendered>0&&!p.active;},null,{timeout:60000});
  const inspect=()=>page.evaluate(()=>window.__cameraInspect());
  await settle();
  const initial=await inspect(),mobile=viewport.width<760;
  assert.deepEqual(initial.camera.position,mobile?[-5,77,110]:[-14,65,104],'Initial point of view stays unchanged');
  assert.deepEqual(initial.camera.target,mobile?[-5,0,3]:[-14,0,5]);
  assert.equal(initial.camera.fov,mobile?44:40);
  const compare=(state)=>{
   for(const axis of [0,2]){
    near(state.camera.position[axis],initial.camera.position[axis],'Horizontal camera position');
    near(state.camera.target[axis],initial.camera.target[axis],'Horizontal target position');
   }
   for(let axis=0;axis<3;axis++)near(state.camera.position[axis]-state.camera.target[axis],initial.camera.position[axis]-initial.camera.target[axis],'Unchanged viewing direction');
   assert.equal(state.camera.fov,initial.camera.fov,'Wheel does not change field of view');
   assert.equal(state.performance.active,false,'Camera sleeps after panning');
  };
  await page.mouse.move(viewport.width*.5,viewport.height*.5);
  await page.mouse.wheel(0,-180);await settle();const raised=await inspect();
  assert.ok(raised.camera.position[1]>initial.camera.position[1]+7,'Wheel up raises camera Y');compare(raised);
  await page.mouse.wheel(0,180);await settle();const restored=await inspect();
  near(restored.camera.position[1],initial.camera.position[1],'Wheel down returns camera Y');compare(restored);
  // Exercise the clamp and the browser's line/page wheel delta units.
  await page.evaluate(()=>{for(let i=0;i<20;i++)dispatchEvent(new WheelEvent('wheel',{deltaY:-20,deltaMode:1,cancelable:true}));});
  await settle();const high=await inspect();near(high.camera.position[1],115,'Upper camera limit');compare(high);
  await page.screenshot({path:`outputs/camera-v7-high-${viewport.width}.png`});
  await page.evaluate(()=>{for(let i=0;i<20;i++)dispatchEvent(new WheelEvent('wheel',{deltaY:1,deltaMode:2,cancelable:true}));});
  await settle();const low=await inspect();near(low.camera.position[1],45,'Lower camera limit');compare(low);
  await page.screenshot({path:`outputs/camera-v7-low-${viewport.width}.png`});
  const ignored=await page.evaluate(()=>{const e=new WheelEvent('wheel',{deltaY:-180,ctrlKey:true,cancelable:true});dispatchEvent(e);return e.defaultPrevented;});
  assert.equal(ignored,false,'Browser pinch/Control-wheel is not captured');
  await settle();near((await inspect()).camera.position[1],45,'Control-wheel leaves camera unchanged');
  assert.deepEqual(errors,[],'No errors while scrolling');
  reports.push({viewport,initial:initial.camera,raised:raised.camera,high:high.camera,low:low.camera});
  await page.close();
 }
 await fs.writeFile('outputs/camera-v7.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports,null,2));
}finally{await browser.close();}
