/* Painted paper scenery: upright isometric drawings, transparent silhouettes,
 * and geographic ground contact. No sculpted object models remain. */
import {NORWAY_ROAD_CORRIDORS} from './journey.js';
const randomFrom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const SEA=-.05;
const LAND_RENDER_SCALE=2;

// Reserve the full painted hero frontage, rather than its much smaller real
// ground-foot. The southward part of each clearing leaves its doors and facades
// visible over the small foreground trees and cottages in the overview.
const heroSites=[
 ['stockholm',18.05421,59.32749,8.5],
 ['nyhavn',12.589145,55.68045,8],['warsaw',21.01422,52.24775,9],['windmill',4.63998,51.88339,7],
 ['gdansk',18.65746,54.35056,8],['london',-.07537,51.50552,9],['borgund',7.81229,61.04720,7],
 ['brandenburg',13.37770,52.51627,8.5],['cologne',6.95814,50.94130,8],['edinburgh',-3.20042,55.94869,8],
 ['iceland_volcano',-19.70675,63.98327,10]
];
function heroClearings(landmarks=[]){
 const byId=new Map(landmarks.map(model=>[model.name?.replace(/^landmark-/,''),model.userData]));
 return heroSites.map(([id,lon,lat,width])=>{
  const data=byId.get(id),geo=data?.drawingCoordinates||[lon,lat],painted=data?.illustrationWidth||data?.displayWidth||data?.width||width;
  return{x:(geo[0]-13)*2.2,z:(60-geo[1])*4.4+1.,rx:painted*.5+1.15,rz:3.5};
 });
}
const roadSegments=NORWAY_ROAD_CORRIDORS.flatMap(path=>path.slice(1).map((b,i)=>({ax:(path[i][0]-13)*2.2,az:(60-path[i][1])*4.4,bx:(b[0]-13)*2.2,bz:(60-b[1])*4.4})));
function reservedGround(geo,width,clearings){
 const x=(geo[0]-13)*2.2,z=(60-geo[1])*4.4;
 if(clearings.some(c=>((x-c.x)/(c.rx+width*.35))**2+((z-c.z)/(c.rz+width*.3))**2<1))return true;
 for(const s of roadSegments){
  const dx=s.bx-s.ax,dz=s.bz-s.az,t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz||1)));
  if(Math.hypot(x-s.ax-dx*t,z-s.az-dz*t)<1.+width*.5)return true;
 }
 return false;
}
function foregroundQuiet(geo){return geo[1]<54.3&&geo[0]<3.4;}
function makeSpacing(cell=.6){
 const bins=new Map();let largestWidth=0;
 return {accept(p,width,factor=.29){
  const x=Math.floor(p.x/cell),z=Math.floor(p.z/cell),reach=Math.ceil((width+largestWidth)*factor/cell);
  for(let dz=-reach;dz<=reach;dz++)for(let dx=-reach;dx<=reach;dx++)for(const other of bins.get(`${x+dx},${z+dz}`)||[]){
   if(Math.hypot(p.x-other.x,p.z-other.z)<(width+other.width)*factor)return false;
  }
  const key=`${x},${z}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push({x:p.x,z:p.z,width});largestWidth=Math.max(largestWidth,width);return true;
 }};
}

const woodlandGroves=[
 [6.5,60.9,1.35,.65],[8.3,59.3,.95,.50],[9.2,60.5,.8,.65],[10.4,61.8,1.2,.65],
 [11.8,62.8,1.6,.8],[12.5,64.3,1.0,.7],[14.5,60.8,1.8,.7],[15.9,63.0,1.7,.8],
 [19.3,64.9,1.9,.7],[20.4,66.1,1.5,.6],[22.0,66.8,1.2,.6],[24.2,64.1,1.7,.8],
 [25.8,61.6,1.7,.8],[27.6,63.2,1.35,.7],[27.8,65.2,1.4,.8],[25.5,67.0,1.4,.8],
 [13.2,58.1,1.0,.65],[14.4,59.2,1.2,.65],[16.0,57.1,.8,.5],[17.2,61.8,1.15,.7],
 [22.8,52.0,1.3,.55],[15.2,53.4,1.3,.55],[17.2,51.4,1.3,.6],[19.1,50.8,1.2,.55],
 [22.8,50.8,1.1,.55],[23.7,53.5,1.1,.6],[14.8,50.8,1.1,.4],[8.5,49.7,1.1,.45],
 [10.2,50.9,1.2,.6],[11.2,53.5,1.2,.5],[9.0,54.2,1.,.6],[7.0,52.9,.7,.5],
 [-4.6,56.8,.9,.55],[-7.5,53.6,.65,.4],[-8.1,52.3,.9,.5],[-1.3,54.1,.75,.5],
 [-2.5,52.2,.9,.45],[.3,52.7,.65,.4],[-4.0,57.5,.8,.45],[10.2,57.0,.45,.45],
 [21.4,55.4,.65,.6],[24.5,58.0,1.1,.6],[25.8,56.8,1.1,.6],[28.2,58.6,1.2,.7]
];
const woodlandRanges=[
 [4.9,12.5,58.2,64.7],[11.7,22.7,55.8,67.7],[21.5,30.0,60.0,67.8],
 [14.5,24.5,49.8,54.4],[5.8,15.4,49.5,55.1],[-9.0,1.4,50.7,58.0],[21.5,28.6,54.8,59.2]
];

async function paperAtlas(THREE,mobile){
 // Dynamic import permits the shared paper shader to use terrain pigments.
 const {loadPaperAtlas,createPaperCard}=await import('./paper-art.js');
 return {...await loadPaperAtlas({THREE,mobile}),createPaperCard};
}

/** Merge paper cards while preserving every shader attribute and silhouette. */
class PaperBatch {
 constructor(THREE){this.THREE=THREE;this.batches=new Map();}
 add(card,position,groundHeight=null){
  const T=this.THREE,g=card.geometry.index?card.geometry.toNonIndexed():card.geometry;
  card.position.copy(position);card.updateMatrix();
  const matrix=card.matrix,nm=new T.Matrix3().getNormalMatrix(matrix),p=new T.Vector3(),n=new T.Vector3(),key=card.material.uuid;
  if(!this.batches.has(key))this.batches.set(key,{material:card.material,attributes:new Map(),cards:0});
  const batch=this.batches.get(key);
  for(const[name,attribute]of Object.entries(g.attributes)){
   if(!batch.attributes.has(name))batch.attributes.set(name,{itemSize:attribute.itemSize,values:[]});
   const target=batch.attributes.get(name).values;
   for(let i=0;i<attribute.count;i++){
    if(name==='position'){
     p.fromBufferAttribute(attribute,i).applyMatrix4(matrix);
     // Each column follows the ground beneath its bottom edge. The drawing
     // stands upright while its base gently follows the actual hillside.
     if(groundHeight)p.y+=groundHeight(p.x,position.z)-position.y;
     target.push(p.x,p.y,p.z);
    }else if(name==='normal'){
     n.fromBufferAttribute(attribute,i).applyMatrix3(nm).normalize();target.push(n.x,n.y,n.z);
    }else for(let c=0;c<attribute.itemSize;c++)target.push(attribute.array[i*attribute.itemSize+c]);
   }
  }
  batch.cards++;if(g!==card.geometry)g.dispose();card.geometry.dispose();
 }
 finish(group,name){
  let drawCalls=0;
  for(const batch of this.batches.values()){
   const geometry=new this.THREE.BufferGeometry();
   for(const[key,attribute]of batch.attributes)geometry.setAttribute(key,new this.THREE.Float32BufferAttribute(attribute.values,attribute.itemSize));
   if(!geometry.attributes.normal)geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const mesh=new this.THREE.Mesh(geometry,batch.material);mesh.name=`${name}-${drawCalls+1}`;mesh.frustumCulled=false;
   mesh.userData={paperIllustration:true,dimensional:false,style:'isometric-paper-diorama',cardCount:batch.cards,triangles:geometry.attributes.position.count/3};group.add(mesh);drawCalls++;
  }
  return drawCalls;
 }
}

function clearGround(geo,width,{heightAt,regionAt,riverAt=()=>false},maxHeightSpread=.38){
 // Check the complete enlarged visible ground-foot, not just its centre and
 // corners. A narrow river or inlet between the ends must remain unobstructed.
 const steps=Math.max(10,Math.ceil(width/.065)),depth=width*.18;
 let low=Infinity,high=-Infinity;
 for(let i=0;i<=steps;i++)for(const z of[-depth/2,0,depth/2]){
  const g=[geo[0]+(i/steps-.5)*width/2.2,geo[1]-z/4.4];
  if(!regionAt(g)||riverAt(g))return false;
  const h=heightAt(...g);low=Math.min(low,h);high=Math.max(high,h);if(high-low>maxHeightSpread)return false;
 }
 return true;
}

function contactInk(target,p,width,{worldPoint,regionAt,riverAt}){
 // Unequal, broken quill strokes create a faint contact shadow without a disk.
 for(let row=0;row<2;row++)for(let i=0;i<5;i++){
  if((i+row)%4===0)continue;
  const t=i/5-.5,u=(i+.67)/5-.5,a=geoFrom(p.x+t*width*.65,p.z+.045+row*.035+Math.sin(t*4)*width*.025),b=geoFrom(p.x+u*width*.65,p.z+.045+row*.035+Math.sin(u*4)*width*.025);
  if(regionAt(a)&&regionAt(b)&&!riverAt(a)&&!riverAt(b))target.push(...worldPoint(a,.024),...worldPoint(b,.024));
 }
}
function installContactInk(THREE,group,positions,name){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const ink=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x645330,transparent:true,opacity:.19,depthWrite:false}));ink.name=name;group.add(ink);
}

/** Existing public entry point, now entirely illustrated paper trees. */
export function addSculptedWoodland({THREE,scene,worldPoint,heightAt,regionAt,riverAt=()=>false,landmarks=[],mobile=false}){
 const group=new THREE.Group();group.name='painted-paper-woodlands';
 const random=randomFrom(218),placements=[],ink=[],clearings=heroClearings(landmarks),spacing=makeSpacing(.9),target=mobile?780:1320;
 const smallSettlements=planSettlements({worldPoint,heightAt,regionAt,riverAt,landmarks,mobile});
 let isolated=0;
 for(let attempt=0;attempt<target*40&&placements.length<target;attempt++){
  const scattered=random()<.31;let geo;
  if(scattered){
   const [west,east,south,north]=woodlandRanges[Math.floor(random()*woodlandRanges.length)];geo=[west+random()*(east-west),south+random()*(north-south)];
  }else{
   const[lon,lat,rx,ry]=woodlandGroves[Math.floor(random()*woodlandGroves.length)],t=random()*Math.PI*2,r=Math.sqrt(random());
   // An off-centre second lobe prevents each woodland looking like an oval stamp.
   geo=[lon+Math.cos(t)*r*rx+Math.sin(t*2.7)*rx*.16,lat+Math.sin(t)*r*ry];
  }
  const h=heightAt(...geo);if(!regionAt(geo)||h>3.7)continue;
  if(foregroundQuiet(geo)&&random()<.72)continue;
  const pine=geo[1]>58||h>1.9||random()>.68,baseWidth=pine?.45+random()*.23:.48+random()*.27,width=baseWidth*LAND_RENDER_SCALE;
  if(reservedGround(geo,width,clearings)||!clearGround(geo,width,{heightAt,regionAt,riverAt}))continue;
  const position=worldPoint(geo,.027);
  if(smallSettlements.some(s=>Math.abs(position.x-s.position.x)<s.width*.65+width*.2&&position.z-s.position.z>-.3&&position.z-s.position.z<1.7))continue;
  if(!spacing.accept(position,width))continue;
  placements.push({geo,position,baseWidth,width,renderScale:LAND_RENDER_SCALE,pine,mirror:random()>.5});if(scattered)isolated++;contactInk(ink,position,width,{worldPoint,regionAt,riverAt});
 }
 const treeAssets=placements.map(tree=>({geo:tree.geo,position:tree.position.toArray(),asset:tree.pine?'fir':'oak',baseWidth:tree.baseWidth,width:tree.width,renderScale:tree.renderScale,footWidth:tree.width,footDepth:tree.width*.18}));
 group.userData={paperIllustration:true,dimensional:false,style:'isometric-paper-diorama',renderScale:LAND_RENDER_SCALE,trees:placements.length,conifers:placements.filter(p=>p.pine).length,broadleaf:placements.filter(p=>!p.pine).length,isolatedTrees:isolated,groveTrees:placements.length-isolated,heroClearings:clearings.length,treeWidth:[.9,1.5],treeAssets};
 installContactInk(THREE,group,ink,'woodland-contact-quill');
 const result={group,count:placements.length,drawCalls:1,ready:null};scene.add(group);
 result.ready=paperAtlas(THREE,mobile).then(({atlas,texture,createPaperCard})=>{
  const batch=new PaperBatch(THREE);
  for(const [i,tree]of placements.entries()){
   const card=createPaperCard({THREE,atlas,texture,asset:tree.pine?'fir':'oak',width:tree.width,mirror:tree.mirror,kind:'land',segments:[Math.ceil(tree.width/.22),1]});
   Object.assign(treeAssets[i],{height:card.userData.height,baseHeight:card.userData.height/LAND_RENDER_SCALE});
   batch.add(card,tree.position,(x,z)=>heightAt(...geoFrom(x,z))+.027);
  }
  result.drawCalls+=batch.finish(group,'painted-tree-dioramas');group.userData.drawCalls=result.drawCalls;return group;
 });
 return result;
}

const villageSites=[
 ['Hardanger',[6.3,60.32],3],['Telemark',[8.5,59.1],3],['Gudbrandsdal',[9.5,61.5],3],['Trøndelag',[11.1,63.9],3],
 ['Dalarna',[14.4,60.6],3],['Småland',[14.5,57.2],3],['Scania',[13.5,55.9],2],['Jutland',[9.2,56.1],3],
 ['Pomerania',[16.1,54.0],3],['Masuria',[21.9,53.8],3],['Wielkopolska',[17.0,52.1],3],['Lower Silesia',[16.3,51.0],2],
 ['Yorkshire',[-1.6,54.2],3],['Wales',[-3.8,52.1],3],['Munster',[-8.6,52.0],2],['Schleswig',[9.3,54.7],2],
 ['Brandenburg',[13.9,52.8],3],['Finnish lakes',[26.0,61.5],3],
 ['Setesdal',[7.8,59.2],3],['Valdres',[9.4,61.1],3],['Innherred',[11.7,64.1],3],['Helgeland',[13.2,65.4],3],
 ['Värmland',[13.1,59.7],3],['Östergötland',[15.3,58.1],3],['Hälsingland',[16.2,61.6],3],['Västerbotten',[19.4,64.6],3],
 ['Ostrobothnia',[23.5,63.4],3],['Central Finland',[25.7,62.8],3],['Savonia',[27.5,61.7],3],['Kainuu',[28.2,64.3],3],
 ['Courland',[22.3,56.9],3],['Estonian uplands',[25.2,58.4],3],['Lithuanian meadows',[24.1,55.4],3],
 ['Kuyavia',[18.5,52.7],3],['Lesser Poland',[20.6,50.2],3],['Podlasie',[23.1,53.1],3],['Lubusz',[15.5,52.2],3],
 ['Lower Saxony',[9.2,52.7],3],['Mecklenburg',[12.3,53.5],3],['Hesse',[9.3,50.7],3],['Westphalia',[8.0,51.8],3],
 ['North Jutland',[9.5,56.8],3],['East Anglia',[.9,52.7],3],['Northumberland',[-2.1,55.1],3],
 ['The Highlands',[-4.7,57.2],3],['Connacht',[-8.6,53.8],3],['Brittany',[-3.1,48.4],3],
 ['Friesland',[6.2,53.2],3],['Hofn',[-15.2,64.3],3],['East Iceland',[-14.5,65.0],3]
];
const settlementRanges=[
 [5.9,12.1,58.7,64.2],[12.5,21.0,56.0,65.0],[21.5,29.5,60.1,65.8],
 [14.7,24.0,50.0,54.2],[6.0,15.0,49.7,54.4],[-8.7,1.5,51.0,57.5],[21.7,28.0,55.0,59.0]
];
const lighthouseSites=[
 {name:'Lindesnes lighthouse',geo:[7.0469,57.9828],width:1.03},
 {name:'Kullen lighthouse',geo:[12.4525,56.3017],width:.94},
 {name:'Hirtshals lighthouse',geo:[9.9410,57.5844],width:1.05}
];
function landPosition(geo,regionAt,heightAt,width=.36,riverAt=()=>false,{maxRings=30,maxHeightSpread=.38,allowed=()=>true}={}){
 for(let ring=0;ring<=maxRings;ring++)for(let i=0;i<(ring?24:1);i++){
  const t=i/24*Math.PI*2,a=[geo[0]+Math.cos(t)*ring*.012,geo[1]+Math.sin(t)*ring*.006];
  if(!regionAt(a)||riverAt(a)||!allowed(a))continue;
  if(clearGround(a,width,{heightAt,regionAt,riverAt},maxHeightSpread))return a;
 }
 return null;
}

function planSettlements({worldPoint,heightAt,regionAt,riverAt,landmarks,mobile}){
 const random=randomFrom(2602),target=mobile?76:122,clearings=heroClearings(landmarks),spacing=makeSpacing(1.0),placements=[];
 for(let attempt=0;attempt<target*50&&placements.length<target;attempt++){
  const isolated=random()<.43;let geo,name;
  if(isolated){
   const[west,east,south,north]=settlementRanges[Math.floor(random()*settlementRanges.length)];
   geo=[west+random()*(east-west),south+random()*(north-south)];name='Country cottage';
  }else{
   const[area,center]=villageSites[Math.floor(random()*villageSites.length)];name=area;
   geo=[center[0]+(random()-.5)*.85,center[1]+(random()-.5)*.43];
  }
  const cottage=isolated||random()<.27,baseWidth=cottage?.55+random()*.18:.67+random()*.23,width=baseWidth*LAND_RENDER_SCALE;
  if(reservedGround(geo,width,clearings)||foregroundQuiet(geo)&&random()<.70)continue;
  if(!regionAt(geo)||heightAt(...geo)>2.9)continue;
  const fitted=landPosition(geo,regionAt,heightAt,width,riverAt);
  if(!fitted||reservedGround(fitted,width,clearings))continue;
  const position=worldPoint(fitted,.035);if(!spacing.accept(position,width,.66))continue;
  placements.push({name,geo:fitted,position,baseWidth,width,renderScale:LAND_RENDER_SCALE,asset:cottage?'cottage':'village',cottage,isolated,mirror:random()>.5,kind:'land'});
 }
 return placements;
}

export function addMapScenery({THREE,scene,worldPoint,heightAt,regionAt,riverAt=()=>false,landmarks=[],mobile=false}){
 const group=new THREE.Group();group.name='geographic-paper-diorama-scenery';
 const random=randomFrom(1502),houses=[],lighthouses=[],seaRocks=[],placements=[],ink=[],clearings=heroClearings(landmarks);
 const settlements=planSettlements({worldPoint,heightAt,regionAt,riverAt,landmarks,mobile});
 for(const item of settlements){
  const metadata={name:item.name,geo:item.geo,position:item.position.toArray(),baseWidth:item.baseWidth,width:item.width,renderScale:item.renderScale,footWidth:item.width,footDepth:item.width*.18,asset:item.asset,isolated:item.isolated,paperIllustration:true};
  houses.push(metadata);placements.push({...item,metadata});
  contactInk(ink,item.position,item.width,{worldPoint,regionAt,riverAt});
 }
 for(const site of lighthouseSites){
  const width=site.width*LAND_RENDER_SCALE,geo=landPosition(site.geo,regionAt,heightAt,width,riverAt,{maxRings:120,maxHeightSpread:.72,allowed:g=>!reservedGround(g,width,clearings)});if(!geo)continue;
  const p=worldPoint(geo,.035),metadata={name:site.name,coordinates:site.geo,drawingCoordinates:geo,position:p.toArray(),baseWidth:site.width,width,renderScale:LAND_RENDER_SCALE,footWidth:width,footDepth:width*.18,paperIllustration:true};lighthouses.push(metadata);
  placements.push({asset:'lighthouse',position:p,width,renderScale:LAND_RENDER_SCALE,metadata,kind:'land'});contactInk(ink,p,width*.7,{worldPoint,regionAt,riverAt});
 }
 const clusters=[[4.2,58.5],[4.1,60.2],[7.0,63.2],[11.0,66.4],[-2.9,59.5],[-5.9,56.2],[-8.5,54.8],[17.3,57.0],[20.1,55.6],[7.2,55.3],[-.8,58.0],[-3.2,50.0]];
 for(const[lon,lat]of clusters)for(let i=0;i<(mobile?2:4);i++){
  const geo=[lon+(random()-.5)*.5,lat+(random()-.5)*.22],p=worldPoint(geo),size=.25+random()*.35,width=size*1.9;
  if(regionAt(geo)||[[width*.65,0],[-width*.65,0],[0,width*.65],[0,-width*.65]].some(([x,z])=>regionAt(geoFrom(p.x+x,p.z+z))))continue;
  p.y=SEA+.022;const metadata={geo,size,width,baseWidth:width,renderScale:1,paperIllustration:true};seaRocks.push(metadata);placements.push({asset:'sea_rocks',position:p,width,renderScale:1,metadata,kind:'sea',mirror:random()>.5});
 }
 group.userData={paperIllustration:true,dimensional:false,style:'isometric-paper-diorama',landRenderScale:LAND_RENDER_SCALE,seaRockRenderScale:1,houses,lighthouses,seaRocks,houseCount:houses.length,cottageCount:settlements.filter(s=>s.cottage).length,hamletCount:settlements.filter(s=>!s.cottage).length,isolatedSettlements:settlements.filter(s=>s.isolated).length,lighthouseCount:lighthouses.length,rockCount:seaRocks.length};scene.add(group);
 installContactInk(THREE,group,ink,'village-and-lighthouse-contact-quill');
 const result={group,houses:houses.length,lighthouses:lighthouses.length,rocks:seaRocks.length,drawCalls:1,ready:null};
 result.ready=paperAtlas(THREE,mobile).then(({atlas,texture,createPaperCard})=>{
  const batch=new PaperBatch(THREE);
  for(const item of placements){
   const asset=atlas.art[item.asset]?item.asset:'village';
   const card=createPaperCard({THREE,atlas,texture,asset,width:item.width,mirror:!!item.mirror,kind:item.kind,segments:item.kind==='land'?[Math.ceil(item.width/.22),1]:[1,1]});
   if(item.metadata)Object.assign(item.metadata,{asset,height:card.userData.height,baseHeight:card.userData.height/item.renderScale});
   batch.add(card,item.position,item.kind==='land'?(x,z)=>heightAt(...geoFrom(x,z))+.035:null);
  }
  result.drawCalls+=batch.finish(group,'painted-countryside-and-sea-rocks');group.userData.drawCalls=result.drawCalls;return group;
 });
 return result;
}
