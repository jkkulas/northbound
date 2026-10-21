// Geometry proof for doubled land scenery. Uses final live landmark records,
// the real atlas metadata, coast mask, DEM and rendered river-bank triangles.
// Texture pixels and WebGL are verified separately by the complete page QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Three from 'three';
import {PNG} from 'pngjs';
import {sampleTerrainHeight} from '../dist/assets/terrain-height.js';
import {createRiverBankExclusion} from '../dist/assets/atlas-terrain.js';
import {addSculptedWoodland,addMapScenery} from '../dist/assets/map-scenery.js';
import {NORWAY_ROAD_CORRIDORS} from '../dist/assets/journey.js';

const liveReport=process.argv[2]||'outputs/paper-v7-review.json';
const outputFile=process.argv[3]||'outputs/scenery-v7-support.json';
const states=JSON.parse(fs.readFileSync(liveReport,'utf8'));
const previous=JSON.parse(fs.readFileSync('outputs/paper-v6-review.json','utf8'));
const geography=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8'));
const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png'));
const data=fs.readFileSync('dist/assets/terrain.i16');
const elevations=new Int16Array(data.buffer,data.byteOffset,data.byteLength/2);
const atlas=JSON.parse(fs.readFileSync('dist/assets/paper-atlas-v6.json','utf8'));
const heightAt=(lon,lat)=>sampleTerrainHeight(elevations,lon,lat);
const worldPoint=([lon,lat],lift=0)=>new Three.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4);
const toGeo=(x,z)=>[x/2.2+13,60-z/4.4];
function regionAt([lon,lat]){
 const b=geography.bounds,x=Math.floor((lon-b.west)/(b.east-b.west)*mask.width),y=Math.floor((b.north-lat)/(b.north-b.south)*mask.height);
 return x>=0&&x<mask.width&&y>=0&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0;
}
const riverAt=createRiverBankExclusion({THREE:Three,geography,worldPoint,heightAt,regionAt});
const roads=NORWAY_ROAD_CORRIDORS.flatMap(path=>path.slice(1).map((end,i)=>[worldPoint(path[i]),worldPoint(end)]));

// Node needs no browser image decoder for the geometry proof. Actual atlas
// rectangles and the production createPaperCard function remain unchanged.
globalThis.fetch=async()=>({ok:true,json:async()=>atlas});
class GeometryTextureLoader{loadAsync(){return Promise.resolve(new Three.Texture());}}
const THREE={...Three,TextureLoader:GeometryTextureLoader};
const results=[];
function close(actual,expected,message,tolerance=2e-5){assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} vs ${expected}`);}
function compareLive(actual,expected,label){
 if(typeof actual==='number'){close(actual,expected,label,1e-9);return;}
 if(Array.isArray(actual)){assert.equal(actual.length,expected.length,label);actual.forEach((value,i)=>compareLive(value,expected[i],`${label}[${i}]`));return;}
 if(actual&&typeof actual==='object'){assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),label);for(const key of Object.keys(actual))compareLive(actual[key],expected[key],`${label}.${key}`);return;}
 assert.equal(actual,expected,label);
}
function dimensions(records){
 return {count:records.length,width:[Math.min(...records.map(r=>r.width)),Math.max(...records.map(r=>r.width))],height:[Math.min(...records.map(r=>r.height)),Math.max(...records.map(r=>r.height))]};
}
function verifySpacing(records,factor){
 let pairs=0;
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  const a=records[i],b=records[j],dx=a.position[0]-b.position[0],dz=a.position[2]-b.position[2],separation=(a.width+b.width)*factor;
  assert.ok(dx*dx+dz*dz>=separation*separation-1e-8,'Spacing follows the enlarged width, including across bin boundaries');pairs++;
 }
 return pairs;
}
function verifyMergedCards(mesh,records,{includeSea=false}={}){
 const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.pictureUv;
 let offset=0,widthChecks=0,heightChecks=0,groundChecks=0;
 for(const record of records){
  const sea=record.renderScale===1,columns=sea?1:Math.ceil(record.width/.22),count=columns*6;
  let left=Infinity,right=-Infinity;const columnHeights=new Map();
  for(let i=offset;i<offset+count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=uv.getX(i),v=uv.getY(i);left=Math.min(left,x);right=Math.max(right,x);
   const key=u.toFixed(7);if(!columnHeights.has(key))columnHeights.set(key,{});columnHeights.get(key)[v>.5?'top':'bottom']=y;
   if(v===0&&!sea){close(y,heightAt(...toGeo(x,z))+(record.asset==='fir'||record.asset==='oak'?.027:.035),'Card foot follows actual DEM',5e-5);groundChecks++;}
  }
  close(right-left,record.baseWidth*record.renderScale,'Actual merged geometry has the requested width');widthChecks++;
  for(const value of columnHeights.values())if(value.top!==undefined&&value.bottom!==undefined){close(value.top-value.bottom,record.baseHeight*record.renderScale*Math.cos(-.23),'Actual merged geometry has the requested height',5e-5);heightChecks++;}
  offset+=count;
 }
 assert.equal(offset,p.count,'Every merged vertex belongs to a verified card');
 return {widthChecks,heightChecks,groundChecks};
}

for(const entry of states){
 const mobile=entry.viewport.width<760,landmarks=entry.state.landmarkArtwork;
 assert.equal(landmarks.length,11,'Proof uses the eleven final live landmarks');
 assert.ok(!landmarks.some(m=>['landmark-oslo','landmark-bryggen'].includes(m.name)),'Removed buildings have no reserved frontage');
 const scene=new THREE.Scene(),options={THREE,scene,worldPoint,heightAt,regionAt,riverAt,mobile,landmarks};
 const forest=addSculptedWoodland(options),scenery=addMapScenery(options);await Promise.all([forest.ready,scenery.ready]);
 const trees=forest.group.userData.treeAssets,houses=scenery.group.userData.houses,lights=scenery.group.userData.lighthouses,rocks=scenery.group.userData.seaRocks;
 // Browser and Node transcendental functions can differ by a few last bits.
 // A 1e-9 tolerance is below any visible or geographic precision of this atlas.
 compareLive(trees,entry.state.scenery.woodland.treeAssets,'Live tree placement');
 compareLive(houses,entry.state.scenery.houses,'Live settlement placement');
 compareLive(lights,entry.state.scenery.lighthouses,'Live lighthouse placement');
 let supportSamples=0,roadChecks=0,drawCalls=0,triangles=0;
 for(const record of [...trees,...houses,...lights]){
  assert.equal(record.renderScale,2);close(record.width,record.baseWidth*2,'Recorded final width is exactly doubled');close(record.height,record.baseHeight*2,'Recorded final height is exactly doubled');
  const g=record.geo||record.drawingCoordinates,steps=Math.ceil(record.footWidth/.055);
  for(let i=0;i<=steps;i++)for(const dz of[-record.footDepth/2,0,record.footDepth/2]){
   const sample=[g[0]+(i/steps-.5)*record.footWidth/2.2,g[1]-dz/4.4];assert.ok(regionAt(sample),`${record.name||record.asset}: enlarged foot on land`);assert.equal(riverAt(sample),false,`${record.name||record.asset}: enlarged foot outside rivers`);supportSamples++;
  }
  const p=worldPoint(g);
  for(const[a,b]of roads){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));assert.ok(Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)>=1+record.width*.5-1e-8,'Doubled card remains clear of authored roads');roadChecks++;}
 }
 const old=previous.find(r=>r.viewport.width===entry.viewport.width).state.scenery.seaRocks;
 assert.equal(rocks.length,old.length,'Sea rock count is preserved');
 rocks.forEach((rock,i)=>{assert.equal(rock.renderScale,1);close(rock.width,old[i].size*1.9,'Sea rock width is preserved');close(rock.geo[0],old[i].geo[0],'Sea rock longitude is preserved');close(rock.geo[1],old[i].geo[1],'Sea rock latitude is preserved');});
 const forestGeometry=verifyMergedCards(forest.group.children.find(o=>o.isMesh),trees);
 const sceneryGeometry=verifyMergedCards(scenery.group.children.find(o=>o.isMesh),[...houses,...lights,...rocks],{includeSea:true});
 const spacingChecks={treePairs:verifySpacing(trees,.29),settlementPairs:verifySpacing(houses,.66)};
 scene.traverse(object=>{if(object.isMesh||object.isLine){drawCalls++;assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite));if(object.isMesh)triangles+=object.geometry.attributes.position.count/3;}});
 assert.equal(drawCalls,4);assert.equal(trees.length,mobile?780:1320);assert.equal(houses.length,mobile?76:122);assert.equal(lights.length,2);
 results.push({viewport:entry.viewport,livePlacementsMatch:true,liveNumericTolerance:1e-9,landmarksUsed:landmarks.map(m=>m.name),renderScale:2,trees:dimensions(trees),settlements:dimensions(houses),lighthouses:lights,seaRocks:{count:rocks.length,renderScale:1,unchanged:true},supportSamples,roadChecks,spacingChecks,actualGeometry:{forest:forestGeometry,scenery:sceneryGeometry,triangles,drawCalls}});
}
fs.writeFileSync(outputFile,JSON.stringify({liveReport,atlas:'paper-atlas-v6.json',method:'Actual final landmark metadata, original atlas dimensions, production merged geometry, full enlarged foot samples against real coast/river/DEM, and unchanged sea-rock baseline',results},null,2));
console.log(JSON.stringify(results.map(r=>({viewport:r.viewport,trees:r.trees.count,settlements:r.settlements.count,lighthouses:r.lighthouses.length,supportSamples:r.supportSamples,geometry:r.actualGeometry})),null,2));
