// Keep the DEM resolution along the coastline, but never submit empty sea cells.
// One vertex buffer contains only land-adjacent vertices; normals are calculated
// before compaction so shading remains continuous at the edge of the ink mask.
export function createLandMeshGeometry({THREE,bounds:b,mobile,heightAt,regionAt}) {
  const nx=mobile?240:520,nz=mobile?260:520;
  const grid=new THREE.PlaneGeometry((b.east-b.west)*2.2,(b.north-b.south)*4.4,nx,nz);
  grid.rotateX(-Math.PI/2);
  grid.translate(((b.east+b.west)/2-13)*2.2,0,(60-(b.north+b.south)/2)*4.4);
  const positions=grid.attributes.position,occupied=new Uint8Array(positions.count);
  let maxHeight=0;
  for(let i=0;i<positions.count;i++) {
    const lon=positions.getX(i)/2.2+13,lat=60-positions.getZ(i)/4.4,h=heightAt(lon,lat);
    positions.setY(i,h);maxHeight=Math.max(maxHeight,h);occupied[i]=regionAt([lon,lat]);
  }
  grid.computeVertexNormals();
  const indices=[],remap=new Int32Array(positions.count).fill(-1),used=[];
  const include=i=>{if(remap[i]===-1){remap[i]=used.length;used.push(i)}return remap[i]};
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++) {
    const a=z*(nx+1)+x,bottom=a+nx+1;
    const lon=b.west+(x+.5)/nx*(b.east-b.west),lat=b.north-(z+.5)/nz*(b.north-b.south);
    if(!(occupied[a]||occupied[a+1]||occupied[bottom]||occupied[bottom+1]||regionAt([lon,lat])))continue;
    indices.push(include(a),include(bottom),include(a+1),include(bottom),include(bottom+1),include(a+1));
  }
  const geometry=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv']) {
    const attribute=grid.attributes[name],values=new Float32Array(used.length*attribute.itemSize);
    used.forEach((source,i)=>{for(let c=0;c<attribute.itemSize;c++)values[i*attribute.itemSize+c]=attribute.array[source*attribute.itemSize+c]});
    geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
  }
  geometry.setIndex(indices);geometry.computeBoundingSphere();grid.dispose();
  geometry.userData={originalTriangles:nx*nz*2,landTriangles:indices.length/3};
  return {geometry,maxHeight};
}
