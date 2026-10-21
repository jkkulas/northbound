// The illustrations are opaque ink on the same sheet as the chart. Only the
// unpainted background is cut away; land never shows through a painted body.
export function createAtlasPigment({THREE,sea=false,landMask=null,atlasBounds=null}) {
  return new THREE.ShaderMaterial({
    name:sea?'Maritime chart pigment':'Architectural chart pigment',
    transparent:false,depthWrite:true,depthTest:true,side:THREE.FrontSide,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:{uArtwork:{value:null},uSea:{value:sea?1:0},uLandMask:{value:landMask},uBounds:{value:atlasBounds||new THREE.Vector4()}},
    vertexShader:`attribute vec2 pictureUv;varying vec2 vUv;varying vec2 vPicture;varying vec3 vWorld;
      void main(){vUv=uv;vPicture=pictureUv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`
      uniform sampler2D uArtwork;uniform float uSea;
      varying vec2 vUv;varying vec2 vPicture;varying vec3 vWorld;
      float grain(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(grain(i),grain(i+vec2(1.,0.)),f.x),mix(grain(i+vec2(0.,1.)),grain(i+vec2(1.)),f.x),f.y);}
      vec3 pigmentToScreen(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
      void main(){
        vec4 texel=texture2D(uArtwork,vUv);if(texel.a<.18)discard;
        vec3 source=pigmentToScreen(texel.rgb);
        float value=dot(source,vec3(.299,.587,.114));
        float chroma=max(source.r,max(source.g,source.b))-min(source.r,min(source.g,source.b));
        // A small historical paint box unifies every subject. Original penwork
        // and tonal detail survive, while digital reds/blues become earth inks.
        vec3 ink=vec3(.205,.218,.166),paper=vec3(.922,.860,.664);
        vec3 pigment=vec3(.625,.536,.317);
        float cool=smoothstep(.015,.16,source.b-source.r);
        float olive=smoothstep(.005,.14,source.g-source.r)*(1.-cool);
        float rust=smoothstep(.035,.22,source.r-source.g)*(1.-smoothstep(.04,.23,source.g-source.b));
        pigment=mix(pigment,vec3(.315,.463,.385),cool);
        pigment=mix(pigment,vec3(.459,.493,.295),olive);
        pigment=mix(pigment,vec3(.640,.392,.252),rust);
        pigment=mix(vec3(.641,.593,.424),pigment,smoothstep(.035,.25,chroma));
        vec3 color=mix(ink,pigment,smoothstep(.025,.53,value));
        color=mix(color,paper,smoothstep(.48,.965,value)*.94);
        // The grain is fixed to map coordinates, at the same physical scale as
        // the land's paper fibres. It does not swim when the camera moves.
        vec2 p=vWorld.xz;
        color+=(noise(p*6.5)-.5)*.017+(noise(p*vec2(48.,16.))-.5)*.008;
        gl_FragColor=vec4(color,1.);
      }`,
    userData:{style:'opaque-chart-engraving'},
  });
}

export function preservePictureUv(geometry) {
  geometry.setAttribute('pictureUv',geometry.attributes.uv.clone());return geometry;
}

// North is image-up. The measured chart depth compensates for the oblique
// overview without ever turning the image toward a camera.
export function createChartPlane(THREE,rect,width,atlasWidth,atlasHeight,depthScale=1.8) {
  const [left,top,right,bottom]=rect,depth=width*(bottom-top)/(right-left)*depthScale;
  const geometry=preservePictureUv(new THREE.PlaneGeometry(width,depth,Math.ceil(width/.22),Math.ceil(depth/.22)));
  geometry.rotateX(-Math.PI/2);geometry.translate(0,0,-depth*.5);
  const uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(left+uv.getX(i)*(right-left))/atlasWidth,1-(bottom-uv.getY(i)*(bottom-top))/atlasHeight);
  geometry.userData={chartWidth:width,chartDepth:depth,depthScale};
  return geometry;
}

// Sample the actual painted silhouette, including fine rope/antenna tips. The
// source atlas is shared; its pixels are read only once when all art is ready.
const sourcePixels=new WeakMap();
export function chartSilhouette(texture,rect,atlasWidth,atlasHeight,{waterfront=false}={}) {
  let bitmap=sourcePixels.get(texture);
  if(!bitmap){
    const image=texture.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    bitmap={width:image.width,height:image.height,data:ctx.getImageData(0,0,image.width,image.height).data};sourcePixels.set(texture,bitmap);
  }
  const [left,top,right,bottom]=rect,sx=bitmap.width/atlasWidth,sy=bitmap.height/atlasHeight,exact=[],coarse=[];
  for(let y=Math.floor(top*sy);y<Math.ceil(bottom*sy);y++)for(let x=Math.floor(left*sx);x<Math.ceil(right*sx);x++){
    if(bitmap.data[(y*bitmap.width+x)*4+3]<46)continue;
    const u=((x+.5)/sx-left)/(right-left),v=1-((y+.5)/sy-top)/(bottom-top);
    // Harbor paintings intentionally include a small band of water at the foot.
    if(waterfront&&v<.22)continue;
    exact.push(u-.5,v);if(x%12===0&&y%12===0)coarse.push(u-.5,v);
  }
  return {exact:new Float32Array(exact),coarse:new Float32Array(coarse.length?coarse:exact)};
}

export function fitChartPlacement({origin,width,depth,scale=1,regionAt,silhouette,sea=false,requiredRegion=0,maxDistance=12,allowShrink=true,accept=()=>true}) {
  if(!regionAt)return {x:origin[0],z:origin[1],scale,clear:true};
  const supported=(x,z,s,points)=>{
    for(let i=0;i<points.length;i+=2){
      const px=x+points[i]*width*s,pz=z-points[i+1]*depth*s,id=regionAt([px/2.2+13,60-pz/4.4]);
      if(sea?id!==0:requiredRegion?id!==requiredRegion:!id)return false;
    }return true;
  };
  const candidates=[],scales=allowShrink?[1,.94,.88,.82]:[1];
  for(const factor of scales)for(let dz=-maxDistance;dz<=maxDistance;dz+=.5)for(let dx=-maxDistance;dx<=maxDistance;dx+=.5){
    const distance=Math.hypot(dx,dz);if(distance>maxDistance)continue;
    const x=origin[0]+dx,z=origin[1]+dz,s=scale*factor;
    if(!accept(x,z,s))continue;
    candidates.push({x,z,scale:s,score:distance+(1-factor)*15});
  }
  candidates.sort((a,b)=>a.score-b.score);
  for(const candidate of candidates){
    const {x,z,scale:s}=candidate;
    if(supported(x,z,s,silhouette.coarse)&&supported(x,z,s,silhouette.exact))return {...candidate,clear:true};
  }
  return {x:origin[0],z:origin[1],scale,clear:false};
}

// Mesh transforms remain translation/scale only. Re-run after any geographic
// edit so every vertex follows the relief underneath the painted footprint.
export function conformChartMesh(THREE,mesh,heightAt,lift=.035) {
  mesh.updateWorldMatrix(true,false);
  const world=mesh.matrixWorld,inverse=world.clone().invert(),point=new THREE.Vector3(),position=mesh.geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    point.set(position.getX(i),0,position.getZ(i)).applyMatrix4(world);
    point.y=heightAt(point.x/2.2+13,60-point.z/4.4)+lift;
    point.applyMatrix4(inverse);position.setY(i,point.y);
  }
  position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
}
