import {createMapModelMaterial,createModelBuilder} from './atlas-models.js';

// An embossed brass/ivory instrument, with real raised facets and an open rim.
export function addCompassModel({THREE,scene,worldPoint}){
 const b=createModelBuilder(THREE),ink=0x465a4b,gold=0xc29748,ivory=0xe8d5a5;
 b.cylinder(0,.035,0,2.35,2.35,.08,ivory,96);
 for(const [r,thickness]of[[2.4,.035],[2.18,.018],[.55,.025]])b.add(new THREE.TorusGeometry(r,thickness,8,96),gold,[0,.105,0],[Math.PI/2,0,0]);
 for(let i=0;i<64;i++){const a=i/64*Math.PI*2,r=i%4?2.05:1.92;b.beam([Math.sin(a)*r,.10,Math.cos(a)*r],[Math.sin(a)*2.15,.10,Math.cos(a)*2.15],i%4?.008:.014,ink,5);}
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,long=i%2?1.45:2.05,r=.32;
  const points=[[0,.15,0],[Math.sin(a)*long,.12,Math.cos(a)*long],[Math.sin(a+Math.PI/2)*r,.12,Math.cos(a+Math.PI/2)*r],[0,.34,0],[Math.sin(a-Math.PI/2)*r,.12,Math.cos(a-Math.PI/2)*r]];
  for(const [indices,col]of[[[0,1,2,2,1,3,0,2,3],ivory],[[0,4,1,1,4,3,0,3,4],i%2?gold:ink]]){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(k=>points[k]),3));geo.computeVertexNormals();b.add(geo,col);
  }
 }
 b.sphere(0,.25,0,.14,.16,.14,gold);
 const model=b.finish('embossed-mariner-compass',createMapModelMaterial(THREE));model.position.copy(worldPoint([-16,58.5]));model.position.y=.01;model.userData.kind='solid-compass';scene.add(model);return model;
}
