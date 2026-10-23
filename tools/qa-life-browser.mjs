import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{
 for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'no-preference'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using static map fallback'))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/');
  await page.waitForFunction(()=>document.querySelector('#terrain-canvas').dataset.renderer==='webgl'||document.body.classList.contains('no-webgl'),null,{timeout:60000}).catch(error=>{throw new Error(`${error.message}: ${errors.join('; ')}`);});
  assert.deepEqual(errors,[],'Scene initializes without errors');
  await page.evaluate(async()=>{const app=await import('./assets/app.js');window.__life=app.inspectAmbientLife;window.__scene=app.inspectScene;});
  await page.waitForFunction(()=>window.__life().time>.6,null,{timeout:60000});
  const camera=await page.evaluate(()=>window.__scene().camera);
  assert.ok([...camera.position,...camera.target].every(v=>Number.isFinite(v)&&Math.abs(v)<200),'The first-frame camera remains finite and near the map');
  const before=await page.evaluate(()=>window.__life());
  await page.waitForFunction(t=>window.__life().time>t+1.2,before.time,{timeout:60000});
  const after=await page.evaluate(()=>({life:window.__life(),performance:window.__scene().performance}));
  assert.ok(after.life.enabled);assert.notDeepEqual(after.life.atmosphere.firstBird,before.atmosphere.firstBird,'Birds move without input');
  assert.notEqual(after.life.railway.motion.distance,before.railway.motion.distance,'Train advances without input');
  assert.ok(after.life.maritime.lastTime>before.maritime.lastTime,'Ships and claws advance');
  assert.equal(after.life.maritime.boatCount,12);assert.equal(after.life.maritime.clawCount,2);
  assert.equal(after.life.atmosphere.flocks.length,11);assert.ok(after.life.atmosphere.smokeSources.some(s=>s.kind==='volcano'));
  assert.ok(after.life.atmosphere.smokeSources.filter(s=>s.kind==='chimney').length>8);
  // Preference changes pause already-running animation and let rendering sleep.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!window.__scene().performance.active,null,{timeout:60000});
  const frozen=await page.evaluate(()=>({life:window.__life(),frames:window.__scene().performance.framesRendered}));
  await page.waitForTimeout(450);
  const still=await page.evaluate(()=>({life:window.__life(),frames:window.__scene().performance.framesRendered}));
  assert.equal(still.life.enabled,false);assert.equal(still.life.time,frozen.life.time);assert.equal(still.frames,frozen.frames,'Reduced-motion map sleeps');
  await page.screenshot({path:`outputs/living-atlas-${viewport.width}.png`});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(t=>window.__life().time>t+.2,frozen.life.time,{timeout:60000});
  // Exercise the Page Visibility handler independently of headless tab focus.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await page.evaluate(()=>({time:window.__life().time,frames:window.__scene().performance.framesRendered,active:window.__scene().performance.active}));
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(()=>({time:window.__life().time,frames:window.__scene().performance.framesRendered,active:window.__scene().performance.active})),hidden,'Hidden-page handler stops clocks and rendering');
  assert.equal(hidden.active,false);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(t=>window.__life().time>t,hidden.time,{timeout:60000});
  assert.deepEqual(errors,[],'No runtime, shader or resource errors');
  reports.push({viewport,birds:after.life.atmosphere.birdCount,smokeSources:after.life.atmosphere.smokeSources.length,waves:after.life.atmosphere.waveCount,boats:after.life.maritime.boatCount,performance:after.performance});await page.close();
 }
 await fs.writeFile('outputs/living-atlas-browser.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
}finally{await browser.close();}
