import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Same installed browser and software renderer as the journey regression suite.
// Counts are deterministic; timing is reported, never used as a hardware promise.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const baseline=process.argv.includes('--baseline');
const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const results=[];
await fs.mkdir('outputs',{recursive:true});
try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
    await page.goto(rootURL);
    await page.waitForFunction(()=>document.querySelector('#terrain-canvas').dataset.renderer==='webgl');
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(async()=>{window.__atlasInspect=(await import(new URL('./assets/app.js',document.baseURI))).inspectScene});
    const inspect=()=>page.evaluate(()=>window.__atlasInspect());
    // Poll a synchronous condition: a Promise itself is truthy in Playwright's
    // poller, so importing inside the predicate can report an idle frame early.
    await page.waitForFunction(()=>window.__atlasInspect().performance.framesRendered>0,null,{timeout:60000});
    await page.waitForFunction(()=>!window.__atlasInspect().performance.active,null,{timeout:60000});
    const idle=(await inspect()).performance;
    await page.waitForTimeout(350);
    const settled=(await inspect()).performance;
    if(!baseline){
      assert.equal(settled.framesRendered,idle.framesRendered,'Idle atlas stops rendering');
      assert.equal(settled.active,false,'Idle atlas has no scheduled frame');
    }
    if(!baseline){
      // Eleven upright paper landmarks, seventeen maritime vignettes,
      // forests, rivers and batched settlements share this fixed scene ceiling.
      // Keep the existing culled terrain budget; richer pigment is a shader cost.
      assert.ok(settled.calls<=65,`Paper atlas draw budget (65 max): ${settled.calls}`);
      assert.ok(settled.terrainTriangles<(viewport.width<760?100000:350000),`Culled land mesh budget: ${settled.terrainTriangles}`);
      const scene=await inspect();
      assert.equal(scene.landmarkCount,11,'All eleven remaining paper landmarks contribute to the measured scene');
      assert.equal(scene.creatureCount,17,'All seventeen sea illustrations contribute to the measured scene');
    }
    await page.screenshot({path:`outputs/${baseline?'before':'refined'}-${viewport.width}.png`});
    const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(({name,transferSize,decodedBodySize})=>({name:new URL(name).pathname,transferSize,decodedBodySize})));
    let illustrationBytes=0;
    if(!baseline){
      const illustrations=resources.filter(resource=>resource.name.endsWith('.webp'));
      const mobile=viewport.width<760;
      assert.equal(illustrations.length,2,'Only the two selected responsive illustration atlases load');
      for(const name of ['maritime-illustrated-v4','paper-atlas-v6'])assert.ok(illustrations.some(resource=>resource.name.endsWith(`${name}${mobile?'-mobile':''}.webp`)),'The viewport loads its responsive artwork');
      illustrationBytes=illustrations.reduce((sum,item)=>sum+item.decodedBodySize,0);
      assert.ok(illustrationBytes<(mobile?1200000:4800000),`Responsive illustration payload: ${illustrationBytes} bytes`);
    }
    results.push({viewport,performance:settled,illustrationBytes,resourceBytes:resources.reduce((sum,item)=>sum+item.decodedBodySize,0),resources});
    assert.deepEqual(errors,[],'No runtime or resource failures');
    await page.close();
  }
  await fs.writeFile(`outputs/${baseline?'before':'refined'}-performance.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(({resources,...report})=>report),null,2));
} finally {await browser.close()}
