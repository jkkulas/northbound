import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{
 for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:4173',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.renderer==='webgl',null,{timeout:60000});
  await page.evaluate(async()=>{window.__inspectAtlas=(await import('./assets/app.js')).inspectScene;});
  await page.waitForFunction(()=>{const p=window.__inspectAtlas().performance;return p.framesRendered>0&&!p.active;},null,{timeout:60000});
  const state=await page.evaluate(()=>window.__inspectAtlas({artwork:true}));
  assert.equal(state.landmarkCount,17);assert.equal(state.creatureCount,17);
  assert.equal(await page.locator('.city-label,#map-tooltip').count(),0,'City pins and hover tooltip are removed');
  for(const m of state.landmarkArtwork){
   assert.equal(m.userData.dimensional,true,`${m.name} is dimensional architecture`);
   assert.ok(m.bounds.max[1]-m.bounds.min[1]>.8,`${m.name} has model height`);
   assert.ok(m.meshes.reduce((s,m)=>s+m.triangles,0)>500,`${m.name} has substantial modeled detail`);
   assert.ok(m.meshes.every(m=>m.opaque&&m.depthWrite),`${m.name} has solid painted surfaces`);
  }
  for(const m of state.seaArtwork)assert.equal(m.userData.fullWaterSupport,true,`${m.name} entire solid vignette stays over sea`);
  assert.ok(state.scenery.houseCount>=25&&state.scenery.lighthouseCount>=2&&state.scenery.rockCount>=15,'Countryside and sea scenery is populated');
  assert.equal(state.bridges.bridgeCount,3,'Three verified island crossings');
  assert.ok(state.scenery.woodland.trees>=(viewport.width<760?440:760),'Rich modeled woodland');
  for(const m of state.seaArtwork){assert.ok(m.meshes.every(mesh=>mesh.opaque&&mesh.depthWrite&&!mesh.textured),'Sea models are opaque volumes without image cards');}
  assert.ok(state.performance.calls<110,`Batched scene draw budget (${state.performance.calls})`);
  await page.screenshot({path:`outputs/diorama-${viewport.width}.png`});
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname));
  assert.ok(!resources.some(x=>x.endsWith('.webp')),'All object art is modeled and no raster atlases load');
  assert.ok(!resources.some(x=>/maritime-engraving|landmarks-ink/.test(x)),'Old illustration assets are replaced');
  assert.deepEqual(errors,[],'No shader, resource or runtime errors');
  reports.push({viewport,state,resources});await page.close();
 }
 await fs.writeFile('outputs/diorama-review.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports.map(({viewport,state})=>({viewport,performance:state.performance,landmarks:state.landmarkCount,vignettes:state.creatureCount,houses:state.scenery.houseCount,lighthouses:state.scenery.lighthouseCount,rocks:state.scenery.rockCount})),null,2));
}finally{await browser.close();}
