import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const dist = path.resolve('dist');
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:0;background:#e5d6b2}canvas{display:block}p{position:fixed;bottom:12px;color:#4e4231;font:italic 20px Georgia;text-align:center;width:50%}p:nth-of-type(2){left:50%}</style></head><body><script type="module">
import * as THREE from '/assets/vendor/three.module.min.js';
import {createVehicles,animateVehicle} from '/assets/journey.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,740);renderer.setClearColor(0xe5d6b2);document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();const models=createVehicles({THREE,scene});const camera=new THREE.PerspectiveCamera(36,600/740,.01,100);
renderer.setScissorTest(true);let counts=[];
for(const [index,model] of [models.carModel,models.flightModel].entries()){
models.carModel.visible=models.flightModel.visible=false;model.visible=true;animateVehicle(model,{time:0,progress:0,speed:0});
const distance=index?9:5.1;camera.position.set(distance*.58,distance*.55,-distance*.85);camera.lookAt(0,index?.55:.65,0);camera.updateProjectionMatrix();
renderer.setViewport(index*600,0,600,740);renderer.setScissor(index*600,0,600,740);renderer.render(scene,camera);
const bounds=new THREE.Box3().setFromObject(model);let meshes=0,lines=0,nonOpaque=[];model.traverse(o=>{if(o.isMesh){meshes++;if(o.material.transparent||o.material.opacity!==1)nonOpaque.push(o.name)}if(o.isLineSegments)lines++});
counts.push({name:model.name,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},meshes,lines,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,nonOpaque});
}
window.__vehicleProof=counts;
</script><p>The overland motorcar · pigment and engraved coachwork</p><p>The flying machine · linen, copper and ink</p></body></html>`;
const server=http.createServer(async(req,res)=>{try{if(req.url==='/proof'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(dist+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1200,height:740}});const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(`http://127.0.0.1:${server.address().port}/proof`);await page.waitForFunction(()=>window.__vehicleProof);const proof=await page.evaluate(()=>window.__vehicleProof);assert.deepEqual(errors,[]);assert.ok(proof.every(p=>p.nonOpaque.length===0));assert.ok(proof[0].bounds.min[1]>.01);assert.ok(proof[0].bounds.max[0]-proof[0].bounds.min[0]<=1.53);assert.ok(proof[0].bounds.max[2]-proof[0].bounds.min[2]<=2.45);await page.screenshot({path:'outputs/vehicle-style-proof.png'});await fs.writeFile('outputs/vehicle-style-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
