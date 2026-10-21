// Real geometry, geographic anchors and physical support for the dimensional atlas.
// This audit builds the shipped modules against the shipped DEM and coast mask;
// it does not rely on surfaceFit/clear metadata or on obsolete picture UVs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {PNG} from 'pngjs';
import {addLandmarks,OPERA_FOOTPRINT} from './dist/assets/landmarks.js';
import {sampleTerrainHeight,ARCHITECTURAL_TERRACES} from './dist/assets/terrain-height.js';
import {addIllustratedGeography} from './dist/assets/atlas-terrain.js';
import {routeNorway,routeTorpToOslo} from './dist/assets/journey.js';

const sources=JSON.parse(fs.readFileSync('data/landmark-locations.json','utf8'));
const geography=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8')),bounds=geography.bounds;
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png')),raw=fs.readFileSync('dist/assets/terrain.i16');
const elevations=Int16Array.from({length:raw.length/2},(_,i)=>raw.readInt16LE(i*2));
const regionAt=([lon,lat])=>{const x=Math.floor((lon-bounds.west)/(bounds.east-bounds.west)*mask.width),y=Math.floor((bounds.north-lat)/(bounds.north-bounds.south)*mask.height);return x>=0&&y>=0&&x<mask.width&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0};
const heightAt=(lon,lat)=>sampleTerrainHeight(elevations,lon,lat);
const worldPoint=([lon,lat],lift=0)=>new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4);
const geographic=p=>[p.x/2.2+13,60-p.z/4.4];
const groundAt=p=>regionAt(geographic(p))?heightAt(...geographic(p)):-.05;
const distanceKm=(a,b)=>{const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad,s=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;return 12742*Math.asin(Math.sqrt(s));};
const scene=new THREE.Scene(),result=addLandmarks({THREE,scene,worldPoint,heightAt,regionAt});await result.ready;
assert.equal(result.objects.length,9,'All nine researched landmarks exist');
assert.equal(sources.landmarks.length,9,'All landmarks have location records');
const report=[];
for(const model of result.objects){
 const id=model.name.replace('landmark-',''),source=sources.landmarks.find(x=>x.id===id);assert.ok(source,'Documented real landmark '+id);assert.ok(source.sources.some(url=>url.startsWith('https://')),'Primary operator/tourism/map source present');
 for(let i=0;i<2;i++)assert.ok(Math.abs(model.userData.coordinates[i]-source.coordinates[i])<1e-6,id+': anchor matches researched coordinates');
 assert.ok(model.position.distanceTo(worldPoint(source.coordinates,.035))<1e-6,id+': actual scene root matches geolocation');
 const drawn=source.drawingCoordinates||source.coordinates;for(let i=0;i<2;i++)assert.ok(Math.abs(model.userData.drawingCoordinates[i]-drawn[i])<1e-6,id+': no undocumented cartographic relocation');
 if(model.userData.grounding==='land')assert.ok(regionAt(source.coordinates),id+': inland root lies on land');
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());assert.ok(Math.min(size.x,size.y,size.z)>.7,id+': physically dimensional in all three axes');
 let vertices=0,triangles=0,volume=0,contact=0,buried=0,minGap=Infinity,maxGap=-Infinity,nonHorizontal=0,meshes=0;
 model.traverse(part=>{
  if(!part.isMesh)return;meshes++;const geometry=part.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
  assert.ok(!part.material.map&&!part.material.uniforms?.uArtwork,id+': solid architecture does not use an artwork cutout');assert.equal(part.material.transparent,false,id+': surfaces are opaque');assert.equal(part.material.depthWrite,true,id+': architecture participates in depth');
  vertices+=p.count;triangles+=(geometry.index?.count||p.count)/3;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),center=box.getCenter(new THREE.Vector3()),indices=geometry.index?.array;
  for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i).applyMatrix4(part.matrixWorld);assert.ok(Number.isFinite(a.x+a.y+a.z),id+': finite world geometry');const gap=a.y-groundAt(a);minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);if(gap>=-.16&&gap<=.18)contact++;if(gap<-.3)buried++;if(Math.abs(n.getY(i))<.7)nonHorizontal++;}
  const count=indices?.length||p.count;for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,indices?indices[i]:i).applyMatrix4(part.matrixWorld).sub(center);b.fromBufferAttribute(p,indices?indices[i+1]:i+1).applyMatrix4(part.matrixWorld).sub(center);c.fromBufferAttribute(p,indices?indices[i+2]:i+2).applyMatrix4(part.matrixWorld).sub(center);volume+=a.dot(b.cross(c))/6;}
 });
 assert.ok(triangles>=700,id+': detailed architecture is actually modeled');assert.ok(Math.abs(volume)>.5,id+': solid enclosed architectural volume');assert.ok(nonHorizontal>vertices*.15,id+': real walls, roofs and sides');assert.ok(contact>=30,id+': physical mesh has multiple contacts with relief/water');assert.ok(buried/vertices<.02,id+': building is not buried in the relief');assert.ok(maxGap>.8,id+': modeled roof rises above its ground');
 report.push({name:model.name,coordinates:source.coordinates,drawingCoordinates:drawn,meshes,triangles,solidVolume:+Math.abs(volume).toFixed(3),groundContactVertices:contact,buriedVertexPercent:+(buried/vertices*100).toFixed(3),minGroundGap:+minGap.toFixed(4),maxGroundGap:+maxGap.toFixed(4),bounds:{min:box.min.toArray(),max:box.max.toArray()},grounding:model.userData.grounding});
}
const gdansk=sources.landmarks.find(x=>x.id==='gdansk'),gdanskShift=distanceKm(gdansk.coordinates,gdansk.drawingCoordinates);assert.ok(gdanskShift>5&&gdanskShift<12,'Gdansk coastal displacement stays within its documented harbor-scale allowance');
const gdanskModel=result.objects.find(m=>m.name==='landmark-gdansk');let gdanskSea=0,gdanskLand=0;const gp=gdanskModel.children[0].geometry.attributes.position;for(let i=0;i<gp.count;i++){const p=new THREE.Vector3().fromBufferAttribute(gp,i).applyMatrix4(gdanskModel.children[0].matrixWorld);if(regionAt(geographic(p)))gdanskLand++;else gdanskSea++;}assert.ok(gdanskSea>20&&gdanskLand>gdanskSea,'Gdansk architecture meets the Baltic shore while remaining predominantly over land');
const copenhagen=result.objects.find(m=>m.name==='landmark-nyhavn'),cphBox=new THREE.Box3().setFromObject(copenhagen);assert.ok(cphBox.min.x/2.2+13>10.9&&cphBox.max.x/2.2+13<12.85,'Copenhagen ensemble stays over Sjælland, clear of Jutland and Sweden');assert.ok(cphBox.max.x-cphBox.min.x>2.8,'Copenhagen deliberately spans the island at atlas scale');
const opera=result.objects.find(m=>m.name==='landmark-oslo'),operaBox=new THREE.Box3().setFromObject(opera);assert.ok(operaBox.min.x-opera.position.x>=OPERA_FOOTPRINT.minX-1e-5,'Opera reserves its west arrival forecourt');assert.ok(operaBox.max.x-opera.position.x<=OPERA_FOOTPRINT.maxX+1e-5&&operaBox.min.z-opera.position.z>=OPERA_FOOTPRINT.minZ-1e-5&&operaBox.max.z-opera.position.z<=OPERA_FOOTPRINT.maxZ+1e-5,'Reserved Opera footprint encloses the actual complete model');
let routeClearance=Infinity;for(const route of[routeTorpToOslo(),routeNorway([9.54,61.77]),routeNorway([5.73,58.97])]){const curve=new THREE.CatmullRomCurve3(route.map(p=>worldPoint(p)),false,'centripetal');for(let i=0;i<=320;i++){const p=curve.getPointAt(i/320),dx=Math.max(operaBox.min.x-p.x,0,p.x-operaBox.max.x),dz=Math.max(operaBox.min.z-p.z,0,p.z-operaBox.max.z);routeClearance=Math.min(routeClearance,Math.hypot(dx,dz));}}assert.ok(routeClearance>.95,'Actual Opera model clears the entire arriving car corridor');
// Ray-test the shipped river geometry, rather than assuming a nearby line means
// that visible water reaches the bridge. Only the local Thames vector is needed.
const bridge=result.objects.find(m=>m.name==='landmark-london'),riverScene=new THREE.Scene();const thames=geography.rivers.filter(line=>line.some(([lo,la])=>lo>-.3&&lo<.5&&la>51.35&&la<51.6));assert.ok(thames.length,'The real Thames is present in the geographic data');
addIllustratedGeography({THREE,scene:riverScene,geography:{...geography,coasts:[],outlines:{no:[],pl:[]},rivers:thames},worldPoint,heightAt,regionAt});let ribbon;riverScene.traverse(o=>{if(o.name==='exaggerated-geographic-river-banks-and-water')ribbon=o;});ribbon.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(bridge.position.x,100,bridge.position.z),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(ribbon);assert.ok(hits.length,'Actual Thames ribbon crosses beneath Tower Bridge');assert.ok(hits[0].uv.x>.16&&hits[0].uv.x<.84,'Tower Bridge is over the water channel, not a painted bank');
// Terrace edits are local and continuous at every outside shoulder.
for(const patch of ARCHITECTURAL_TERRACES){const [lon,lat]=patch.coordinates,b=patch.box,edge=b[1]+patch.blend;const a=heightAt(lon+(edge-.0001)/2.2,lat),z=heightAt(lon+(edge+.0001)/2.2,lat);assert.ok(Math.abs(a-z)<.01,patch.id+': smooth terrace joins the original DEM');}
fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/landmark-support.json',JSON.stringify({verified:sources.verified,models:report,gdanskCoastalShiftKm:gdanskShift,operaRouteClearance:routeClearance,thamesWaterHit:hits[0].point.toArray(),terraces:ARCHITECTURAL_TERRACES},null,2));
console.log('All nine solid landmark models pass geolocation, actual mesh volume/contact, shoreline placement, Thames water and Opera route clearance checks.');
