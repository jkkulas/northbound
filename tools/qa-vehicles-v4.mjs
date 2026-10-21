import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Browser-side verification uses the real atlas loader and shaders, rather
// than constructing synthetic solid geometry in Node.
const root=path.resolve('dist'),output=path.resolve('outputs');
await fs.mkdir(output,{recursive:true});
const html=String.raw`<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>
*{box-sizing:border-box}body{margin:0;background:#d6c497;color:#4c4938;font:20px Georgia,serif}h1{margin:28px 42px 6px;font-weight:400;font-size:30px}p{margin:0 42px;font-size:15px;color:#726346}#views{display:grid;grid-template-columns:1fr 1fr;margin:15px 24px;gap:18px}.view{position:relative;border:1px solid #a39269;background:#e8d9b3}canvas{display:block;width:100%;height:780px}.caption{position:absolute;left:24px;bottom:20px;font-size:18px}
</style></head><body><h1 id="title"></h1><p>Upright isometric ink and watercolor, with a separate geographic contact footprint</p><div id="views"><div class="view"><canvas id="front"></canvas><div class="caption">Paper diorama illustration</div></div><div class="view"><canvas id="rear"></canvas><div class="caption">Turning without becoming edge-on</div></div></div><script type="module">
import * as THREE from '/assets/vendor/three.module.min.js';
import {createVehicles,animateVehicle,routeNorway,routeTorpToOslo} from '/assets/journey.js';
window.views=[];
for(const id of ['front','rear']){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8d9b3);
 const renderer=new THREE.WebGLRenderer({canvas:document.getElementById(id),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1.5);renderer.setSize(690,780,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const camera=new THREE.OrthographicCamera(-2,2,2.26,-2.26,.01,100);
 const vehicles=createVehicles({THREE,scene,camera});await vehicles.ready;vehicles.arrival.visible=false;
 views.push({renderer,scene,camera,vehicles,id});
}
window.measure=()=>{
 const results={};
 for(const key of ['carModel','flightModel']){
  const model=views[0].vehicles[key],meshes=[];
  model.updateMatrixWorld(true);
  model.traverse(object=>{if(object.isMesh){const p=object.geometry.attributes.position;meshes.push({vertices:p.count,triangles:(object.geometry.index?.count||p.count)/3,finite:[...p.array].every(Number.isFinite)});}});
  const box=new THREE.Box3().setFromObject(model);
  results[key]={size:box.getSize(new THREE.Vector3()).toArray(),meshes,style:model.userData.style,groundProbes:model.userData.groundProbes,footprint:model.userData.footprint,ready:model.userData.artworkReady};
 }
 results.routes={torp:routeTorpToOslo().at(-1),norway:routeNorway([8.7,62.1]).length};
 return results;
};
window.showVehicle=(kind)=>{
 document.getElementById('title').textContent=kind==='car'?'Volkswagen Passat Variant - paper illustration':'Wizz-inspired Airbus passenger jet - paper illustration';
 return views.map(({renderer,scene,camera,vehicles,id})=>{
  vehicles.carModel.visible=kind==='car';vehicles.flightModel.visible=kind==='plane';
  const model=kind==='car'?vehicles.carModel:vehicles.flightModel;
  const jet=kind==='plane',extent=jet?3.5:1.9;camera.left=-extent;camera.right=extent;camera.top=extent*780/690;camera.bottom=-camera.top;
  camera.position.set(id==='front'?-2:3,5,10);camera.lookAt(0,jet?1.25:.7,0);camera.updateProjectionMatrix();
  model.rotation.set(id==='front'?.12:-.15,id==='front'?-2.7:1.2,id==='front'?-.08:.09,'YXZ');
  animateVehicle(model,{time:1,progress:.43,turn:.1});model.updateMatrixWorld(true);
  const up=new THREE.Vector3(0,1,0).applyQuaternion(model.userData.illustration.getWorldQuaternion(new THREE.Quaternion()));
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(model.userData.illustration.getWorldQuaternion(new THREE.Quaternion()));
  const cameraDirection=camera.position.clone().sub(model.position).setY(0).normalize();
  renderer.render(scene,camera);
  return{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,upright:up.y,facing:normal.dot(cameraDirection)};
 });
};
window.ready=true;
</script></body></html>`;
const types={'.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
 const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'}).end(await fs.readFile(filename));}
 catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:940}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.ready,{},{timeout:60000}).catch(error=>{console.error('Browser errors:',errors);throw error;});
 const measurements=await page.evaluate(()=>window.measure());
 for(const key of ['carModel','flightModel']){
  const item=measurements[key];assert.equal(item.ready,true,key+' finished loading');
  assert.equal(item.style,'isometric-paper-diorama');
  assert.equal(item.meshes.length,1,key+' uses one illustrated card');
  assert.equal(item.meshes[0].triangles,2,key+' has no volumetric model geometry');
  assert.equal(item.meshes[0].finite,true);assert.ok(item.size[1]>.7,key+' stands upright');
  assert.ok(item.size[2]<item.size[1]*.3,key+' stays a thin paper plane');
 }
 const car=measurements.carModel;
 assert.equal(car.groundProbes.length,15,'support probes cover the contact footprint');
 for(const[x,y,z]of car.groundProbes){
  assert.ok([x,y,z].every(Number.isFinite));
  assert.ok(Math.abs(x)*.65<=.53&&Math.abs(z)*.65<=.85,'car contact fits route support grid');
  assert.equal(y,0,'contact probes sit on the local road');
 }
 assert.deepEqual(measurements.routes.torp,[10.1,59.9]);assert.ok(measurements.routes.norway>2);
 for(const kind of ['car','plane']){
  const render=await page.evaluate(kind=>window.showVehicle(kind),kind);
  for(const view of render){assert.ok(view.upright>.99,'card remains upright on a sloping road');assert.ok(view.facing>.99,'card remains readable through turns');assert.equal(view.triangles,2);}
  await page.screenshot({path:path.join(output,'vehicle-'+kind+'-v5.png')});measurements[kind+'Render']=render;
 }
 assert.deepEqual(errors,[],'atlas, WebGL shaders and illustration scene compile cleanly');
 await fs.writeFile(path.join(output,'vehicles-v5-qa.json'),JSON.stringify(measurements,null,2)+'\n');
 console.log(JSON.stringify(measurements,null,2));
 console.log('Upright vehicle illustrations, contact footprint, route contracts, turns and WebGL rendering passed.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
