// One sheet, one ink treatment. All illustrated objects stand upright in the
// geographic scene; perspective and shading are painted into their silhouettes.
const atlasLoads=new Map(),materials=new WeakMap();

// Soft source-alpha coverage resolves into the multisampled page. The pigment
// stays opaque inside each silhouette; only its outer ink edge is antialiased.
export const PAPER_ALPHA_CUTOFF=.02;
export const paperEdgeShader=`
float paperCoverage(float alpha){return smoothstep(.015,.985,alpha);}
vec3 paperTextureColor(vec4 paint){return paint.rgb/max(paint.a,.001);}
`;

export function loadPaperAtlas({THREE,mobile=false}){
 const key=mobile?'mobile':'desktop';
 if(!atlasLoads.has(key))atlasLoads.set(key,Promise.all([
  fetch(new URL('./paper-atlas-v6.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Paper illustration metadata unavailable');return r.json();}),
  new THREE.TextureLoader().loadAsync(new URL(mobile?'./paper-atlas-v6-mobile.webp':'./paper-atlas-v6.webp',import.meta.url).href),
 ]).then(([atlas,texture])=>{
  // Premultiply before texture filtering to keep dark/colored transparent
  // texels from creating a coarse fringe around the painted silhouette.
  texture.colorSpace=THREE.NoColorSpace;texture.premultiplyAlpha=true;texture.anisotropy=8;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  return {atlas,texture};
 }));
 return atlasLoads.get(key);
}

function paperMaterial(THREE,texture){
 if(materials.has(texture))return materials.get(texture);
 const material=new THREE.ShaderMaterial({name:'Hand-colored atlas paper',transparent:false,depthWrite:true,alphaToCoverage:true,side:THREE.DoubleSide,
  uniforms:{uArtwork:{value:texture}},
  vertexShader:`attribute vec2 pictureUv;varying vec2 vUv;varying vec2 vPicture;varying vec3 vWorld;
   void main(){vUv=uv;vPicture=pictureUv;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:`uniform sampler2D uArtwork;varying vec2 vUv;varying vec2 vPicture;varying vec3 vWorld;
   float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   ${paperEdgeShader}
   void main(){vec4 paint=texture2D(uArtwork,vUv);float coverage=paperCoverage(paint.a);if(paint.a<.02)discard;
    vec3 color=paperTextureColor(paint)*vec3(.985,.972,.935);
    float grain=hash(floor(vWorld.xy*72.+vWorld.z*13.))-.5;
    color+=grain*.016;
    gl_FragColor=vec4(color,coverage);
   }`,
 });
 materials.set(texture,material);return material;
}

export function createPaperCard({THREE,atlas,texture,asset,width,lean=-.23,mirror=false,kind='land',segments=[1,1]}){
 const art=atlas.art[asset];if(!art)throw new Error(`Missing paper illustration: ${asset}`);
 const [l,t,r,b]=art.rect,height=width*(b-t)/(r-l);
 const geometry=new THREE.PlaneGeometry(width,height,...segments);
 geometry.setAttribute('pictureUv',geometry.attributes.uv.clone());
 geometry.translate(0,height/2,0);geometry.rotateX(lean);
 const uv=geometry.attributes.uv;
 for(let i=0;i<uv.count;i++){
  const u=mirror?1-uv.getX(i):uv.getX(i);
  uv.setXY(i,(l+u*(r-l))/atlas.width,1-(b-uv.getY(i)*(b-t))/atlas.height);
 }
 const card=new THREE.Mesh(geometry,paperMaterial(THREE,texture));
 card.name=`paper-${asset}`;
 card.userData={asset,kind,paperIllustration:true,dimensional:false,style:'isometric-paper-diorama',width,height,lean,mirror};
 return card;
}
