import {preservePictureUv} from './atlas-pigment.js';
import {waterPigmentShader} from './atlas-terrain.js';
import {paperEdgeShader,PAPER_ALPHA_CUTOFF} from './paper-art.js';

// Heroic upright engravings share the chart's tidal pigment and soft ink edges.
const ITEMS=[
 {name:'Jörmungandr',asset:'serpent_attack',geo:[-4.8,69.3],mobileGeo:[3.6,69.4],width:14.6,mobileWidth:10.7,label:true},
 {name:'Kraken',asset:'kraken_attack',geo:[-1.1,62.8],mobileGeo:[1.5,62.2],width:12.2,mobileWidth:8.7,label:true},
 {name:'North Sea platform',asset:'offshore_rig',geo:[2.6,58.84],width:6.7,mobileWidth:4.8,offshore:true},
 {name:'A northern leviathan',asset:'northern_whale',geo:[-12.1,66.2],width:9.2,mobileWidth:6.6},
 {name:'The great lobster',asset:'great_lobster',geo:[3.4,55.7],width:6.1,mobileWidth:4.7},
 {name:'Hanseatic trader',asset:'merchant_ship',geo:[-5.3,59.2],width:5.9},
 {name:'Northern schooner',asset:'schooner_ship',geo:[-12.1,61.1],width:5.8},
 {name:'Atlantic merchant',asset:'merchant_ship',geo:[-12.3,57.4],width:5.2,mirror:true},
 {name:'Irish Sea passage',asset:'schooner_ship',geo:[-12.2,53.9],width:5.3},
 {name:'Channel trader',asset:'merchant_ship',geo:[-3.8,49.6],width:4.5},
 {name:'North Sea sail',asset:'schooner_ship',geo:[.1,56.9],width:4.7,mobileGeo:[2.1,65.7]},
 {name:'Baltic merchant',asset:'merchant_ship',geo:[20.0,56.1],width:3.8},
 {name:'Baltic schooner',asset:'schooner_ship',geo:[20.3,60.8],width:4.0,mirror:true},
 {name:'Barents trader',asset:'merchant_ship',geo:[28.0,72.4],width:5.3,mirror:true},
 {name:'Arctic schooner',asset:'schooner_ship',geo:[18.3,74.5],width:5.6},
 {name:'Greenland Sea passage',asset:'merchant_ship',geo:[-13.0,72.7],width:5.0},
 {name:'Norwegian Sea sail',asset:'schooner_ship',geo:[7.1,70.7],width:4.8,mobileGeo:[7.3,72.8]},
];
// Proven artist-directed anchors; exact coast/ink tests still run before use.
const PROVEN_DRAWINGS={
 "desktop": {
  "North Sea platform": [
   2.4863636363636363,
   58.72636363636364
  ],
  "Jörmungandr": [
   -3.0954545454545475,
   69.98181818181818
  ],
  "Kraken": [
   -11.327272727272728,
   56.152272727272724
  ],
  "A northern leviathan": [
   -9.031818181818181,
   63.13181818181818
  ],
  "The great lobster": [
   3.4000000000000004,
   55.7
  ],
  "Hanseatic trader": [
   -2.572727272727274,
   60.904545454545456
  ],
  "Northern schooner": [
   -23.009090909090908,
   62.29318181818182
  ],
  "Atlantic merchant": [
   -12.3,
   52.96818181818182
  ],
  "Irish Sea passage": [
   -12.2,
   50.83181818181818
  ],
  "Channel trader": [
   -5.8454545454545475,
   48.747727272727275
  ],
  "North Sea sail": [
   1.8045454545454547,
   53.66136363636363
  ],
  "Baltic merchant": [
   7.5,
   75.4
  ],
  "Baltic schooner": [
   4,
   76.7
  ],
  "Barents trader": [
   28,
   72.4
  ],
  "Arctic schooner": [
   20.004545454545454,
   72.11363636363636
  ],
  "Greenland Sea passage": [
   -17.43181818181818,
   67.58636363636364
  ],
  "Norwegian Sea sail": [
   7.1,
   70.7
  ]
 },
 "mobile": {
  "North Sea platform": [
   2.5999999999999996,
   58.84
  ],
  "Jörmungandr": [
   2.918181818181818,
   69.4
  ],
  "Kraken": [
   1.5,
   62.2
  ],
  "A northern leviathan": [
   -12.100000000000001,
   66.2
  ],
  "The great lobster": [
   3.0590909090909086,
   55.7
  ],
  "Hanseatic trader": [
   -7.686363636363637,
   59.711363636363636
  ],
  "Northern schooner": [
   -13.804545454545455,
   60.58863636363637
  ],
  "Atlantic merchant": [
   -12.3,
   57.22954545454545
  ],
  "Irish Sea passage": [
   -12.2,
   53.9
  ],
  "Channel trader": [
   -5.5045454545454575,
   48.91818181818182
  ],
  "North Sea sail": [
   9.94090909090909,
   66.38181818181819
  ],
  "Baltic merchant": [
   11,
   74.6
  ],
  "Baltic schooner": [
   12.45909090909091,
   67.9590909090909
  ],
  "Barents trader": [
   28,
   72.4
  ],
  "Arctic schooner": [
   16.936363636363637,
   72.79545454545455
  ],
  "Greenland Sea passage": [
   -13,
   72.7
  ],
  "Norwegian Sea sail": [
   7.9818181818181815,
   72.8
  ]
 }
};
const SEA=-.05,LEAN=-.23,EDGE_ALPHA=PAPER_ALPHA_CUTOFF,SEA_SCALE=1.45,MAX_OVERLAP=.08;
function maritimePigment(THREE,texture,water,camera){
 return new THREE.ShaderMaterial({name:'New colored maritime copperplate',transparent:false,depthWrite:true,alphaToCoverage:true,side:THREE.DoubleSide,
 uniforms:{uArtwork:{value:texture},uEye:{value:camera.position},...water.material.uniforms},
 vertexShader:`attribute vec2 pictureUv;varying vec2 vUv;varying vec2 vPicture;varying vec3 vWorld;
 void main(){vUv=uv;vPicture=pictureUv;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`uniform sampler2D uArtwork;uniform vec3 uEye;varying vec2 vUv;varying vec2 vPicture;varying vec3 vWorld;
 ${waterPigmentShader}
 ${paperEdgeShader}
 void main(){vec4 paint=texture2D(uArtwork,vUv);float coverage=paperCoverage(paint.a);if(paint.a<.02)discard;
 vec3 printed=paperTextureColor(paint),color=printed*vec3(.985,.972,.932);
 // Only cool wave pigment at the waterline takes the chart's own wash. Warm
 // hulls, ivory foam, monster bodies and rig structure keep opaque source ink.
 float waterInk=smoothstep(.025,.115,min(printed.g-printed.r,printed.b-printed.r));
 waterInk*=1.-smoothstep(.38,.66,vPicture.y);
 vec3 chartPoint=uEye+(vWorld-uEye)*((-.05-uEye.y)/(vWorld.y-uEye.y));
 vec3 matched=chartWater(chartPoint);
 float waveShade=clamp((dot(printed,vec3(.2126,.7152,.0722))-.52)*.30,-.10,.09);
 color=mix(color,matched+waveShade,waterInk);
 color+=(hash(floor(vWorld.xz*65.))-.5)*.012;
 gl_FragColor=vec4(color,coverage);}`});
}
function paintedSamples(bitmap,rect,atlasWidth,atlasHeight){
 const [l,t,r,b]=rect,sx=bitmap.width/atlasWidth,sy=bitmap.height/atlasHeight,coarse=[],exact=[];
 for(let y=Math.floor(t*sy);y<Math.ceil(b*sy);y++)for(let x=Math.floor(l*sx);x<Math.ceil(r*sx);x++){
  if(bitmap.data[(y*bitmap.width+x)*4+3]/255<EDGE_ALPHA)continue;
  const u=((x+.5)/sx-l)/(r-l),v=1-((y+.5)/sy-t)/(b-t);exact.push(u,v);
  if(x%12===0&&y%12===0)coarse.push(u,v);
 }return {coarse,exact};
}
function projectedSeaPoint(x,z,u,v,width,height,camera,mirror=false,lean=LEAN){
 const y=.015+v*height*Math.cos(lean),px=x+(mirror ? .5-u : u-.5)*width,pz=z+v*height*Math.sin(lean);
 const t=(SEA-camera.position.y)/(y-camera.position.y);
 return [camera.position.x+(px-camera.position.x)*t,camera.position.z+(pz-camera.position.z)*t];
}
function seaLayoutViews(camera){
 camera.updateMatrixWorld(true);
 return [...new Set([camera.position.y,45,85,115])].map(y=>{
  const view=camera.clone();view.position.y=y;view.updateMatrixWorld(true);return view;
 });
}
function heroScreenBounds(THREE,landmarks,views){
 const bitmaps=new Map(),gridSize=16;
 const bitmapFor=image=>{if(!bitmaps.has(image)){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);bitmaps.set(image,context.getImageData(0,0,canvas.width,canvas.height));}return bitmaps.get(image);};
 return views.map(camera=>{
  const illustrations=[];
  for(const landmark of landmarks){landmark.updateMatrixWorld(true);landmark.traverse(part=>{
   if(!part.isMesh||!part.geometry?.attributes.position||!part.material.uniforms?.uArtwork)return;
   const position=part.geometry.attributes.position,uv=part.geometry.attributes.uv,point=new THREE.Vector3(),clip=new THREE.Vector4(),vertices=[];
   const viewProjection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i).applyMatrix4(part.matrixWorld);clip.set(point.x,point.y,point.z,1).applyMatrix4(viewProjection);const q=1/clip.w;vertices.push({x:clip.x*q,y:clip.y*q,q,u:uv.getX(i),v:uv.getY(i)});}
   const rect=[Math.min(...vertices.map(p=>p.x)),Math.min(...vertices.map(p=>p.y)),Math.max(...vertices.map(p=>p.x)),Math.max(...vertices.map(p=>p.y))];
   const indices=part.geometry.index?.array||Array.from({length:vertices.length},(_,i)=>i),triangles=[],grid=Array.from({length:gridSize*gridSize},()=>[]);
   const cell=(value,axis)=>Math.max(0,Math.min(gridSize-1,Math.floor((value-rect[axis])/(rect[axis+2]-rect[axis])*gridSize)));
   for(let i=0;i<indices.length;i+=3){const a=vertices[indices[i]],b=vertices[indices[i+1]],c=vertices[indices[i+2]],denominator=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(denominator)<1e-12)continue;const index=triangles.length;triangles.push({a,b,c,denominator});
    for(let y=cell(Math.min(a.y,b.y,c.y),1);y<=cell(Math.max(a.y,b.y,c.y),1);y++)for(let x=cell(Math.min(a.x,b.x,c.x),0);x<=cell(Math.max(a.x,b.x,c.x),0);x++)grid[y*gridSize+x].push(index);
   }
   illustrations.push({name:landmark.name,rect,triangles,grid,gridSize,bitmap:bitmapFor(part.material.uniforms.uArtwork.value.image)});
  });}
  return illustrations;
 });
}
function heroInkAt(hero,x,y){
 const r=hero.rect;if(x<r[0]||x>r[2]||y<r[1]||y>r[3])return false;
 const gx=Math.min(hero.gridSize-1,Math.floor((x-r[0])/(r[2]-r[0])*hero.gridSize)),gy=Math.min(hero.gridSize-1,Math.floor((y-r[1])/(r[3]-r[1])*hero.gridSize));
 for(const i of hero.grid[gy*hero.gridSize+gx]){
  const {a,b,c,denominator}=hero.triangles[i],wa=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/denominator,wb=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/denominator,wc=1-wa-wb;
  if(Math.min(wa,wb,wc)<-1e-6)continue;
  const inverseW=wa*a.q+wb*b.q+wc*c.q,u=(wa*a.u*a.q+wb*b.u*b.q+wc*c.u*c.q)/inverseW,v=(wa*a.v*a.q+wb*b.v*b.q+wc*c.v*c.q)/inverseW;
  const image=hero.bitmap,px=u*image.width-.5,py=(1-v)*image.height-.5,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
  const alpha=(dx,dy)=>image.data[(Math.max(0,Math.min(image.height-1,iy+dy))*image.width+Math.max(0,Math.min(image.width-1,ix+dx)))*4+3]/255;
  if((alpha(0,0)*(1-fx)+alpha(1,0)*fx)*(1-fy)+(alpha(0,1)*(1-fx)+alpha(1,1)*fx)*fy>=EDGE_ALPHA)return true;
 }
 return false;
}
function placeAtSea({THREE,origin,width,height,samples,views,heroes,regionAt,occupied,mirror,title,lean=LEAN,preferred=[],maxDistance=24}){
 const supports=(x,z,points,camera)=>{for(let i=0;i<points.length;i+=2){const p=projectedSeaPoint(x,z,points[i],points[i+1],width,height,camera,mirror,lean);if(regionAt([p[0]/2.2+13,60-p[1]/4.4]))return false;}return true;};
 const boxAt=(x,z,camera)=>{const xs=[],zs=[];for(const u of[0,1])for(const v of[0,1]){const p=projectedSeaPoint(x,z,u,v,width,height,camera,false,lean);xs.push(p[0]);zs.push(p[1]);}return [Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];};
 const screenAt=(x,z,camera)=>{const xs=[],ys=[],point=new THREE.Vector3();for(const u of[0,1])for(const v of[0,1]){point.set(x+(u-.5)*width,.015+v*height*Math.cos(lean),z+v*height*Math.sin(lean)).project(camera);xs.push(point.x);ys.push(point.y);}return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];};
 const marginX=4/innerWidth,marginY=4/innerHeight;
 const heroIntersections=(rect,index)=>heroes[index].filter(({rect:b})=>!(rect[2]<b[0]-marginX||rect[0]>b[2]+marginX||rect[3]<b[1]-marginY||rect[1]>b[3]+marginY));
 const point=new THREE.Vector3();
 const heroClear=(x,z,points,camera,nearby)=>{if(!nearby.length)return true;for(let i=0;i<points.length;i+=2){const u=points[i],v=points[i+1];point.set(x+(mirror ? .5-u : u-.5)*width,.015+v*height*Math.cos(lean),z+v*height*Math.sin(lean)).project(camera);for(const hero of nearby)for(const dx of[-marginX,0,marginX])for(const dy of[-marginY,0,marginY])if(heroInkAt(hero,point.x+dx,point.y+dy))return false;}return true;};
 const overlapRatio=(box,index)=>{let largest=0;for(const item of occupied){const b=item.boxes[index],area=Math.max(0,Math.min(box[2],b[2])-Math.max(box[0],b[0]))*Math.max(0,Math.min(box[3],b[3])-Math.max(box[1],b[1]));largest=Math.max(largest,area/Math.min((box[2]-box[0])*(box[3]-box[1]),(b[2]-b[0])*(b[3]-b[1])));}return largest;};
 const visibility=(x,z)=>{let visible=0;for(let i=0;i<samples.coarse.length;i+=2){const u=samples.coarse[i],v=samples.coarse[i+1];point.set(x+(mirror ? .5-u : u-.5)*width,.015+v*height*Math.cos(lean),z+v*height*Math.sin(lean)).project(views[0]);if(point.x>=-1&&point.x<=1&&point.y>=-1&&point.y<=1&&point.z>=-1&&point.z<=1)visible++;}return visible/(samples.coarse.length/2);};
 const initialVisibility=visibility(...origin),requiredVisibility=initialVisibility>.05?Math.max(0,initialVisibility-.02):0;
 const stats={crowding:0,heroes:0,coast:0,fringe:0,offscreen:0},candidates=[{x:origin[0],z:origin[1],distance:0},...preferred.map(([lon,lat],i)=>({x:(lon-13)*2.2,z:(60-lat)*4.4,distance:-1+i*.01}))];
 for(let z=-maxDistance;z<=maxDistance;z+=.75)for(let x=-maxDistance;x<=maxDistance;x+=.75){const d=Math.hypot(x,z);if(d&&d<=maxDistance)candidates.push({x:origin[0]+x,z:origin[1]+z,distance:d});}
 candidates.sort((a,b)=>a.distance-b.distance);
 // Geographic water, neighbouring sails, and oversized land illustrations must
 // all stay clear through the complete wheel-controlled overview height range.
 for(const c of candidates){
  const visible=visibility(c.x,c.z);if(visible<requiredVisibility){stats.offscreen++;continue;}
  const boxes=views.map(camera=>boxAt(c.x,c.z,camera)),nearby=views.map((camera,i)=>heroIntersections(screenAt(c.x,c.z,camera),i));let overlap=0,valid=true;
  for(let i=0;i<views.length;i++){
   overlap=Math.max(overlap,overlapRatio(boxes[i],i));
   if(overlap>MAX_OVERLAP){stats.crowding++;valid=false;break;}
   if(!heroClear(c.x,c.z,samples.coarse,views[i],nearby[i])){stats.heroes++;valid=false;break;}
   if(!supports(c.x,c.z,samples.coarse,views[i])){stats.coast++;valid=false;break;}
  }
  if(!valid)continue;if(views.some(camera=>!supports(c.x,c.z,samples.exact,camera))){stats.fringe++;continue;}
  if(views.some((camera,i)=>!heroClear(c.x,c.z,samples.exact,camera,nearby[i]))){stats.heroes++;continue;}
  occupied.push({boxes});return {...c,clear:true,box:boxes[0],boxes,overlap,fullHeroClearance:true,initialVisibility,visibility:visible};
 }
 throw new Error('No unobscured open water for '+title+' at '+origin.join(', ')+' '+JSON.stringify(stats));
}
export function addSeaCreatures({THREE,scene,mobile=false,regionAt,camera,landmarks=[]}){
 const objects=[],decorations=[];
 const ready=Promise.all([
  fetch(new URL('./maritime-illustrated-v4.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Maritime artwork metadata unavailable');return r.json();}),
  new THREE.TextureLoader().loadAsync(new URL(mobile?'./maritime-illustrated-v4-mobile.webp':'./maritime-illustrated-v4.webp',import.meta.url).href),
 ]).then(([atlas,texture])=>{
  texture.colorSpace=THREE.NoColorSpace;texture.premultiplyAlpha=true;texture.anisotropy=8;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  const material=maritimePigment(THREE,texture,scene.userData.water,camera),canvas=document.createElement('canvas');canvas.width=texture.image.width;canvas.height=texture.image.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(texture.image,0,0);const bitmap=context.getImageData(0,0,canvas.width,canvas.height),sampleCache=new Map(),occupied=[],wakes=[],views=seaLayoutViews(camera),heroes=heroScreenBounds(THREE,landmarks,views);
  // The surveyed offshore platform reserves its sea space before freely placed ships.
  for(const item of [...ITEMS].sort((a,b)=>Number(!!b.offshore)-Number(!!a.offshore))){
   const art=atlas.art[item.asset],[l,t,r,b]=art.rect,scale=item.offshore?1.69:SEA_SCALE,width=(mobile?(item.mobileWidth||item.width*.82):item.width)*scale,height=width*(b-t)/(r-l);
   if(!sampleCache.has(item.asset))sampleCache.set(item.asset,paintedSamples(bitmap,art.rect,atlas.width,atlas.height));
   const samples=sampleCache.get(item.asset),geo=mobile&&item.mobileGeo?item.mobileGeo:item.geo,lean=item.name.startsWith('Baltic ')? .22:LEAN;
   const fit=placeAtSea({THREE,origin:[(geo[0]-13)*2.2,(60-geo[1])*4.4],width,height,samples,views,heroes,regionAt,occupied,mirror:item.mirror,title:item.name,lean,preferred:[(mobile?PROVEN_DRAWINGS.mobile:PROVEN_DRAWINGS.desktop)[item.name],...(item.name.startsWith('Baltic ')?[[7.5,75.4],[3,73.5],[4,76.7],[11,74.6],[-1,73],[0,77]]:[])].filter(Boolean),maxDistance:item.offshore?7:48});
   const geometry=preservePictureUv(new THREE.PlaneGeometry(width,height));geometry.translate(0,height*.5,0);geometry.rotateX(lean);
   const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const u=item.mirror?1-uv.getX(i):uv.getX(i);uv.setXY(i,(l+u*(r-l))/atlas.width,1-(b-uv.getY(i)*(b-t))/atlas.height);}
   const title=item.name.startsWith('Baltic ')&&(fit.x/2.2+13<10||60-fit.z/4.4>66)?item.name.replace('Baltic ','Open-sea '):item.name;
   const model=new THREE.Mesh(geometry,material);model.name=title;model.position.set(fit.x,.015,fit.z);model.frustumCulled=false;
   const drawn=[fit.x/2.2+13,60-fit.z/4.4];
   model.userData={title,kind:'sea-illustration',style:'isometric-paper-diorama',paperIllustration:true,dimensional:false,waterPigment:'shared-chart-wash',placementKey:item.name,asset:item.asset,coordinates:[...item.geo],drawingCoordinates:drawn,mirror:!!item.mirror,width,height,lean,footprint:fit.box,fullWaterSupport:fit.clear,fullHeroClearance:fit.fullHeroClearance,heroCollision:'actual-source-alpha',initialVisibility:fit.initialVisibility,paintVisibility:fit.visibility,checkedCameraHeights:views.map(view=>view.position.y),heroClearanceCount:landmarks.length,edgeAlpha:EDGE_ALPHA,scale,maximumOverlap:fit.overlap,sourceSamples:samples.exact.length/2,atlas:'maritime-illustrated-v4.webp'};
   objects.push(model);scene.add(model);decorations.push({name:title,geo:drawn,label:item.label,model});
   for(let band=0;band<3;band++)for(let half=0;half<2;half++)for(let s=1;s<=18;s++){
    const a=half*Math.PI+.13+(s-1)/18*Math.PI*.68,b=half*Math.PI+.13+s/18*Math.PI*.68,rx=width*(.37+band*.075),rz=width*(.08+band*.035);
    const p=[fit.x+Math.cos(a)*rx,SEA+.015,fit.z+Math.sin(a)*rz],q=[fit.x+Math.cos(b)*rx,SEA+.015,fit.z+Math.sin(b)*rz];
    if(Array.from({length:9},(_,i)=>[p[0]+(q[0]-p[0])*i/8,p[2]+(q[2]-p[2])*i/8]).some(([x,z])=>regionAt([x/2.2+13,60-z/4.4])))continue;wakes.push(...p,...q);
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(wakes,3));
  const ink=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xc9d8b8,transparent:true,opacity:.58,depthWrite:false}));ink.name='integrated-maritime-tides';scene.add(ink);
  return objects;
 });return {count:ITEMS.length,objects,ready,decorations};
}
