import {loadPaperAtlas,createPaperCard} from './paper-art.js';
import {createRiverBankExclusion} from './atlas-terrain.js';

// Surveyed roots stay fixed. Painted lower bands are fitted through the actual
// overview camera onto the terrain, so they cannot appear to stand in water.
export const LANDMARK_SITES=Object.freeze([
 {asset:'stockholm',title:'Stockholm · City Hall',coordinates:[18.0542148,59.3274942],width:1.8,displayWidth:7.5,depth:.24,preferred:[-.65,.45],grounding:'waterfront',region:1},
 {asset:'nyhavn',title:'Copenhagen · Nyhavn',coordinates:[12.589145,55.680452],width:2.6,displayWidth:3.0,lean:.35,paintedBand:true,depth:.18,preferred:[-1.25,.45],grounding:'island-land',region:1,island:true,displayCoordinates:[11.9,55.4590909091],displayRadius:.4,displayStep:.025,displayYaws:[.80,.85,.90,.95,1,1.05]},
 {asset:'warsaw',title:'Warsaw · Royal Castle',coordinates:[21.014217,52.247749],width:1.8,displayWidth:7.5,paintedBand:true,depth:.28,preferred:[-1.15,.10],grounding:'west-bank',region:2,westBank:true,displayCoordinates:[18.832398818181815,51.747749],displayRadius:.4,displayYaws:[-.5]},
 {asset:'windmill',title:'Kinderdijk · Nederwaard Mill No. 2',coordinates:[4.6399791,51.8833949],width:1.2,displayWidth:4.8,lean:.25,paintedBand:true,depth:.19,preferred:[-1.5,-2.5],grounding:'land',region:1,lowland:true,displayCoordinates:[6.1863636363636365,52.51818181818182],displayRadius:.4,displayYaws:[-1]},
 {asset:'gdansk',title:'Gdańsk · Żuraw',coordinates:[18.6574644147,54.3505592969],width:1.7,displayWidth:7.5,depth:.22,preferred:[-.30,-.25],grounding:'coastal-harbor',region:2,coastal:true,yaw:-.36},
 {asset:'london',title:'London · Tower Bridge',coordinates:[-.0753665,51.5055158],width:3.75,displayWidth:7.2,depth:.22,preferred:[0,0],grounding:'river-crossing',region:1,yaw:-1.05,bridge:true},
 {asset:'borgund',title:'Lærdal · Borgund Stave Church',coordinates:[7.8122905,61.0472015],width:1.4,displayWidth:7.2,depth:.2,preferred:[0,.03],grounding:'land',region:3},
 {asset:'brandenburg',title:'Berlin · Brandenburg Gate',coordinates:[13.3777034,52.5162699],width:1.7,displayWidth:6.375,paintedBand:true,depth:.24,preferred:[0,.4],grounding:'land',region:1,displayCoordinates:[13.286794309090908,52.175360809090904],displayRadius:.4,displayYaws:[-.75]},
 {asset:'cologne',title:'Cologne · Cathedral',coordinates:[6.958138,50.9413035],width:1.5,displayWidth:7.2,paintedBand:true,displayCoordinates:[8.867228909090908,50.623121681818176],displayRadius:.4,depth:.24,preferred:[-1,.1],grounding:'east-bank',region:1,eastBank:true},
 {asset:'edinburgh',title:'Edinburgh · Castle',coordinates:[-3.2004184,55.9486884],width:1.4,displayWidth:6.55,paintedBand:true,depth:.26,preferred:[0,.25],grounding:'land',region:1,displayCoordinates:[-3.245872945454547,55.17596112727273],displayRadius:.4,displayYaws:[-.5]},
 {asset:'iceland_volcano',title:'Iceland - Hekla',coordinates:[-19.7067516667,63.9832686111],width:2.2,displayWidth:9.5,paintedBand:true,displayCoordinates:[-18.718181818181815,64.67272727272727],displayRadius:.4,lean:0,unwarped:true,depth:.35,preferred:[0,0],grounding:'natural-feature',region:1,naturalFeature:true},
]);
const toGeo=(x,z)=>[x/2.2+13,60-z/4.4];
function insideGeometry([x,y],geometry){const ring=points=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};return(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).some(p=>ring(p[0])&&!p.slice(1).some(ring));}
function nearestRiverAxis({THREE,geography,worldPoint,origin}){
 let best=Infinity,chosen;
 for(const line of geography.rivers||[])for(let i=1;i<line.length;i++){
  const a=worldPoint(line[i-1]),b=worldPoint(line[i]),dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((origin.x-a.x)*dx+(origin.z-a.z)*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(origin.x-a.x-dx*t,origin.z-a.z-dz*t);
  if(d<best){best=d;chosen=line;}
 }
 if(!chosen)return null;
 const curve=new THREE.CatmullRomCurve3(chosen.map(p=>worldPoint(p)),false,'centripetal');
 const points=curve.getPoints(Math.max(80,Math.ceil(curve.getLength()/.08)));
 const axis=z=>{const xs=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(z<Math.min(a.z,b.z)||z>Math.max(a.z,b.z)||Math.abs(a.z-b.z)<1e-8)continue;xs.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));}if(!xs.length)return null;return xs.reduce((a,b)=>Math.abs(a-origin.x)<Math.abs(b-origin.x)?a:b);};axis.line=chosen;return axis;
}
const searchOffsets=(()=>{const list=[[0,0]];for(let x=-18;x<=18;x++)for(let z=-18;z<=18;z++)if(x||z){if(Math.hypot(x,z)<=18)list.push([x*.12,z*.12]);}return list.sort((a,b)=>a[0]*a[0]+a[1]*a[1]-(b[0]*b[0]+b[1]*b[1]));})();
export function sampleLandmarkFootprint({x,z,width,depth,yaw=0,bridge=false}){
 const c=Math.cos(yaw),s=Math.sin(yaw),points=[],steps=Math.max(12,Math.ceil(width/.065));
 for(let i=0;i<=steps;i++){
  const u=i/steps;if(bridge&&u>.18&&u<.82)continue;
  for(const dz of[-depth/2,0,depth/2]){const dx=(u-.5)*width;points.push([x+dx*c+dz*s,z-dx*s+dz*c]);}
 }
 return points;
}
export function fitLandmarkGround({THREE,site,worldPoint,heightAt,regionAt,riverAt,geography,artAspect=1}){
 const origin=worldPoint(site.coordinates),preferred=site.preferred||[0,0],yaw=site.yaw||0,westLimit=site.westBank?nearestRiverAxis({THREE,geography,worldPoint,origin}):null;
 for(const scale of[1,.94,.88,.82,.76,.70,.64,.58,.52]){
  const width=site.width*scale;
  for(const [dx,dz]of(site.bridge?[[0,0]]:searchOffsets)){
   const x=origin.x+preferred[0]+dx,z=origin.z+preferred[1]+dz;
   if(site.lowland&&(toGeo(x,z)[1]<51.70||toGeo(x,z)[1]>53.30||toGeo(x,z)[0]<3.8||toGeo(x,z)[0]>5.5))continue;
   if(site.asset==='gdansk'&&(Math.abs(x-origin.x)>.55||z-origin.z<-.90||z-origin.z>.35))continue;
   const footprint=sampleLandmarkFootprint({x,z,width,depth:site.depth,yaw,bridge:site.bridge});let minHeight=Infinity,maxHeight=-Infinity,valid=true;
   for(const [px,pz]of footprint){
    const geo=toGeo(px,pz),region=regionAt(geo);if(!region||(site.region&&region!==site.region)||(!site.bridge&&riverAt(geo))){valid=false;break;}
    if(site.island&&(geo[0]<10.95||geo[0]>12.75||geo[1]<54.95||geo[1]>56.16)){valid=false;break;}
    if(westLimit){const riverX=westLimit(pz);if(riverX===null||px>riverX-.10){valid=false;break;}}
    const h=heightAt(...geo);minHeight=Math.min(minHeight,h);maxHeight=Math.max(maxHeight,h);
   }
   if(!valid||maxHeight-minHeight>(site.bridge?.40:site.coastal?.65:.38))continue;
   if(site.coastal&&!footprint.some(([px,pz])=>[[-.30,0],[.30,0],[0,-.30],[0,.30],[-.21,-.21],[.21,-.21]].some(([dx,dz])=>!regionAt(toGeo(px+dx,pz+dz)))))continue;
   const fit={x,z,width,depth:site.depth,yaw,scale,footprint,minHeight,maxHeight,drawingCoordinates:toGeo(x,z),offset:[x-origin.x,z-origin.z]};
   return fit;
  }
 }
 throw new Error('No safe geographic paper footprint for '+site.asset);
}
function projectOnRelief(point,camera,heightAt,regionAt,exact=false){
 const dx=point.x-camera[0],dy=point.y-camera[1],dz=point.z-camera[2];let t=0;
 if(exact){
  const length=Math.hypot(dx,dy,dz),range=Math.max(8,point.y*4+8)/length,start=Math.max(0,1-range),signed=t=>{const x=camera[0]+dx*t,z=camera[2]+dz*t,g=toGeo(x,z);return camera[1]+dy*t-(regionAt(g)?heightAt(...g):-.05);};let lo=start,hi=start+range*2,last=start;
  for(let i=1;i<=32;i++){const s=start+range*2*i/32;if(signed(s)<=0){hi=s;break;}last=s;}lo=last;for(let i=0;i<16;i++){const s=(lo+hi)/2;if(signed(s)>0)lo=s;else hi=s;}t=(lo+hi)/2;return[camera[0]+dx*t,camera[2]+dz*t];
 }
 for(let i=0;i<7;i++){const x=point.x+dx*t,z=point.z+dz*t,g=toGeo(x,z),h=regionAt(g)?heightAt(...g):-.05;t=(h-point.y)/dy;}
 return[point.x+dx*t,point.z+dz*t];
}
function paperPoint({u,v,x,z,width,height,yaw,lean,base,site,heightAt,regionAt}){
 const c=Math.cos(yaw),s=Math.sin(yaw),localX=(u-.5)*width,localZ=v*height*Math.sin(lean);let lift=0;
 if(!site.unwarped){
  const gx=u*24,ix=Math.min(23,Math.floor(gx)),tx=gx-ix,gy=v*8,iy=Math.min(7,Math.floor(gy)),ty=gy-iy;
  const vertex=(a,b)=>{const dx=(a/24-.5)*width,g=toGeo(x+dx*c,z-dx*s),ground=regionAt(g)?heightAt(...g):-.05,delta=Math.max(-height*.10,Math.min(height*.10,ground+.045-base)),t=Math.max(0,Math.min(1,b/8/.20));return delta*(1-t*t*(3-2*t));};
  const a=vertex(ix,iy),b=vertex(ix+1,iy+1);lift=ty>=tx?a*(1-ty)+vertex(ix,iy+1)*(ty-tx)+b*tx:a*(1-tx)+vertex(ix+1,iy)*(tx-ty)+b*ty;
 }
 return{x:x+localX*c+localZ*s,y:base+v*height*Math.cos(lean)+lift,z:z-localX*s+localZ*c};
}
function fitPaintedBand({THREE,site,physical,worldPoint,heightAt,regionAt,geography,riverAt,artAspect,alphaRows,geographicAreas}){
 const origin=worldPoint(site.coordinates),preferred=site.displayCoordinates?worldPoint(site.displayCoordinates):{x:origin.x+(site.displayOffset?.[0]||0),z:origin.z+(site.displayOffset?.[1]||0)},width=site.displayWidth,height=width*artAspect,lean=site.lean??-.23;
 const axis=site.westBank||site.eastBank?nearestRiverAxis({THREE,geography,worldPoint,origin}):null;
 const cameras=[[-14,45,104],[-14,65,104],[-14,85,104],[-14,115,104],[-5,45,110],[-5,77,110],[-5,85,110],[-5,115,110]],offsets=[];
 const radius=site.displayRadius||3,step=site.displayStep||.20;for(let ix=-Math.ceil(radius/step);ix<=Math.ceil(radius/step);ix++)for(let iz=-Math.ceil(radius/step);iz<=Math.ceil(radius/step);iz++)if(Math.hypot(ix*step,iz*step)<=radius+.001)offsets.push([ix*step,iz*step]);offsets.sort((a,b)=>a[0]*a[0]+a[1]*a[1]-b[0]*b[0]-b[1]*b[1]);
 const samples=[];for(const [v0,v1,lo,hi]of alphaRows)for(const v of[v0,(v0+v1)/2,v1]){const n=Math.max(2,Math.ceil((hi-lo)*width/.14));for(let i=0;i<=n;i++)samples.push([lo+(hi-lo)*i/n,v]);}
 // Spread the early rejection probes over the whole silhouette before filling
 // its interior. Every accepted candidate still checks every alpha envelope.
 samples.sort((a,b)=>Math.abs(b[0]-.5)-Math.abs(a[0]-.5));
 for(const[dx,dz]of offsets)for(const yaw of site.displayYaws||[0]){
  const x=preferred.x+dx,z=preferred.z+dz,center=toGeo(x,z);if(!regionAt(center))continue;
  const base=heightAt(...center)+.045,parameters={x,z,width,height,yaw,lean,base,site,heightAt,regionAt};let valid=true,minMargin=Infinity;
  for(const exact of[false,true]){for(const[u,v]of samples){const point=paperPoint({...parameters,u,v});for(const camera of cameras){const[px,pz]=projectOnRelief(point,camera,heightAt,regionAt,exact),g=toGeo(px,pz),id=regionAt(g);
   if(!id||(site.region&&id!==site.region)||riverAt(g)){valid=false;break;}
   if(site.island&&(g[0]<10.95||g[0]>12.75||g[1]<54.95||g[1]>56.16)){valid=false;break;}
   if(site.lowland&&!insideGeometry(g,geographicAreas.netherlands)){valid=false;break;}
   if(axis){const limit=axis(pz),margin=site.eastBank?px-limit:limit-px;if(limit===null||margin<.28){valid=false;break;}minMargin=Math.min(minMargin,margin);}
   // A small real geographic shoulder keeps antialiasing and in-between alpha
   // texels clear of both coast water and all tributary banks.
   for(const[a,b]of[[-.09,0],[.09,0],[0,-.09],[0,.09]]){const probe=toGeo(px+a,pz+b);if(!regionAt(probe)||riverAt(probe)){valid=false;break;}}
   if(!valid)break;
  }if(!valid)break;}if(!valid)break;}
  if(valid)return{x,z,width,yaw,base,paintedBandSamples:samples.length*cameras.length,bankMargin:Number.isFinite(minMargin)?minMargin:null,cameraCount:cameras.length};
 }
 throw new Error('No camera-projected painted lower band fits land for '+site.asset+' at width '+width);
}
export function addLandmarks({THREE,scene,worldPoint,mobile=false,heightAt,regionAt,geography,riverAt,paperAtlas,baseSamples,camera}){
 const objects=LANDMARK_SITES.map(site=>{const group=new THREE.Group();group.name='landmark-'+site.asset;group.position.copy(worldPoint(site.coordinates,.035));group.userData={title:site.title,coordinates:[...site.coordinates],kind:site.naturalFeature?'natural-feature':'landmark',dimensional:false,paperIllustration:true,style:'heroic-isometric-paper-atlas',grounding:site.grounding,geolocationVerified:true,...(site.footprint?{footprint:site.footprint}:{})};scene.add(group);return group;});
 const ready=Promise.all([paperAtlas?Promise.resolve(paperAtlas):loadPaperAtlas({THREE,mobile}),geography?Promise.resolve(geography):fetch(new URL('./geography.json',import.meta.url)).then(r=>r.json()),baseSamples?Promise.resolve(baseSamples):fetch(new URL('./landmark-base-samples.json',import.meta.url)).then(r=>r.json())]).then(([art,geo,alpha])=>{
  const banks=riverAt||createRiverBankExclusion({THREE,geography:geo,worldPoint,heightAt,regionAt});let heroMaterial;
  for(let i=0;i<LANDMARK_SITES.length;i++){
   const site=LANDMARK_SITES[i],model=objects[i],rect=art.atlas.art[site.asset].rect,aspect=(rect[3]-rect[1])/(rect[2]-rect[0]),physical=fitLandmarkGround({THREE,site,worldPoint,heightAt,regionAt,riverAt:banks,geography:geo,artAspect:aspect});
   const display=site.paintedBand?fitPaintedBand({THREE,site,physical,worldPoint,heightAt,regionAt,geography:geo,riverAt:banks,artAspect:aspect,alphaRows:alpha.assets[site.asset].rows,geographicAreas:alpha.geographicAreas}):{x:physical.x,z:physical.z,width:site.displayWidth,yaw:0};
   const card=createPaperCard({THREE,...art,asset:site.asset,width:display.width,lean:site.lean??-.23,kind:site.naturalFeature?'volcano':'hero-landmark',segments:[24,8]});
   // These are deliberately oversized printed atlas emblems. Their geographic
   // feet stay grounded; the painted architecture may overhang a narrow island.
   // Draw them after the relief so foreground DEM cells cannot erase the facade.
   if(!heroMaterial){heroMaterial=card.material.clone();heroMaterial.uniforms=card.material.uniforms;heroMaterial.depthTest=false;}
   card.material=heroMaterial;
   card.renderOrder=5+Math.max(0,Math.min(1,(display.z+80)/240))*.01;
   card.rotation.y=display.yaw;const displayGeo=toGeo(display.x,display.z),base=heightAt(...displayGeo)+.045;card.position.set(display.x-model.position.x,base-model.position.y,display.z-model.position.z);
   const p=card.geometry.attributes.position,uv=card.geometry.attributes.pictureUv,c=Math.cos(display.yaw),s=Math.sin(display.yaw),maxWarp=card.userData.height*.10;
   for(let j=0;j<p.count&&!site.unwarped;j++){
    const x=p.getX(j),foot=toGeo(display.x+x*c,display.z-x*s),ground=regionAt(foot)?heightAt(...foot):-.05;
    const raw=ground+.045-base,delta=Math.max(-maxWarp,Math.min(maxWarp,raw)),v=uv.getY(j),t=Math.max(0,Math.min(1,v/.20)),fade=1-t*t*(3-2*t);p.setY(j,p.getY(j)+delta*fade);
   }
   p.needsUpdate=true;card.geometry.computeBoundingBox();card.geometry.computeBoundingSphere();model.add(card);
   const samples=fit=>fit.footprint.map(([x,z])=>[x,heightAt(...toGeo(x,z))+.045,z]);
   model.userData={...model.userData,drawingCoordinates:displayGeo,drawingOffset:[display.x-model.position.x,display.z-model.position.z],physicalGroundCoordinates:physical.drawingCoordinates,illustrationWidth:display.width,displayWidth:display.width,heroAnnotation:true,groundFootprint:{center:[physical.x,physical.z],width:physical.width,depth:physical.depth,yaw:physical.yaw,bridgeAbutments:!!site.bridge,samples:samples(physical),elevationSpread:physical.maxHeight-physical.minHeight},...(site.paintedBand?{paintedBaseFootprint:{band:[0,.20],alphaCutoff:alpha.alphaCutoff,projectedSamples:display.paintedBandSamples,cameraCount:display.cameraCount,bank:site.eastBank?'east':site.westBank?'west':null,bankMargin:display.bankMargin,river:site.asset==='warsaw'?'Vistula':site.asset==='cologne'?'Rhine':null,wholePaintedBottom:true}}:{}),surfaceFit:{scale:1,physicalScale:physical.scale,support:site.grounding,physicalRiverExclusion:!site.bridge,wholeGroundFootprint:true,annotationOverhang:!site.paintedBand}};
  }
  return objects;
 });return{count:objects.length,objects,ready};
}
