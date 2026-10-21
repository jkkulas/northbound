// Independent audit of the shipped solid maritime models. This uses geometry,
// coastline pixels and a small software depth buffer: no alpha atlases, source
// pictures, placement flags, or browser-only image decoding are involved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './tools/diorama-fixture.mjs';
import {addLandmarks} from './dist/assets/landmarks.js';
import {addSeaCreatures} from './dist/assets/sea-creatures.js';

const reports=[];
fs.mkdirSync('outputs',{recursive:true});

function geometryOf(THREE,model){
 const triangles=[],bounds=new THREE.Box3(),point=new THREE.Vector3();let vertices=0,area=0,volume=0,meshes=0;
 model.updateMatrixWorld(true);
 model.traverse(part=>{
  if(!part.isMesh)return;
  meshes++;assert.ok(!part.material.map&&!part.material.uniforms?.uArtwork,`${model.name}: geometry carries its pigment`);
  assert.equal(part.material.transparent,false,`${model.name}: solid surfaces write opaque depth`);
  assert.equal(part.material.depthWrite,true,`${model.name}: depth is physically respected`);
  const geometry=part.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index,world=[];
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(part.matrixWorld);
   assert.ok(Number.isFinite(point.x+point.y+point.z),`${model.name}: finite vertex ${i}`);
   assert.ok(n&&Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)),`${model.name}: finite surface normal`);
   bounds.expandByPoint(point);world.push(point.clone());vertices++;
  }
  const ab=new THREE.Vector3(),ac=new THREE.Vector3(),cross=new THREE.Vector3();
  for(let i=0;i<(index?.count||p.count);i+=3){
   const a=world[index?index.getX(i):i],b=world[index?index.getX(i+1):i+1],c=world[index?index.getX(i+2):i+2];
   ab.subVectors(b,a);ac.subVectors(c,a);cross.crossVectors(ab,ac);area+=cross.length()*.5;
   // A translated reference keeps signed volumes numerically stable.
   const ra=a.clone().sub(model.position),rb=b.clone().sub(model.position),rc=c.clone().sub(model.position);
   volume+=ra.dot(new THREE.Vector3().crossVectors(rb,rc))/6;
   triangles.push([a,b,c]);
  }
 });
 return {triangles,bounds,vertices,area,volume:Math.abs(volume),meshes};
}

// Rasterize actual triangle silhouettes with perspective depth. Tiny rigging
// that falls between sample centers can be missed, but a large billboard or a
// ship hidden behind masonry cannot pass through this independent test.
function rasterize(THREE,triangles,camera,width,height){
 const depth=new Float32Array(width*height);depth.fill(Infinity);
 const project=p=>{const q=p.clone().project(camera);return [(q.x+1)*width*.5,(1-q.y)*height*.5,q.z];};
 for(const triangle of triangles){
  const [a,b,c]=triangle.map(project);
  if([a,b,c].some(p=>p[2]<=-1||p[2]>=1))continue;
  const determinant=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(determinant)<1e-8)continue;
  const x0=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])-.5)),x1=Math.min(width-1,Math.floor(Math.max(a[0],b[0],c[0])-.5)),y0=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1])-.5)),y1=Math.min(height-1,Math.floor(Math.max(a[1],b[1],c[1])-.5));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const xx=x+.5,yy=y+.5,wa=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/determinant,wb=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/determinant,wc=1-wa-wb;
   if(wa<0||wb<0||wc<0)continue;
   const z=a[2]*wa+b[2]*wb+c[2]*wc,id=y*width+x;if(z<depth[id])depth[id]=z;
  }
 }
 return depth;
}

for(const viewport of[{width:1440,height:1000},{width:1366,height:768},{width:390,height:844}]){
 const f=fixture(),{THREE,scene,regionAt}=f,mobile=viewport.width<760,camera=new THREE.PerspectiveCamera(mobile?44:40,viewport.width/viewport.height,.1,600);
 camera.position.set(...(mobile?[-5,77,110]:[-14,65,104]));camera.lookAt(new THREE.Vector3(...(mobile?[-5,0,3]:[-14,0,5])));camera.updateMatrixWorld(true);
 const landmarks=addLandmarks({...f,mobile,camera});await landmarks.ready;
 const sea=addSeaCreatures({...f,mobile,camera,landmarks:landmarks.objects});await sea.ready;scene.updateMatrixWorld(true);
 assert.equal(sea.objects.length,17,'All seventeen maritime scenes are modeled');
 assert.ok(sea.decorations.some(d=>d.name==='Jörmungandr'&&d.label),'Serpent label is retained');
 assert.ok(sea.decorations.some(d=>d.name==='Kraken'&&d.label),'Kraken label is retained');
 const rasterWidth=Math.ceil(viewport.width/1.5),rasterHeight=Math.ceil(viewport.height/1.5),landmarkGeometry=landmarks.objects.flatMap(m=>geometryOf(THREE,m).triangles),landmarkDepth=rasterize(THREE,landmarkGeometry,camera,rasterWidth,rasterHeight),models=[];
 for(const model of sea.objects){
  const geometry=geometryOf(THREE,model),{min,max}=geometry.bounds,size=geometry.bounds.getSize(new THREE.Vector3());
  assert.equal(geometry.meshes,1,`${model.name}: geometry is merged into one draw`);
  assert.ok(geometry.triangles.length>2500,`${model.name}: modeled detail, not a quad`);
  assert.ok(size.x>2&&size.y>1&&size.z>1,`${model.name}: genuine volume on every axis`);
  assert.ok(geometry.area>5&&geometry.volume>.06,`${model.name}: measurable three-dimensional solid`);
  let waterSamples=0,overLand=0;
  // The grid is finer than production placement and independently derived from
  // rendered vertices, not the advertised footprint or fullWaterSupport flag.
  const nx=Math.ceil(size.x/.075),nz=Math.ceil(size.z/.075);
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   const x=min.x+size.x*i/nx,z=min.z+size.z*j/nz;waterSamples++;
   if(regionAt([x/2.2+13,60-z/4.4]))overLand++;
  }
  assert.equal(overLand,0,`${model.name} ${viewport.width}: complete solid remains at sea`);
  const pixels=rasterize(THREE,geometry.triangles,camera,rasterWidth,rasterHeight);let visiblePixels=0,hiddenByLandmark=0;
  for(let i=0;i<pixels.length;i++)if(pixels[i]<Infinity){visiblePixels++;if(landmarkDepth[i]+1e-7<pixels[i])hiddenByLandmark++;}
  assert.equal(hiddenByLandmark,0,`${model.name} ${viewport.width}: landmark hides maritime geometry`);
  if(!mobile)assert.ok(visiblePixels>15,`${model.name}: present in desktop composition`);
  models.push({name:model.name,drawingCoordinates:[model.position.x/2.2+13,60-model.position.z/4.4],waterSamples,overLand,vertices:geometry.vertices,triangles:geometry.triangles.length,drawCalls:geometry.meshes,surfaceArea:geometry.area,solidVolume:geometry.volume,visiblePixels,hiddenByLandmark,bounds:{min:min.toArray(),max:max.toArray()}});
 }
 const triangles=models.reduce((sum,m)=>sum+m.triangles,0);assert.ok(triangles<260000,'Maritime detail stays within the merged-geometry budget');
 reports.push({viewport,raster:[rasterWidth,rasterHeight],triangles,models});
 // Dispose the offline scene between viewports so the audit itself stays small.
 scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});
}
fs.writeFileSync('outputs/composition-regression.json',JSON.stringify(reports,null,2));
console.log(`Solid composition passes: 17 models at ${reports.length} viewports, ${reports.flatMap(r=>r.models).reduce((n,m)=>n+m.waterSamples,0).toLocaleString()} independent water samples; no model hidden behind a landmark; ${reports[0].triangles.toLocaleString()} maritime triangles in 17 draws.`);
