// Shared pigments and real silhouettes make the atlas read as one small world.
export function modelKit(THREE) {
  const colors = { ink: 0x46564a, cream: 0xc8bfa3, white: 0xd7d0b8, stone: 0x9d9d87,
    ochre: 0xab8a4e, gold: 0xc5a253, rust: 0x9d6148, red: 0x8c4e3d, sage: 0x71856a,
    dark: 0x475e50, teal: 0x597a73, blue: 0x6e8780, water: 0xa8b9a8, wood: 0x735941 };
  const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [name,
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true })]));
  const ink = new THREE.LineBasicMaterial({ color: colors.ink, transparent: true, opacity: .46 });
  const wakeMaterial = new THREE.LineBasicMaterial({ color: 0xd1d1b3, transparent: true, opacity: .7 });
  function solid(group, geometry, color = 'cream', position = [0, 0, 0], outline = false) {
    const mesh = new THREE.Mesh(geometry, materials[color] || color);
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    if (outline) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), ink));
    return mesh;
  }
  function box(group, size, position, color, outline = false) { return solid(group, new THREE.BoxGeometry(...size), color, position, outline); }
  function ball(group, radius, position, scale = [1, 1, 1], color = 'sage', detail = 1) {
    const mesh = solid(group, new THREE.IcosahedronGeometry(radius, detail), color, position); mesh.scale.set(...scale); return mesh;
  }
  function cylinder(group, top, bottom, height, position, color = 'stone', sides = 8, outline = false) {
    return solid(group, new THREE.CylinderGeometry(top, bottom, height, sides), color, position, outline);
  }
  function beam(group, from, to, radius = .04, color = 'ink', sides = 6) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
    const mesh = solid(group, new THREE.CylinderGeometry(radius, radius, delta.length(), sides), color, a.clone().add(b).multiplyScalar(.5).toArray());
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return mesh;
  }
  function path(group, points, radius, color, outline = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return solid(group, new THREE.TubeGeometry(curve, Math.max(12, points.length * 5), radius, 7, false), color, [0, 0, 0], outline);
  }
  function line(group, points, material = ink) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), material); group.add(line); return line; }
  function polygon(group, points, depth, color, position = [0, 0, 0], outline = true) {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]); points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
    return solid(group, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), color, position, outline);
  }
  function roof(group, width, height, depth, position, color = 'red') {
    return polygon(group, [[-width/2, 0], [0, height], [width/2, 0]], depth, color, [position[0], position[1], position[2]-depth/2]);
  }
  function house(group, x, width, height, depth, color = 'ochre', z = 0) {
    box(group, [width, height, depth], [x, height/2, z], color, true);
    roof(group, width + .1, width*.58, depth + .12, [x, height, z]);
    for (let row = 0; row < Math.max(1, Math.floor(height/.65)); row++) {
      for (let col = -1; col <= 1; col += 2) box(group, [.13, .25, .025], [x+col*width*.22, .48+row*.54, z+depth/2+.025], 'dark');
    }
    box(group, [.19, .43, .035], [x, .22, z+depth/2+.03], 'wood');
  }
  function flag(group, at, height = 1, color = 'red') {
    const [x,y,z] = at; beam(group, [x,y,z], [x,y+height,z], .025, 'ink');
    polygon(group, [[0, 0], [.5,.05], [.43,-.25], [0,-.2]], .015, color, [x,y+height,z], false);
  }
  function shadow(group, width, depth, y = .015, opacity = .2) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32,32,5,32,32,32);
    gradient.addColorStop(0, `rgba(45,62,45,${opacity})`); gradient.addColorStop(.5, `rgba(45,62,45,${opacity*.6})`); gradient.addColorStop(1,'rgba(45,62,45,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64);
    const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,depth), material); mesh.rotation.x = -Math.PI/2; mesh.position.y = y; mesh.userData.nonColliding = true; group.add(mesh); return mesh;
  }
  function wakes(group, width, depth, y = .07) {
    for (let i = 0; i < 3; i++) {
      const points = [], radius = 1+i*.22;
      for (let step = 0; step <= 36; step++) { const a = step/36*Math.PI*2; points.push([Math.cos(a)*width*.5*radius, y+i*.003, Math.sin(a)*depth*.5*radius]); }
      line(group, points, wakeMaterial);
    }
  }
  // One draw per pigment/ink rather than one per window, mast or sucker. Only
  // static opaque geometry is baked; textured contact shadows stay independent.
  function batch(group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(), matrix = new THREE.Matrix4();
    const meshes = new Map(), lines = new Map(), originals = [];
    let before = 0;
    group.traverse(object => {
      if (object.isMesh || object.isLine) before++;
      if (object.isMesh && !Array.isArray(object.material) && !object.material.transparent && !object.material.map) {
        const key=object.material.uuid;
        if (!meshes.has(key)) meshes.set(key,{material:object.material,geometries:[]});
        matrix.multiplyMatrices(inverse,object.matrixWorld);
        const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
        geometry.applyMatrix4(matrix);
        meshes.get(key).geometries.push(geometry); originals.push(object);
      } else if (object.isLine && !Array.isArray(object.material)) {
        const key=object.material.uuid;
        if (!lines.has(key)) lines.set(key,{material:object.material,positions:[]});
        matrix.multiplyMatrices(inverse,object.matrixWorld);
        const position=object.geometry.attributes.position,index=object.geometry.index;
        const count=index?index.count:position.count,vertices=lines.get(key).positions;
        const a=new THREE.Vector3(),b=new THREE.Vector3();
        for(let i=0;i<count-1;i+=object.isLineSegments?2:1){
          a.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(matrix);
          b.fromBufferAttribute(position,index?index.getX(i+1):i+1).applyMatrix4(matrix);
          vertices.push(a.x,a.y,a.z,b.x,b.y,b.z);
        }
        originals.push(object);
      }
    });
    // Capture all world matrices before removing parents (ink edges are children).
    originals.forEach(object=>object.removeFromParent());
    for(const {material,geometries} of meshes.values()){
      const merged=new THREE.BufferGeometry();
      for(const name of ['position','normal','uv']){
        const itemSize=name==='uv'?2:3;
        const length=geometries.reduce((total,geometry)=>total+geometry.attributes.position.count*itemSize,0);
        const values=new Float32Array(length);let offset=0;
        for(const geometry of geometries){
          const attribute=geometry.attributes[name],size=geometry.attributes.position.count*itemSize;
          if(attribute)values.set(attribute.array,offset);
          offset+=size;
        }
        merged.setAttribute(name,new THREE.BufferAttribute(values,itemSize));
      }
      merged.computeBoundingBox();merged.computeBoundingSphere();
      const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='batched-'+material.color.getHexString();group.add(mesh);
      geometries.forEach(geometry=>geometry.dispose());
    }
    for(const {material,positions} of lines.values()){
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.computeBoundingSphere();const object=new THREE.LineSegments(geometry,material);object.name='batched-ink';group.add(object);
    }
    let after=0;group.traverse(object=>{if(object.isMesh||object.isLine)after++});
    group.userData.batching={before,after};return group;
  }
  return { materials, ink, solid, box, ball, cylinder, beam, path, line, polygon, roof, house, flag, shadow, wakes, batch };
}
