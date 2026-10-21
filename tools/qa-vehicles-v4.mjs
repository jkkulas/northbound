import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import * as THREE from 'three';
import { createVehicles, animateVehicle, routeNorway, routeTorpToOslo } from '../dist/assets/journey.js';

const root=path.resolve('dist'),output=path.resolve('outputs');
await fs.mkdir(output,{recursive:true});
const models=createVehicles({THREE,scene:new THREE.Scene()});
const measurements={};
for(const key of ['carModel','flightModel']) {
  const model=models[key];model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  let triangles=0,vertices=0,draws=0;
  model.traverse(object=>{
    if(!object.geometry)return;draws++;
    const position=object.geometry.getAttribute('position');
    assert.ok([...position.array].every(Number.isFinite),key+' has finite geometry');
    if(object.isMesh&&!object.userData.vehicleInkContour) {
      vertices+=position.count;triangles+=(object.geometry.index?.count||position.count)/3;
    }
  });
  measurements[key]={min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray(),vertices,triangles,draws};
  for(let i=0;i<=10;i++)animateVehicle(model,{time:i/3,progress:i/10,turn:Math.sin(i)*.2});
}
const car=measurements.carModel;
assert.ok(Math.max(Math.abs(car.min[0]),Math.abs(car.max[0]))*.65<.53,'Passat fits the route support width');
assert.ok(Math.max(Math.abs(car.min[2]),Math.abs(car.max[2]))*.65<.85,'Passat fits the route support length');
assert.ok(car.min[1]>=0,'Wheels remain above the local road contact');
assert.equal(models.carModel.userData.wheels.length,4);
assert.equal(models.flightModel.userData.engineFans.length,2);
assert.deepEqual(routeTorpToOslo().at(-1),[10.1,59.9]);
assert.ok(routeNorway([8.7,62.1]).length>2);

const html=String.raw`<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,">
<style>*{box-sizing:border-box}body{margin:0;background:#d6c497;color:#4c4938;font:20px Georgia,serif}h1{margin:28px 42px 6px;font-weight:400;font-size:30px}p{margin:0 42px;font-size:15px;color:#726346}#views{display:grid;grid-template-columns:1fr 1fr;margin:15px 24px;gap:18px}.view{position:relative;border:1px solid #a39269;background:#e8d9b3}canvas{display:block;width:100%;height:780px}.caption{position:absolute;left:24px;bottom:20px;font-size:18px}</style></head><body>
<h1 id="title"></h1><p>Opaque pigment, fine engraving, smooth dimensional geometry · isolated model QA</p>
<div id="views"><div class="view"><canvas id="front"></canvas><div class="caption">Forward three-quarter</div></div><div class="view"><canvas id="rear"></canvas><div class="caption">Rear three-quarter</div></div></div>
<script type="module">
import * as THREE from '/assets/vendor/three.module.min.js';
import {createVehicles} from '/assets/journey.js';
window.views=[];
for(const id of ['front','rear']){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8d9b3);
 const renderer=new THREE.WebGLRenderer({canvas:document.getElementById(id),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1.5);renderer.setSize(690,780,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const vehicles=createVehicles({THREE,scene});
 const camera=new THREE.OrthographicCamera(-2,2,2.26,-2.26,.01,100);
 views.push({renderer,scene,camera,vehicles,id});
}
window.showVehicle=(kind)=>{
 document.getElementById('title').textContent=kind==='car'?'Volkswagen Passat Variant — engraved model study':'Wizz-inspired Airbus passenger jet — engraved model study';
 for(const {renderer,scene,camera,vehicles,id}of views){
  vehicles.carModel.visible=kind==='car';vehicles.flightModel.visible=kind==='plane';
  const jet=kind==='plane',extent=jet?2.8:1.57;camera.left=-extent;camera.right=extent;camera.top=extent*780/690;camera.bottom=-camera.top;
  const distance=jet?6:4;
  camera.position.set(distance*(id==='front'?1:-1),distance*.72,distance*(id==='front'?-1.4:1.4));
  camera.lookAt(0,jet?.76:.39,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 return views.map(({renderer})=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}));
};
window.ready=true;
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
  const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try {res.writeHead(200,{'Content-Type':'text/javascript'}).end(await fs.readFile(filename));}
  catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const errors=[];
try {
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:940}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.ready);
  for(const kind of['car','plane']) {
    const render=await page.evaluate(kind=>window.showVehicle(kind),kind);
    await page.screenshot({path:path.join(output,'vehicle-'+kind+'-v4.png')});
    measurements[kind+'Render']=render;
  }
  assert.deepEqual(errors,[],'WebGL shaders and vehicle scene compile cleanly');
  await fs.writeFile(path.join(output,'vehicles-v4-qa.json'),JSON.stringify(measurements,null,2)+'\n');
  console.log(JSON.stringify(measurements,null,2));
  console.log('Vehicle geometry, support footprint, route contracts, animation and WebGL compilation passed.');
}finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
