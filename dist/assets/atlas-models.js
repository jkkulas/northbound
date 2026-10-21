// Solid, hand coloured atlas architecture. Every building is made from geometry,
// then consolidated into one painted surface and one batch of quill edges.
export function createMapModelMaterial(THREE) {
  return new THREE.ShaderMaterial({
    vertexColors:true,toneMapped:false,
    vertexShader:`varying vec3 vPigment;varying vec3 vAtlasPoint;varying vec3 vAtlasNormal;
      void main(){vPigment=color;vAtlasPoint=(modelMatrix*vec4(position,1.)).xyz;
      vAtlasNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vAtlasPoint,1.);}`,
    fragmentShader:`varying vec3 vPigment;varying vec3 vAtlasPoint;varying vec3 vAtlasNormal;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){vec3 p=vAtlasPoint,n=normalize(vAtlasNormal);float light=dot(n,normalize(vec3(-.55,.78,-.30)));
      float shade=.72+.28*light;vec3 col=vPigment*shade;
      float hatch=p.x*25.+p.y*19.+p.z*14.+noise(p.xz*7.)*.12;
      float aa=max(fwidth(hatch),.02);float line=1.-smoothstep(.038,.038+aa,abs(fract(hatch)-.5));
      col*=1.-line*(.12+.11*(1.-max(light,0.)));
      col+=(noise(p.xz*17.+p.y*5.)-.5)*.045+(hash(floor(p.xz*115.+p.y*31.))-.5)*.025;
      col=mix(col,vec3(.47,.365,.18),.045);gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
      }`,
  });
}

export function createModelBuilder(THREE) {
  const positions=[],normals=[],colors=[],edges=[],scratch=new THREE.Object3D(),color=new THREE.Color();
  let parts=0;
  function add(geometry,pigment=0xb78751,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],outline=false){
    scratch.position.fromArray(position);scratch.rotation.set(...rotation);scratch.scale.fromArray(scale);scratch.updateMatrix();
    geometry.applyMatrix4(scratch.matrix);
    if(outline){const e=new THREE.EdgesGeometry(geometry,35);edges.push(...e.attributes.position.array);e.dispose();}
    const flat=geometry.index?geometry.toNonIndexed():geometry;
    const p=flat.attributes.position,n=flat.attributes.normal;color.setHex(pigment);
    for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(color.r,color.g,color.b);}
    if(flat!==geometry)flat.dispose();geometry.dispose();parts++;return api;
  }
  function box(x,y,z,w,h,d,pigment,outline=false,angle=0){return add(new THREE.BoxGeometry(w,h,d),pigment,[x,y,z],[0,angle,0],[1,1,1],outline);}
  function cylinder(x,y,z,top,bottom,height,pigment,segments=20,outline=false){return add(new THREE.CylinderGeometry(top,bottom,height,segments,1),pigment,[x,y,z],[0,0,0],[1,1,1],outline);}
  function sphere(x,y,z,rx,ry,rz,pigment){return add(new THREE.SphereGeometry(1,20,12),pigment,[x,y,z],[0,0,0],[rx,ry,rz]);}
  function beam(a,b,r,pigment,segments=8){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),dir=q.clone().sub(p),geo=new THREE.CylinderGeometry(r,r,dir.length(),segments);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));return add(geo,pigment,p.add(q).multiplyScalar(.5).toArray());}
  function prism(points,depth,pigment,position=[0,0,0],rotation=[0,0,0],outline=false){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12});geo.translate(0,0,-depth/2);return add(geo,pigment,position,rotation,[1,1,1],outline);}
  function roof(x,y,z,w,h,d,pigment=0x795544,angle=0){return prism([[-w/2,0],[0,h],[w/2,0]],d,pigment,[x,y,z],[0,angle,0],true);}
  function hip(x,y,z,w,d,h,pigment=0x785748){const v=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w*.23,h,0],[w*.23,h,0]],idx=[0,4,5,0,5,1,1,5,2,2,5,4,2,4,3,3,4,0];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(idx.flatMap(i=>v[i]),3));geo.computeVertexNormals();return add(geo,pigment,[x,y,z],[0,0,0],[1,1,1],true);}
  function curve(points,r,pigment,segments=32){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(new THREE.TubeGeometry(path,segments,r,6,false),pigment);}
  function window(x,y,z,w=.18,h=.28,face='front',pigment=0x344943){
    // Deep shadow, warm reveal and a slender central mullion: no printed quads.
    const side=face==='side';box(x,y,z,side?.025:w+.052,h+.045,side?w+.052:.025,0xdec28d);
    box(x+(side?.018:0),y,z+(side?0:.018),side?.026:w,h,side?w:.026,pigment);
    box(x+(side?.035:0),y,z+(side?0:.035),side?.025:.022,h,side?.022:.025,0xb89a66);
    box(x+(side?.035:0),y+.015,z+(side?0:.035),side?.025:w,.018,side?w:.025,0xb89a66);return api;
  }
  function arch(x,y,z,w,h,depth,pigment=0x343a30,angle=0){const pts=[[-w/2,0],[-w/2,h-w/2]];for(let i=0;i<=12;i++){const t=Math.PI-i/12*Math.PI;pts.push([Math.cos(t)*w/2,h-w/2+Math.sin(t)*w/2]);}pts.push([w/2,0]);return prism(pts,depth,pigment,[x,y,z],[0,angle,0]);}
  function skirt(x,top,z,w,d,ground,pigment=0x8c7750){
    const xy=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],v=[];
    for(let i=0;i<4;i++){
      const a=xy[i],q=xy[(i+1)%4],count=Math.max(2,Math.ceil(Math.hypot(q[0]-a[0],q[1]-a[1])/.13));
      for(let j=0;j<count;j++){
        const t=j/count,u=(j+1)/count,ax=x+a[0]+(q[0]-a[0])*t,az=z+a[1]+(q[1]-a[1])*t,bx=x+a[0]+(q[0]-a[0])*u,bz=z+a[1]+(q[1]-a[1])*u,ay=Math.min(top,ground(ax,az)-.07),by=Math.min(top,ground(bx,bz)-.07);
        v.push(ax,ay,az,bx,top,bz,bx,by,bz,ax,ay,az,ax,top,az,bx,top,bz);
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();return add(geo,pigment);
  }
  function finish(name='atlas-model',material=createMapModelMaterial(THREE)){
    const g=new THREE.Group();g.name=name;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const painted=new THREE.Mesh(geometry,material);painted.name=name+'-painted-solid';painted.userData={dimensional:true,parts};g.add(painted);
    if(edges.length){const edgeGeo=new THREE.BufferGeometry();edgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));const lines=new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:0x423627,transparent:true,opacity:.38}));lines.name=name+'-engraved-edges';g.add(lines);}
    g.userData={dimensional:true,parts,triangles:positions.length/9,drawCalls:g.children.length};return g;
  }
  const api={add,box,cylinder,sphere,beam,prism,roof,hip,curve,window,arch,skirt,finish};return api;
}
