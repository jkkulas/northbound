import {preservePictureUv} from './atlas-pigment.js';

// Newly engraved dimensional vignettes, rooted in the chart's tidal ink.
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
const SEA=-.05,LEAN=-.23;
function maritimePigment(THREE,texture){
 return new THREE.ShaderMaterial({name:'New colored maritime copperplate',transparent:false,depthWrite:true,side:THREE.DoubleSide,
 uniforms:{uArtwork:{value:texture}},
 vertexShader:`attribute vec2 pictureUv;varying vec2 vUv;varying vec3 vWorld;
 void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`uniform sampler2D uArtwork;varying vec2 vUv;varying vec3 vWorld;
 float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
 vec3 toPaper(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
 void main(){vec4 paint=texture2D(uArtwork,vUv);if(paint.a<.25)discard;
 vec3 color=toPaper(paint.rgb)*vec3(.985,.972,.932);color+=(hash(floor(vWorld.xz*65.))-.5)*.012;
 gl_FragColor=vec4(color,1.);}`});
}
function paintedSamples(bitmap,rect,atlasWidth,atlasHeight){
 const [l,t,r,b]=rect,sx=bitmap.width/atlasWidth,sy=bitmap.height/atlasHeight,coarse=[],exact=[];
 for(let y=Math.floor(t*sy);y<Math.ceil(b*sy);y++)for(let x=Math.floor(l*sx);x<Math.ceil(r*sx);x++){
  if(bitmap.data[(y*bitmap.width+x)*4+3]<64)continue;
  const u=((x+.5)/sx-l)/(r-l),v=1-((y+.5)/sy-t)/(b-t);exact.push(u,v);
  if(x%12===0&&y%12===0)coarse.push(u,v);
 }return {coarse,exact};
}
function projectedSeaPoint(x,z,u,v,width,height,camera,mirror=false){
 const y=.015+v*height*Math.cos(LEAN),px=x+(mirror ? .5-u : u-.5)*width,pz=z+v*height*Math.sin(LEAN);
 const t=(SEA-camera.position.y)/(y-camera.position.y);
 return [camera.position.x+(px-camera.position.x)*t,camera.position.z+(pz-camera.position.z)*t];
}
function placeAtSea({origin,width,height,samples,camera,regionAt,occupied,mirror,maxDistance=12}){
 const supports=(x,z,points)=>{for(let i=0;i<points.length;i+=2){const p=projectedSeaPoint(x,z,points[i],points[i+1],width,height,camera,mirror);if(regionAt([p[0]/2.2+13,60-p[1]/4.4]))return false;}return true;};
 const boxAt=(x,z)=>{const xs=[],zs=[];for(const u of[0,1])for(const v of[0,1]){const p=projectedSeaPoint(x,z,u,v,width,height,camera);xs.push(p[0]);zs.push(p[1]);}return [Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];};
 const overlaps=box=>occupied.some(b=>{const area=Math.max(0,Math.min(box[2],b[2])-Math.max(box[0],b[0]))*Math.max(0,Math.min(box[3],b[3])-Math.max(box[1],b[1]));return area>Math.min((box[2]-box[0])*(box[3]-box[1]),(b[2]-b[0])*(b[3]-b[1]))*.13;});
 const candidates=[{x:origin[0],z:origin[1],distance:0}];
 for(let z=-maxDistance;z<=maxDistance;z+=.75)for(let x=-maxDistance;x<=maxDistance;x+=.75){const d=Math.hypot(x,z);if(d&&d<=maxDistance)candidates.push({x:origin[0]+x,z:origin[1]+z,distance:d});}
 candidates.sort((a,b)=>a.distance-b.distance);
 for(const allowOverlap of[false,true])for(const c of candidates){const box=boxAt(c.x,c.z);if(!allowOverlap&&overlaps(box))continue;if(!supports(c.x,c.z,samples.coarse)||!supports(c.x,c.z,samples.exact))continue;occupied.push(box);return {...c,clear:true,box};}
 return {x:origin[0],z:origin[1],clear:false,box:boxAt(...origin)};
}
export function addSeaCreatures({THREE,scene,mobile=false,regionAt,camera}){
 const objects=[],decorations=[];
 const ready=Promise.all([
  fetch(new URL('./maritime-illustrated-v4.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Maritime artwork metadata unavailable');return r.json();}),
  new THREE.TextureLoader().loadAsync(new URL(mobile?'./maritime-illustrated-v4-mobile.webp':'./maritime-illustrated-v4.webp',import.meta.url).href),
 ]).then(([atlas,texture])=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  const material=maritimePigment(THREE,texture),canvas=document.createElement('canvas');canvas.width=texture.image.width;canvas.height=texture.image.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(texture.image,0,0);const bitmap=context.getImageData(0,0,canvas.width,canvas.height),sampleCache=new Map(),occupied=[],wakes=[];
  for(const item of ITEMS){
   const art=atlas.art[item.asset],[l,t,r,b]=art.rect,width=mobile?(item.mobileWidth||item.width*.82):item.width,height=width*(b-t)/(r-l);
   if(!sampleCache.has(item.asset))sampleCache.set(item.asset,paintedSamples(bitmap,art.rect,atlas.width,atlas.height));
   const samples=sampleCache.get(item.asset),geo=mobile&&item.mobileGeo?item.mobileGeo:item.geo;
   const fit=placeAtSea({origin:[(geo[0]-13)*2.2,(60-geo[1])*4.4],width,height,samples,camera,regionAt,occupied,mirror:item.mirror,maxDistance:item.offshore?4:12});
   const geometry=preservePictureUv(new THREE.PlaneGeometry(width,height));geometry.translate(0,height*.5,0);geometry.rotateX(LEAN);
   const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const u=item.mirror?1-uv.getX(i):uv.getX(i);uv.setXY(i,(l+u*(r-l))/atlas.width,1-(b-uv.getY(i)*(b-t))/atlas.height);}
   const model=new THREE.Mesh(geometry,material);model.name=item.name;model.position.set(fit.x,.015,fit.z);model.frustumCulled=false;
   const drawn=[fit.x/2.2+13,60-fit.z/4.4];
   model.userData={title:item.name,kind:'sea-model',style:'dimensional-copperplate',asset:item.asset,coordinates:[...item.geo],drawingCoordinates:drawn,mirror:!!item.mirror,width,height,footprint:fit.box,fullWaterSupport:fit.clear,sourceSamples:samples.exact.length/2,atlas:'maritime-illustrated-v4.webp'};
   objects.push(model);scene.add(model);decorations.push({name:item.name,geo:drawn,label:item.label,model});
   for(let band=0;band<3;band++)for(let half=0;half<2;half++)for(let s=1;s<=18;s++){
    const a=half*Math.PI+.13+(s-1)/18*Math.PI*.68,b=half*Math.PI+.13+s/18*Math.PI*.68,rx=width*(.37+band*.075),rz=width*(.08+band*.035);
    const p=[fit.x+Math.cos(a)*rx,SEA+.015,fit.z+Math.sin(a)*rz],q=[fit.x+Math.cos(b)*rx,SEA+.015,fit.z+Math.sin(b)*rz];
    if([p,q].some(v=>regionAt([v[0]/2.2+13,60-v[2]/4.4])))continue;wakes.push(...p,...q);
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(wakes,3));
  const ink=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xc9d8b8,transparent:true,opacity:.58,depthWrite:false}));ink.name='integrated-maritime-tides';scene.add(ink);
  return objects;
 });return {count:ITEMS.length,objects,ready,decorations};
}
