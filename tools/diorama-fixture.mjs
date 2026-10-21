import fs from 'node:fs';
import * as THREE from 'three';
import {PNG} from 'pngjs';
import {sampleTerrainHeight} from '../dist/assets/terrain-height.js';
import {addIllustratedGeography} from '../dist/assets/atlas-terrain.js';
import {createDryGround} from '../dist/assets/ground-support.js';

export function fixture(){
 const geography=JSON.parse(fs.readFileSync('dist/assets/geography.json','utf8')),bounds=geography.bounds;
 const mask=PNG.sync.read(fs.readFileSync('dist/assets/regions.png')),raw=fs.readFileSync('dist/assets/terrain.i16');
 const elevations=Int16Array.from({length:raw.length/2},(_,i)=>raw.readInt16LE(i*2));
 const regionAt=([lon,lat])=>{const x=Math.floor((lon-bounds.west)/(bounds.east-bounds.west)*mask.width),y=Math.floor((bounds.north-lat)/(bounds.north-bounds.south)*mask.height);return x>=0&&y>=0&&x<mask.width&&y<mask.height?Math.round(mask.data[(y*mask.width+x)*4]/85):0;};
 const heightAt=(lon,lat)=>sampleTerrainHeight(elevations,lon,lat),worldPoint=([lon,lat],lift=0)=>new THREE.Vector3((lon-13)*2.2,heightAt(lon,lat)+lift,(60-lat)*4.4);
 const scene=new THREE.Scene();addIllustratedGeography({THREE,scene,geography,worldPoint,heightAt,regionAt});
 const isDry=createDryGround({scene,regionAt,heightAt});
 return {THREE,scene,geography,worldPoint,heightAt,regionAt,isDry};
}
