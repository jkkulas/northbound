// Physical support comes from the same coast mask and triangulated river ribbon
// that are rendered. A named landmark's geographic pin is not its footprint.
export const toGeo=(x,z)=>[x/2.2+13,60-z/4.4];

export function createDryGround({scene,regionAt,heightAt}){
 const bins=new Map(),cell=1.2,triangles=[];
 scene.updateMatrixWorld(true);
 scene.traverse(object=>{
  if(object.name!=='exaggerated-geographic-river-banks-and-water')return;
  const p=object.geometry.attributes.position,index=object.geometry.index.array;
  for(let i=0;i<index.length;i+=3){
   const t=[];for(let j=0;j<3;j++){const k=index[i+j];t.push(p.getX(k),p.getZ(k));}
   const minX=Math.min(t[0],t[2],t[4]),maxX=Math.max(t[0],t[2],t[4]),minZ=Math.min(t[1],t[3],t[5]),maxZ=Math.max(t[1],t[3],t[5]);
   const id=triangles.push(t)-1;
   for(let x=Math.floor(minX/cell);x<=Math.floor(maxX/cell);x++)for(let z=Math.floor(minZ/cell);z<=Math.floor(maxZ/cell);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(id);}
  }
 });
 const riverAt=(x,z)=>{
  for(const id of bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){
   const [ax,az,bx,bz,cx,cz]=triangles[id],a=(bx-ax)*(z-az)-(bz-az)*(x-ax),b=(cx-bx)*(z-bz)-(cz-bz)*(x-bx),c=(ax-cx)*(z-cz)-(az-cz)*(x-cx);
   if((a>=-1e-8&&b>=-1e-8&&c>=-1e-8)||(a<=1e-8&&b<=1e-8&&c<=1e-8))return true;
  }return false;
 };
 const single=(x,z)=>!!regionAt(toGeo(x,z))&&!riverAt(x,z);
 const isDry=(x,z,margin=0)=>{
  if(!single(x,z))return false;
  if(margin)for(let i=0;i<8;i++){const a=i*Math.PI/4;if(!single(x+Math.cos(a)*margin,z+Math.sin(a)*margin))return false;}
  return true;
 };
 isDry.riverAt=riverAt;
 isDry.heightAt=(x,z)=>heightAt(...toGeo(x,z));
 isDry.riverTriangles=triangles.length;
 return isDry;
}

export function footprintSamples(box,spacing=.12){
 const [minX,maxX,minZ,maxZ]=box,nx=Math.max(1,Math.ceil((maxX-minX)/spacing)),nz=Math.max(1,Math.ceil((maxZ-minZ)/spacing)),points=[];
 for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)points.push([minX+(maxX-minX)*i/nx,minZ+(maxZ-minZ)*j/nz]);
 return points;
}

export function fitDryFootprint({anchor,box,isDry,heightAt,regionAt,region,maxRadius=7,preferred=[0,0],filter=()=>true,occupied=[]}){
 const samples=footprintSamples(box),quick=[samples[0],samples.at(-1),[box[0],box[3]],[box[1],box[2]],[(box[0]+box[1])/2,(box[2]+box[3])/2]],candidates=[];
 const check=(x,z,points)=>points.every(([dx,dz])=>isDry(x+dx,z+dz,.055));
 for(let ring=0;ring<=Math.ceil(maxRadius/.22);ring++){
  const radius=ring*.22,count=ring?Math.max(12,Math.ceil(radius*Math.PI*2/.22)):1;
  for(let j=0;j<count;j++){
   const a=j/count*Math.PI*2,x=anchor.x+preferred[0]+Math.cos(a)*radius,z=anchor.z+preferred[1]+Math.sin(a)*radius,geo=toGeo(x,z);
   if(!filter(geo)||region&&regionAt(geo)!==region||!check(x,z,quick))continue;
   const bounds={min:[x+box[0],0,z+box[2]],max:[x+box[1],0,z+box[3]]};
   if(occupied.some(o=>bounds.min[0]<o.max[0]+.3&&bounds.max[0]>o.min[0]-.3&&bounds.min[2]<o.max[2]+.3&&bounds.max[2]>o.min[2]-.3))continue;
   if(!check(x,z,samples))continue;
   let lo=Infinity,hi=-Infinity;for(const [dx,dz]of samples){const h=heightAt(...toGeo(x+dx,z+dz));lo=Math.min(lo,h);hi=Math.max(hi,h);}
   candidates.push({x,z,coordinates:geo,span:hi-lo,score:Math.hypot(x-anchor.x,z-anchor.z)+(hi-lo)*2.4,samples:samples.length,bounds});
  }
  // Compare a small neighborhood, favoring natural low terraces over cliffs.
  if(candidates.length&&radius>Math.hypot(candidates[0].x-anchor.x-preferred[0],candidates[0].z-anchor.z-preferred[1])+.65)break;
 }
 candidates.sort((a,b)=>a.score-b.score);return candidates[0]||null;
}
