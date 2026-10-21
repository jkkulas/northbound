import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const baseline=JSON.parse(await fs.readFile('outputs/paper-v6-review.json','utf8'));
const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[],near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-5,`${label}: ${a} vs ${b}`);
function screenSize(bounds,state,viewport){
 const camera=new THREE.PerspectiveCamera(state.camera.fov,state.camera.aspect,.1,600);
 camera.position.fromArray(state.camera.position);camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));camera.updateMatrixWorld();
 const points=[];for(const x of[bounds.min[0],bounds.max[0]])for(const y of[bounds.min[1],bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z).project(camera));
 return{width:(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*viewport.width/2,height:(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*viewport.height/2};
}
try{
 for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using static map fallback'))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(rootURL);
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas')?.dataset.renderer==='webgl'||document.body.classList.contains('no-webgl'),null,{timeout:60000});
  assert.deepEqual(errors,[],'Artwork initializes without falling back');
  assert.equal(await page.locator('body.no-webgl').count(),0);
  await page.evaluate(async()=>{window.__inspectAtlas=(await import(new URL('./assets/app.js',document.baseURI))).inspectScene;});
  await page.waitForFunction(()=>{const p=window.__inspectAtlas().performance;return p.framesRendered>0&&!p.active;},null,{timeout:60000});
  const state=await page.evaluate(()=>window.__inspectAtlas({artwork:true})),old=baseline.find(item=>item.viewport.width===viewport.width),sizes=[];
  assert.equal(state.landmarkCount,11);assert.equal(state.creatureCount,17);
  assert.deepEqual(state.camera.position,old.state.camera.position,'Existing point of view remains unchanged');
  assert.deepEqual(state.camera.target,old.state.camera.target);
  assert.ok(state.performance.antialiasSamples>=2,'Painted silhouettes retain multisampled coverage');
  assert.equal(await page.locator('.city-label,#map-tooltip').count(),0);
  assert.equal(await page.locator('.translations [lang="pl"]').textContent(),'Wybierz język.');
  assert.equal(await page.locator('.translations [lang="nb"]').textContent(),'Velg språk.');
  for(const text of await page.locator('.option-arrow').allTextContents())assert.equal(text,'↗');
  const hero=id=>state.landmarkArtwork.find(m=>m.name===`landmark-${id}`),previous=id=>old.state.landmarkArtwork.find(m=>m.name===`landmark-${id}`);
  assert.ok(!hero('bryggen')&&!hero('oslo'),'Bergen Bryggen and Oslo Opera are absent');
  near(hero('brandenburg').userData.illustrationWidth,previous('brandenburg').userData.illustrationWidth*.85,'Brandenburg Gate is15% smaller');
  for(const id of['nyhavn','edinburgh'])assert.ok(hero(id).userData.illustrationWidth<previous(id).userData.illustrationWidth,`${id} is smaller`);
  for(const id of['windmill','warsaw','cologne','brandenburg','nyhavn','edinburgh'])assert.equal(hero(id).userData.paintedBaseFootprint.wholePaintedBottom,true,`${id} fits its visible painted lower band`);
  assert.equal(hero('warsaw').userData.paintedBaseFootprint.bank,'west');
  assert.equal(hero('cologne').userData.paintedBaseFootprint.bank,'east');
  const volcano=hero('iceland_volcano'),[lon,lat]=volcano.userData.drawingCoordinates;
  assert.ok(lon>-20&&lon<-17&&lat>64.2&&lat<65.7,'Hekla drawing is in central Iceland');
  for(let i=2;i<volcano.meshes[0].geometryPosition.length;i+=3)near(volcano.meshes[0].geometryPosition[i],0,'Volcano illustration is upright and untilted');
  for(const model of state.landmarkArtwork){
   assert.equal(model.userData.paperIllustration,true);assert.equal(model.userData.dimensional,false);
   assert.ok(model.meshes.every(m=>m.opaque&&m.depthWrite&&m.softEdges),'Paper pigment and soft ink edges remain intact');
   sizes.push({name:model.name,worldWidth:model.userData.illustrationWidth,...screenSize(model.bounds,state,viewport)});
  }
  const rig=state.seaArtwork.find(m=>m.userData.asset==='offshore_rig'),oldRig=old.state.seaArtwork.find(m=>m.userData.asset==='offshore_rig');
  near(rig.userData.width,oldRig.userData.width*1.30,'Stavanger rig width grows30%');near(rig.userData.height,oldRig.userData.height*1.30,'Stavanger rig height grows30%');
  for(const model of state.seaArtwork){
   assert.equal(model.userData.fullWaterSupport,true);assert.equal(model.userData.fullHeroClearance,true);
   assert.equal(model.userData.heroClearanceCount,11);assert.ok(model.userData.checkedCameraHeights.length>=4);
   assert.equal(model.userData.waterPigment,'shared-chart-wash');
  }
  const scenery=state.scenery;
  for(const asset of [...scenery.houses,...scenery.lighthouses,...scenery.woodland.treeAssets]){
   assert.equal(asset.renderScale,2);near(asset.width,asset.baseWidth*2,'Land scenery width doubles');near(asset.height,asset.baseHeight*2,'Land scenery height doubles');
  }
  for(const rock of scenery.seaRocks)assert.equal(rock.renderScale,1,'Sea rocks keep their size');
  assert.equal(scenery.treeCount,viewport.width<760?780:1320);assert.equal(scenery.houseCount,viewport.width<760?76:122);
  assert.ok(scenery.lighthouseCount>=2);assert.equal(scenery.drawCalls+scenery.woodland.drawCalls,4,'Scenery stays batched');
  assert.ok(state.performance.calls<=65);
  await page.screenshot({path:`outputs/paper-v7-${viewport.width}.png`});
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname));
  assert.ok(resources.some(x=>x.includes('paper-atlas-v6')));assert.ok(!resources.some(x=>/atlas-models\.js|maritime-engraving|landmarks-ink/.test(x)));
  assert.deepEqual(errors,[],'No shader, resource or runtime errors');
  reports.push({viewport,state,sizes,resources});await page.close();
 }
 await fs.writeFile('outputs/paper-v7-review.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports.map(({viewport,state,sizes})=>({viewport,performance:state.performance,landmarks:state.landmarkCount,vignettes:state.creatureCount,houses:state.scenery.houseCount,lighthouses:state.scenery.lighthouseCount,sizes})),null,2));
}finally{await browser.close();}
