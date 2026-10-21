import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const baseline=JSON.parse(await fs.readFile('outputs/paper-v5-review.json','utf8'));
function screenSize(bounds,state,viewport){
 const camera=new THREE.PerspectiveCamera(state.camera.fov,state.camera.aspect,.1,600);
 camera.position.fromArray(state.camera.position);camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));camera.updateMatrixWorld();
 const points=[];for(const x of[bounds.min[0],bounds.max[0]])for(const y of[bounds.min[1],bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z).project(camera));
 return{width:(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*viewport.width/2,height:(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*viewport.height/2};
}
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
  assert.equal(state.landmarkCount,13);assert.equal(state.creatureCount,17);
  assert.ok(state.performance.antialiasSamples>=2,'The live page has multisampled edge coverage');
  const old=baseline.find(item=>item.viewport.width===viewport.width),sizes=[];
  assert.equal(await page.locator('.city-label,#map-tooltip').count(),0,'City pins and hover tooltip stay removed');
  assert.equal(await page.locator('.translations [lang="pl"]').textContent(),'Wybierz język.','Polish copy keeps its UTF-8 accents');
  assert.equal(await page.locator('.translations [lang="nb"]').textContent(),'Velg språk.','Norwegian copy keeps its UTF-8 accents');
  for(const text of await page.locator('.option-arrow').allTextContents())assert.equal(text,'↗','Navigation arrow keeps its correct encoding');
  for(const m of state.landmarkArtwork){
   assert.equal(m.userData.paperIllustration,true,`${m.name} is paper architecture`);
   assert.equal(m.userData.dimensional,false,`${m.name} has no volumetric object model`);
   assert.ok(m.bounds.max[1]-m.bounds.min[1]>.5,`${m.name} stands upright`);
   assert.ok(m.meshes.every(m=>m.opaque&&m.depthWrite),`${m.name} has opaque painted surfaces`);
   assert.ok(m.meshes.every(m=>m.softEdges),`${m.name} uses soft silhouette coverage`);
   const now=screenSize(m.bounds,state,viewport),previous=old?.state.landmarkArtwork.find(item=>item.name===m.name);
   if(previous){const was=screenSize(previous.bounds,old.state,viewport);assert.ok(now.width>=was.width*1.7,`${m.name} is substantially larger (${now.width.toFixed(1)}px vs ${was.width.toFixed(1)}px)`);}
   sizes.push({name:m.name,...now});
  }
  for(const id of ['brandenburg','cologne','edinburgh','iceland_volcano'])assert.ok(state.landmarkArtwork.some(m=>m.name===`landmark-${id}`),`${id} is present`);
  for(const m of state.seaArtwork){
   assert.equal(m.userData.fullWaterSupport,true,`${m.name} entire painted vignette stays over sea`);
   assert.equal(m.userData.waterPigment,'shared-chart-wash',`${m.name} shares the sea's pigment`);
  }
  assert.equal(state.scenery.paperIllustration,true,'Scenery uses paper illustrations');
  assert.ok(state.scenery.treeCount>=(viewport.width<760?450:800),'Denser woodland is scattered across the map');
  assert.ok(state.scenery.houseCount>=(viewport.width<760?50:80)&&state.scenery.lighthouseCount>=2&&state.scenery.rockCount>=15,'Countryside and sea scenery is populated');
  assert.ok(state.performance.calls<=65,`Batched scene draw budget (${state.performance.calls})`);
  await page.screenshot({path:`outputs/paper-v6-${viewport.width}.png`});
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname));
  assert.ok(resources.some(x=>x.includes('paper-atlas-v6')),'New paper artwork loads');
  assert.ok(!resources.some(x=>/atlas-models\.js|maritime-engraving|landmarks-ink/.test(x)),'Retired solid models and artwork stay unloaded');
  assert.deepEqual(errors,[],'No shader, resource or runtime errors');
  reports.push({viewport,state,sizes,resources});await page.close();
 }
 await fs.writeFile('outputs/paper-v6-review.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports.map(({viewport,state})=>({viewport,performance:state.performance,landmarks:state.landmarkCount,vignettes:state.creatureCount,houses:state.scenery.houseCount,lighthouses:state.scenery.lighthouseCount,rocks:state.scenery.rockCount})),null,2));
}finally{await browser.close();}
