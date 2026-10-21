// Audit the complete soft-ink maritime silhouette against the real geography.
// Actual atlas UV triangles recover upright painted surfaces, including mirrored
// ships. Camera rays then locate their visible footprint on the water plane.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {chromium} from 'playwright-core';
import {PNG} from 'pngjs';
const rootURL=process.env.NORTHBOUND_TEST_URL||'http://127.0.0.1:4173/';
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png'));
const geography=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8'));
const SEA=-.05,ALPHA=.02,MAX_OVERLAP=.08;
const region=([lon,lat])=>{const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),y=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0};

function pigmentSurface(model){
 const positions=model.geometryPosition,uv=model.geometryUv;
 assert.ok(positions?.length&&uv?.length===positions.length/3*2,`${model.name}: inspectable painted surface`);
 const matrix=new THREE.Matrix4().fromArray(model.matrixWorld),vertices=[];
 for(let i=0;i<positions.length;i+=3)vertices.push(new THREE.Vector3().fromArray(positions,i).applyMatrix4(matrix));
 const indices=model.geometryIndex?.length?model.geometryIndex:Array.from({length:vertices.length},(_,i)=>i);
 // These are four-vertex quads, not terrain meshes. Working directly in atlas
 // UVs avoids assuming that the picture's left edge is the geometry's left edge.
 const triangles=[];
 for(let i=0;i<indices.length;i+=3){
  const [ia,ib,ic]=indices.slice(i,i+3),a=[uv[ia*2],uv[ia*2+1]],b=[uv[ib*2],uv[ib*2+1]],c=[uv[ic*2],uv[ic*2+1]];
  const determinant=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(determinant)<1e-12)continue;
  triangles.push({a,b,c,determinant,pa:vertices[ia],pb:vertices[ib],pc:vertices[ic]});
 }
 return{vertices,pointAt(u,v,target){
  for(const t of triangles){
   const wa=((t.b[1]-t.c[1])*(u-t.c[0])+(t.c[0]-t.b[0])*(v-t.c[1]))/t.determinant;
   const wb=((t.c[1]-t.a[1])*(u-t.c[0])+(t.a[0]-t.c[0])*(v-t.c[1]))/t.determinant,wc=1-wa-wb;
   if(Math.min(wa,wb,wc)<-1e-6)continue;
   target.copy(t.pa).multiplyScalar(wa).addScaledVector(t.pb,wb).addScaledVector(t.pc,wc);return true;
  }
  return false;
 }};
}

// Recover the printed opacity at a screen point from the actual live mesh and
// source image. Perspective-correct UVs include the warped lower paper band.
function projectedHero(mesh,camera,bitmap,name){
 const matrix=new THREE.Matrix4().fromArray(mesh.matrixWorld),vertices=[];
 for(let i=0;i<mesh.geometryPosition.length;i+=3){
  const world=new THREE.Vector3().fromArray(mesh.geometryPosition,i).applyMatrix4(matrix),view=world.clone().applyMatrix4(camera.matrixWorldInverse),screen=world.clone().project(camera);
  vertices.push({x:screen.x,y:screen.y,q:-1/view.z,u:mesh.geometryUv[i/3*2],v:mesh.geometryUv[i/3*2+1]});
 }
 const bounds=[Math.min(...vertices.map(p=>p.x)),Math.min(...vertices.map(p=>p.y)),Math.max(...vertices.map(p=>p.x)),Math.max(...vertices.map(p=>p.y))],size=24,cells=Array.from({length:size*size},()=>[]),triangles=[];
 const cell=(n,axis)=>Math.max(0,Math.min(size-1,Math.floor((n-bounds[axis])/(bounds[axis+2]-bounds[axis])*size)));
 const index=mesh.geometryIndex?.length?mesh.geometryIndex:Array.from({length:vertices.length},(_,i)=>i);
 for(let i=0;i<index.length;i+=3){const a=vertices[index[i]],b=vertices[index[i+1]],c=vertices[index[i+2]],d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(d)<1e-12)continue;const id=triangles.length;triangles.push({a,b,c,d});for(let y=cell(Math.min(a.y,b.y,c.y),1);y<=cell(Math.max(a.y,b.y,c.y),1);y++)for(let x=cell(Math.min(a.x,b.x,c.x),0);x<=cell(Math.max(a.x,b.x,c.x),0);x++)cells[y*size+x].push(id);}
 const opacity=(u,v)=>{
  const px=u*bitmap.width-.5,py=(1-v)*bitmap.height-.5,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
  const alpha=(dx,dy)=>bitmap.data[(Math.max(0,Math.min(bitmap.height-1,iy+dy))*bitmap.width+Math.max(0,Math.min(bitmap.width-1,ix+dx)))*4+3]/255;
  return(alpha(0,0)*(1-fx)+alpha(1,0)*fx)*(1-fy)+(alpha(0,1)*(1-fx)+alpha(1,1)*fx)*fy;
 };
 return{name,bounds,painted(x,y){
  if(x<bounds[0]||x>bounds[2]||y<bounds[1]||y>bounds[3])return false;
  for(const id of cells[cell(y,1)*size+cell(x,0)]){const {a,b,c,d}=triangles[id],wa=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/d,wb=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/d,wc=1-wa-wb;if(Math.min(wa,wb,wc)<-1e-6)continue;const q=wa*a.q+wb*b.q+wc*c.q;if(opacity((wa*a.u*a.q+wb*b.u*b.q+wc*c.u*c.q)/q,(wa*a.v*a.q+wb*b.v*b.q+wc*c.v*c.q)/q)>=ALPHA)return true;}
  return false;
 }};
}

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
fs.mkdirSync('outputs',{recursive:true});
try{
 for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[],warnings=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());else if(message.type()==='warning')warnings.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(rootURL,{waitUntil:'load'});
  await page.waitForFunction(()=>{const data=document.querySelector('#terrain-canvas')?.dataset;return data?.artwork==='illuminated-atlas'||document.body.classList.contains('no-webgl');},null,{timeout:60000});
  assert.equal(await page.locator('#terrain-canvas').getAttribute('data-artwork'),'illuminated-atlas','Artwork loads: '+JSON.stringify({errors,warnings}));
  await page.evaluate(async()=>{window.__compositionInspect=(await import(new URL('./assets/app.js',document.baseURI))).inspectScene;});
  await page.waitForFunction(()=>{const p=window.__compositionInspect().performance;return p.framesRendered>=1&&!p.active;},null,{timeout:60000});
  const state=await page.evaluate(()=>window.__compositionInspect({artwork:true}));
  assert.equal(state.seaArtwork?.length,17,'inspectScene exposes all seventeen live maritime vignettes');
  const encoded=await page.evaluate(async urls=>{
   const result=[];
   for(const url of urls){const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);result.push({url,png:c.toDataURL('image/png').split(',')[1]});}
   return result;
  },[...new Set([...state.seaArtwork.map(model=>model.atlas),...state.landmarkArtwork.flatMap(model=>model.meshes.map(mesh=>mesh.atlas))])]);
  const images=new Map(encoded.map(({url,png})=>[url,PNG.sync.read(Buffer.from(png,'base64'))]));
  const maritimeUrls=new Set(state.seaArtwork.map(model=>model.atlas));assert.equal(maritimeUrls.size,1,'All maritime art shares one illustrated atlas');
  for(const url of maritimeUrls){const image=images.get(url);assert.deepEqual([image.width,image.height],viewport.width<760?[1536,576]:[3072,1152],'Expected full-resolution or mobile maritime artwork');}
  const baseCamera=new THREE.PerspectiveCamera(state.camera.fov,state.camera.aspect,.1,600);
  baseCamera.position.fromArray(state.camera.position);baseCamera.lookAt(new THREE.Vector3().fromArray(state.camera.target));baseCamera.updateMatrixWorld();
  for(const cameraHeight of [...new Set([state.camera.position[1],45,85,115])]){
   const camera=baseCamera.clone();camera.position.y=cameraHeight;camera.updateMatrixWorld();
   const heroes=state.landmarkArtwork.flatMap(landmark=>landmark.meshes.map(mesh=>{
    assert.ok(mesh.geometryPosition?.length&&mesh.matrixWorld?.length&&mesh.geometryUv?.length,landmark.name+': inspectable live hero geometry');
    return projectedHero(mesh,camera,images.get(mesh.atlas),landmark.name);
   }));
   const models=[];
   for(const model of state.seaArtwork){
   assert.ok(model.userData.scale>=1.30,model.name+': noticeably enlarged maritime art');
   assert.equal(model.userData.edgeAlpha,ALPHA,model.name+': placement includes the antialiased fringe');
   assert.equal(model.userData.fullHeroClearance,true,model.name+': unobscured painted silhouette');
   assert.equal(model.userData.heroClearanceCount,state.landmarkArtwork.length,model.name+': every hero included in fitting');
   assert.ok(model.userData.checkedCameraHeights.includes(cameraHeight),model.name+': layout tested at this camera elevation');
   if(model.userData.asset==='offshore_rig')assert.ok(Math.abs(model.userData.width-(viewport.width<760?8.112:11.323))<1e-6,'Stavanger platform enlarged another30%');
   const surface=pigmentSurface(model),point=new THREE.Vector3(),projected=new THREE.Vector3(),bitmap=images.get(model.atlas);
   const us=model.geometryUv.filter((_,i)=>i%2===0),vs=model.geometryUv.filter((_,i)=>i%2===1),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
   let sampled=0,overLand=0,totalWeight=0,landWeight=0,visible=0,unmapped=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,minGap=Infinity,maxGap=-Infinity;
   const encroachments=[],heroOcclusions=new Map();
   for(const p of surface.vertices){const gap=p.y-SEA;minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);}
   for(let y=Math.max(0,Math.ceil((1-v1)*bitmap.height-.5));y<Math.min(bitmap.height,(1-v0)*bitmap.height-.5);y++)for(let x=Math.max(0,Math.ceil(u0*bitmap.width-.5));x<Math.min(bitmap.width,u1*bitmap.width-.5);x++){
    const weight=bitmap.data[(y*bitmap.width+x)*4+3]/255;if(weight<ALPHA)continue;
    const u=(x+.5)/bitmap.width,v=1-(y+.5)/bitmap.height;
    if(!surface.pointAt(u,v,point)){unmapped++;continue;}
    projected.copy(point).project(camera);
    const sx=(projected.x+1)*viewport.width/2,sy=(1-projected.y)*viewport.height/2;
    if(projected.z>=-1&&projected.z<=1&&sx>=0&&sx<=viewport.width&&sy>=0&&sy<=viewport.height)visible++;
    for(const hero of heroes)if(hero.painted(projected.x,projected.y))heroOcclusions.set(hero.name,(heroOcclusions.get(hero.name)||0)+1);
    minX=Math.min(minX,sx);minY=Math.min(minY,sy);maxX=Math.max(maxX,sx);maxY=Math.max(maxY,sy);
    // Intersect the overview viewing ray with the real sea. Checking the quad's
    // raw x/z would miss upper sails and tentacles projected across a coastline.
    const rayScale=(SEA-camera.position.y)/(point.y-camera.position.y);
    const seaX=camera.position.x+(point.x-camera.position.x)*rayScale,seaZ=camera.position.z+(point.z-camera.position.z)*rayScale,geo=[seaX/2.2+13,60-seaZ/4.4];
    sampled++;totalWeight+=weight;if(region(geo)){overLand++;landWeight+=weight;if(encroachments.length<5)encroachments.push({pixel:[x,y],geo:geo.map(v=>+v.toFixed(6)),alpha:+weight.toFixed(3)});}
   }
   const footprintPoints=surface.vertices.map(p=>{const t=(SEA-camera.position.y)/(p.y-camera.position.y);return[camera.position.x+(p.x-camera.position.x)*t,camera.position.z+(p.z-camera.position.z)*t];});
   const footprint=[Math.min(...footprintPoints.map(p=>p[0])),Math.min(...footprintPoints.map(p=>p[1])),Math.max(...footprintPoints.map(p=>p[0])),Math.max(...footprintPoints.map(p=>p[1]))];
   if(cameraHeight===state.camera.position[1])assert.ok(footprint.every((v,i)=>Math.abs(v-model.userData.footprint[i])<1e-4),model.name+': placement footprint matches rendered geometry');
   assert.deepEqual([...heroOcclusions],[],model.name+' atY'+cameraHeight+': complete visible silhouette stays clear of hero ink');
   if(model.userData.initialVisibility>.05)assert.ok(model.userData.paintVisibility>=model.userData.initialVisibility-.02001,model.name+': initial-frame visibility preserved');
   models.push({key:model.userData.placementKey,asset:model.userData.asset,drawingCoordinates:model.userData.drawingCoordinates,width:model.userData.width,lean:model.userData.lean,initialVisibility:model.userData.initialVisibility,paintVisibility:model.userData.paintVisibility,heroOcclusions:[...heroOcclusions],footprint,scale:model.userData.scale,name:model.name,mirror:model.userData.mirror,sampled,unmapped,visible,overLand,landPercent:+(100*landWeight/totalWeight).toFixed(4),encroachments,minSurfaceGap:+minGap.toFixed(5),maxSurfaceGap:+maxGap.toFixed(5),bounds:[minX,minY,maxX,maxY].map(v=>+v.toFixed(1))});
  }
  for(let i=0;i<models.length;i++)for(let j=i+1;j<models.length;j++){
   const a=models[i].footprint,b=models[j].footprint;
   const area=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
   const overlap=area/Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1]));
   assert.ok(overlap<=MAX_OVERLAP+1e-6,models[i].name+' / '+models[j].name+': distinct un-crowded silhouettes ('+(overlap*100).toFixed(2)+'%)');
  }
  assert.deepEqual(errors,[],'No shader, resource or runtime failures');
  reports.push({viewport,cameraHeight,models});
  }
  await page.screenshot({path:`outputs/composition-${viewport.width}.png`});await page.close();
 }
 fs.writeFileSync('outputs/composition-regression.json',JSON.stringify(reports,null,2));
 for(const report of reports)for(const model of report.models){
  assert.ok(model.sampled>100,`${model.name}: maritime pigment is present`);
  assert.equal(model.unmapped,0,`${model.name}: every pigment sample maps to the painted mesh`);
  assert.equal(model.overLand,0,`${model.name} at ${report.viewport.width} paints original pigment onto land (${model.landPercent}%)`);
  assert.ok(Math.abs(model.minSurfaceGap-.065)<=.005,`${model.name} ${report.viewport.width}: upright maritime model must meet its sea anchor (${model.minSurfaceGap})`);
  assert.ok(model.maxSurfaceGap-model.minSurfaceGap>1,`${model.name} ${report.viewport.width}: maritime illustration must retain its dimensional height`);
 }
 console.log(`Composition passes: all seventeen entire maritime vignettes project onto water at ${reports.length} viewport/elevation combinations (${reports.flatMap(r=>r.models).reduce((s,m)=>s+m.sampled,0).toLocaleString()} original pigment samples, including mirrored ships).`);
}finally{await browser.close();}
