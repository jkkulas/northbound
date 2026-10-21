import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{
 for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using static map fallback'))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:4173',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.renderer==='webgl'||document.body.classList.contains('no-webgl'),null,{timeout:60000});
  assert.deepEqual(errors,[],'Artwork initializes without falling back');
  await page.evaluate(async()=>{window.__inspectAtlas=(await import('./assets/app.js')).inspectScene;});
  await page.waitForFunction(()=>{const p=window.__inspectAtlas().performance;return p.framesRendered>0&&!p.active;},null,{timeout:60000});
  const state=await page.evaluate(()=>window.__inspectAtlas({artwork:true}));
  assert.equal(state.landmarkCount,12);assert.equal(state.creatureCount,17);
  assert.equal(await page.locator('.city-label,#map-tooltip').count(),0,'City pins and hover tooltip stay removed');
  for(const m of state.landmarkArtwork){
   assert.equal(m.userData.paperIllustration,true,`${m.name} is paper architecture`);
   assert.equal(m.userData.dimensional,false,`${m.name} has no volumetric object model`);
   assert.ok(m.bounds.max[1]-m.bounds.min[1]>.5,`${m.name} stands upright`);
   assert.ok(m.meshes.every(m=>m.opaque&&m.depthWrite),`${m.name} has opaque painted surfaces`);
  }
  for(const id of ['brandenburg','cologne','edinburgh'])assert.ok(state.landmarkArtwork.some(m=>m.name===`landmark-${id}`),`${id} is present`);
  for(const m of state.seaArtwork){
   assert.equal(m.userData.fullWaterSupport,true,`${m.name} entire painted vignette stays over sea`);
   assert.equal(m.userData.waterPigment,'shared-chart-wash',`${m.name} shares the sea's pigment`);
  }
  assert.equal(state.scenery.paperIllustration,true,'Scenery uses paper illustrations');
  assert.ok(state.scenery.houseCount>=25&&state.scenery.lighthouseCount>=2&&state.scenery.rockCount>=15,'Countryside and sea scenery is populated');
  assert.ok(state.performance.calls<=65,`Batched scene draw budget (${state.performance.calls})`);
  await page.screenshot({path:`outputs/paper-v5-${viewport.width}.png`});
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname));
  assert.ok(resources.some(x=>x.includes('paper-atlas-v5')),'New paper artwork loads');
  assert.ok(!resources.some(x=>/atlas-models\.js|maritime-engraving|landmarks-ink/.test(x)),'Retired solid models and artwork stay unloaded');
  assert.deepEqual(errors,[],'No shader, resource or runtime errors');
  reports.push({viewport,state,resources});await page.close();
 }
 await fs.writeFile('outputs/paper-v5-review.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports.map(({viewport,state})=>({viewport,performance:state.performance,landmarks:state.landmarkCount,vignettes:state.creatureCount,houses:state.scenery.houseCount,lighthouses:state.scenery.lighthouseCount,rocks:state.scenery.rockCount})),null,2));
}finally{await browser.close();}
