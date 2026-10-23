import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Instrument only the test response so exact poses can be rendered without
// shipping a clock override or waiting for many software-rendered loops.
const reviewHook=`
export function reviewMaritimeFrame(time){
 for(const update of ambientUpdaters)update(time);
 scene.updateMatrixWorld(true);renderer.render(scene,camera);
 const model=creatureObjects.find(o=>o.userData.asset==='kraken_attack'),a=model.animation;
 const bounds=model.userData.worldBounds,points=[];
 for(const x of[bounds.min[0],bounds.max[0]])for(const y of[0,bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]]){
  const p=new THREE.Vector3(x,y,z).project(camera);points.push([(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]);
 }
 const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0]))-28)),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))-28));
 const right=Math.min(innerWidth,Math.ceil(Math.max(...points.map(p=>p[0]))+28)),bottom=Math.min(innerHeight,Math.ceil(Math.max(...points.map(p=>p[1]))+28));
 return {phase:seaLife.motion.krakenPhase,shipVisible:a.ship.visible,krakenVisible:a.creature.visible,bubblesVisible:a.bubbles.visible,shipY:a.ship.position.y,clip:{x,y,width:right-x,height:bottom-y}};
}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{
 for(const viewport of[{width:1440,height:1000},{width:390,height:844},{width:320,height:568}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce',deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using static map fallback'))errors.push(m.text());});
  await page.route('**/assets/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+reviewHook});});
  await page.goto(process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/');
  await page.waitForFunction(()=>document.body.classList.contains('is-ready'),null,{timeout:60000});
  assert.deepEqual(errors,[],'The complete scene initializes');
  await page.evaluate(async()=>{window.__review=(await import('./assets/app.js')).reviewMaritimeFrame;});
  await page.waitForFunction(()=>[...document.querySelectorAll('.map-label')].length===3&&document.querySelector('.map-label').style.transform);
  const labels=await page.locator('.map-label').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return{text:el.textContent,x:r.x,y:r.y,width:r.width,height:r.height,font:parseFloat(getComputedStyle(el.firstElementChild).fontSize),visible:getComputedStyle(el).visibility};}));
  assert.deepEqual(labels.map(l=>l.text),['Norsk','Polski','English']);
  for(const l of labels){assert.equal(l.visible,'visible');assert.ok(l.font>=25);assert.ok(l.x>=0&&l.y>=0&&l.x+l.width<=viewport.width&&l.y+l.height<=viewport.height,`${l.text} fits on ${viewport.width}px screen`);}
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
   const a=labels[i],b=labels[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Language controls never overlap');
  }
  assert.equal(await page.locator('.language-picker').isVisible(),false,'No duplicate corner picker');
  assert.equal(await page.locator('.atlas-caption,.intro,.map-hint,.map-credits,.map-coordinates,.sea-label,.creature-label').count(),0);
  const poses=[];
  for(const [time,phase] of[[0,'sailing'],[7,'emerging'],[10,'grasping'],[13,'sinking'],[17,'bubbles'],[22,'resurfacing'],[26,'sailing']]){
   const pose=await page.evaluate(t=>window.__review(t),time);assert.equal(pose.phase,phase);
   if(time===0||time===26){assert.ok(pose.shipVisible&&!pose.krakenVisible&&!pose.bubblesVisible);assert.ok(Math.abs(pose.shipY-.03)<1e-6);}
   if(time===17)assert.ok(!pose.shipVisible&&!pose.krakenVisible&&pose.bubblesVisible,'Only bubbles remain after the sinking');
   if(time===10)assert.ok(pose.shipVisible&&pose.krakenVisible,'The creature reaches the intact ship before dragging it down');
   if(viewport.width===1440)await page.screenshot({path:`outputs/kraken-${time}-${phase}.png`,clip:pose.clip});
   poses.push({time,...pose});
  }
  await page.screenshot({path:`outputs/northbound-updated-${viewport.width}.png`});
  assert.deepEqual(errors,[],'Every animation phase renders without shader/runtime errors');
  reports.push({viewport,labels,poses});await page.close();
 }
 await fs.writeFile('outputs/maritime-story-review.json',JSON.stringify(reports,null,2));
 console.log('PASS Kraken cycle and repeat, readable language controls at 1440 / 390 / 320px, no corner copy, no shader/runtime errors');
}finally{await browser.close();}
