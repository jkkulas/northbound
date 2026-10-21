import {addSculptedWoodland} from './map-scenery.js';

/**
 * Manuscript cartography: pigment shaders and a handful of batched ink layers.
 * All art is drawn once at startup. The atlas has no animation clock, no external
 * textures and no per-frame CPU work, so the scene can sleep between interactions.
 */
export const vertexShader=`
varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;
void main(){vUv=uv;vNormal=mat3(modelMatrix)*normal;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;

const pigmentShader=`
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float wash(vec2 p){return noise(p)*.6+noise(p*2.03)*.28+noise(p*4.13)*.12;}
float engraved(float phase,float thickness){float edge=abs(fract(phase)-.5);float aa=max(fwidth(phase)*.7,.001);return 1.-smoothstep(thickness,thickness+aa,edge);}
`;

// Keep this uniform contract shared with the terrain and the sleeping renderer.
const auraShader=`
uniform sampler2D uAura;uniform vec3 uHover;uniform vec4 uAtlasBounds;
vec2 atlasUv(vec3 world){return vec2((world.x-uAtlasBounds.x)/uAtlasBounds.z,1.-(world.z-uAtlasBounds.y)/uAtlasBounds.w);}
vec3 countryLight(vec3 color,vec2 uv){
 if(dot(uHover,vec3(1.))<.001||uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return color;
 vec3 distances=(texture2D(uAura,uv).rgb*2.-1.)*6.;
 vec3 edge=exp(-abs(distances)*1.65),outer=exp(-abs(distances)*.75);
 float rim=dot(edge,uHover),halo=dot(outer,uHover);
 color=mix(color,vec3(1.,.89,.47),clamp(rim*.66,0.,.72));
 return color+vec3(.09,.065,.01)*halo;
}`;

export const fragmentShader=`
uniform sampler2D uMask;varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;
${auraShader}${pigmentShader}
void main(){
 float region=texture2D(uMask,vUv).r;if(region<.13)discard;
 float id=floor(region*3.+.5),h=vWorld.y;vec2 p=vWorld.xz;vec3 n=normalize(vNormal);
 float pigment=wash(p*.11),fields=wash(p*.28+vec2(21.,-8.));
 // Ochre and terre verte soak into the same sheet. Geographic regions never
 // become separate blocks of coloured card: the paper wash crosses borders.
 vec3 color=mix(vec3(.649,.454,.216),vec3(.938,.787,.391),smoothstep(.12,.87,pigment));
 float meadow=smoothstep(.27,.72,fields)*(1.-smoothstep(2.3,5.1,h));
 color=mix(color,mix(vec3(.382,.465,.236),vec3(.650,.674,.324),pigment),meadow*.61);
 float upland=smoothstep(.95,3.3,h),scree=wash(p*1.65+17.);
 float slope=smoothstep(.04,.55,1.-n.y);
 vec3 rock=mix(vec3(.263,.286,.255),vec3(.590,.520,.365),scree*.64+max(n.y,0.)*.20);
 color=mix(color,rock,upland*(.57+slope*.39));
 // A broken snow line and dark rock ribs sit in the DEM itself. Snow gathers
 // on summits and sheltered shoulders; steep walls retain their umber ink.
 float snow=smoothstep(2.8,4.8,h+(wash(p*1.9)-.5)*1.15);
 snow*=mix(.25,1.,smoothstep(.30,.92,n.y));
 // Broad slope shading reads as raised, engraved land. Its pigment and all
 // hatching follow the real DEM; there are no illustrated mountain planes.
 float light=dot(n,normalize(vec3(-.55,.78,-.30)));
 float relief=smoothstep(.65,2.2,h);
 float shade=clamp((.92-light)*.89,0.,.57);
 color=mix(color,vec3(.222,.255,.175),shade*(.51+upland*.32));
 color+=vec3(.112,.086,.043)*max(light-.72,0.);
 float contour=engraved(h*2.1+noise(p*.64)*.12,.022)*relief;
 float hatch=engraved(p.x*4.8+p.y*3.4+noise(p*.76)*.63,.044);
 hatch*=smoothstep(.21,.66,noise(p*2.35+37.))*slope*(1.-snow*.73);
 float fissure=smoothstep(.65,.89,noise(p*5.2+noise(p*1.2)*2.))*slope*upland;
 // Continuous rock shading, without elevation contour bands.
 color-=vec3(.244,.205,.131)*hatch*.69;
 color-=vec3(.117,.104,.072)*fissure*(1.-snow*.78);
 // Pale summit pigment is printed after the umber wash: its shaded blue-grey
 // creases stay visible instead of disappearing into an olive mountain mass.
 vec3 snowPigment=mix(vec3(.665,.721,.695),vec3(.978,.953,.829),smoothstep(-.1,.88,light));

 color=mix(color,snowPigment,snow*.94);
 // Fibres and granular pigment are fixed to the chart, so zooming and a
 // sleeping renderer never turn the sheet into changing screen-space noise.
 float fibre=noise(vec2(p.x*.72,p.y*24.));
 color+=(hash(floor(p*39.))-.5)*.033+(noise(p*8.7)-.5)*.045+(fibre-.5)*.023;
 float selection=id<1.5?uHover.x:(id<2.5?uHover.y:uHover.z);
 color=mix(color,vec3(.98,.86,.47),selection*.14);
 // A soft inner umber bank and an outer teal wash share the same coastline.
 // Sampling binary coverage avoids inventing coast shadows at country seams.
 vec2 bank=vec2(1.05)/uAtlasBounds.zw;
 float bankWater=4.-step(.13,texture2D(uMask,vUv+vec2(bank.x,0.)).r)-step(.13,texture2D(uMask,vUv-vec2(bank.x,0.)).r)-step(.13,texture2D(uMask,vUv+vec2(0.,bank.y)).r)-step(.13,texture2D(uMask,vUv-vec2(0.,bank.y)).r);
 color=mix(color,vec3(.358,.310,.167),min(bankWater*.163,.46));
 // Trace the *rendered* shoreline, including the small islands absent from the
 // simplified vector ink. Binary land coverage ignores internal country seams.
 // Derivatives keep this quill about one screen pixel wide at every distance;
 // the texel floor also closes gaps at the distant northern edge of the chart.
 vec2 quill=max(fwidth(vUv)*.82,vec2(1./2048.));
 float shoreLand=min(min(step(.13,texture2D(uMask,vUv+vec2(quill.x,0.)).r),step(.13,texture2D(uMask,vUv-vec2(quill.x,0.)).r)),min(step(.13,texture2D(uMask,vUv+vec2(0.,quill.y)).r),step(.13,texture2D(uMask,vUv-vec2(0.,quill.y)).r)));
 float coastInk=1.-shoreLand;
 color=mix(countryLight(color,vUv),vec3(.266,.282,.189),coastInk*.85);
 gl_FragColor=vec4(color,1.);
}`;

export const waterPigmentShader=`${pigmentShader}${auraShader}
vec3 chartWater(vec3 chartPoint){
 vec2 p=chartPoint.xz,uv=atlasUv(chartPoint);float pigment=wash(p*.048);
 vec3 color=mix(vec3(.424,.642,.605),vec3(.659,.799,.701),pigment);
 float coast=6.;
 if(uv.x>=0.&&uv.x<=1.&&uv.y>=0.&&uv.y<=1.){
  vec3 distance=abs((texture2D(uAura,uv).rgb*2.-1.)*6.);
  coast=min(distance.x,min(distance.y,distance.z));
 }
 color=mix(color,vec3(.316,.467,.386),exp(-coast*1.55)*.34);
 color=mix(color,vec3(.715,.785,.617),exp(-abs(coast-.65)*1.4)*.08);
 // Long, close-set undulating strokes are printed into the sea wash. The
 // broken quill and paper fibres are world-anchored, never animated overlays.
 float current=p.y*2.45+sin(p.x*.24+noise(p*.10)*2.)*.17+noise(p*.63)*.12;
 float wave=engraved(current,.022);
 wave*=.35+.65*smoothstep(.25,.72,noise(vec2(p.x*1.12,p.y*.21)));
 float waveFade=1.-smoothstep(.75,1.6,fwidth(current));
 color-=vec3(.154,.142,.095)*wave*waveFade*.32;
 // Thin, broken coastal echoes are drawn with the same brown quill as the land.
 // The open sea is intentionally spacious; long currents are batched geometry.
 float shore=0.;
 for(int i=1;i<=3;i++){
  float d=float(i)*.18;
  float aa=max(fwidth(coast)*.8,.013);
  shore+=(1.-smoothstep(.010,.010+aa,abs(coast-d)))*(.27/float(i));
 }
 shore*=smoothstep(.39,.59,noise(p*.46+7.));
 color-=vec3(.15,.17,.12)*shore*.95;
 // Portolan bearings share the compass centre. Only sixteen spokes pass across
 // the chart; they fade into the paper rather than forming a wallpaper grid.
 vec2 bearing=p-vec2(-63.8,6.6);float radius=length(bearing);
 float angle=atan(bearing.y,bearing.x),sector=3.14159265/8.;
 float nearest=(floor(angle/sector+.5))*sector;
 float rayDistance=abs(sin(angle-nearest))*radius;
 float rayAA=max(fwidth(rayDistance),.025);
 float rhumb=(1.-smoothstep(.014,.014+rayAA,rayDistance));
 rhumb*=smoothstep(7.,14.,radius)*(1.-smoothstep(48.,112.,radius));
 color-=vec3(.22,.17,.10)*rhumb*.105;
 color+=(hash(floor(p*41.))-.5)*.021+(noise(p*8.1)-.5)*.024+(noise(vec2(p.x*.63,p.y*28.))-.5)*.013;
 return countryLight(color,uv);
}`;

export const waterFragmentShader=`
varying vec2 vUv;varying vec3 vWorld;${waterPigmentShader}
void main(){gl_FragColor=vec4(chartWater(vWorld),1.);}
`;

function seeded(seed=401){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
/** Small sculpted groves grow from the same DEM, with no tree billboards. */
export function addIllustratedVegetation({THREE,scene,worldPoint,heightAt,regionAt,mobile=false}){
 return addSculptedWoodland({THREE,scene,worldPoint,heightAt,regionAt,mobile});
}

function lineBatch(THREE,group,positions,color,opacity,name){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const object=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));object.name=name;group.add(object);return object;
}

/** Terrain-conforming ridge hachures: mountains are marks in the land itself. */
export function addIllustratedMountains({THREE,scene,worldPoint,heightAt,regionAt,mobile=false}){
 const group=new THREE.Group();group.name='engraved-mountain-relief';
 const contours=[],hatches=[],random=seeded(901);let count=0;
 const point=(x,z)=>worldPoint([x/2.2+13,60-z/4.4],.054);
 const stroke=(points,target)=>{for(let j=1;j<points.length;j++){
  const a=points[j-1],b=points[j];
  if(!regionAt([a[0]/2.2+13,60-a[1]/4.4])||!regionAt([b[0]/2.2+13,60-b[1]/4.4]))continue;
  target.push(...point(...a),...point(...b));
 }};
 for(let i=0;i<(mobile?580:1150);i++){
  const geo=i%6===0?[-5.8+random()*3.7,55.1+random()*3.7]:[4.5+random()*17.5,58.3+random()*11.8];
  const h=heightAt(...geo);if(h<.95||!regionAt(geo))continue;
  const p=worldPoint(geo),d=.105,gx=(heightAt(geo[0]+d,geo[1])-heightAt(geo[0]-d,geo[1]))/(d*4.4),gz=(heightAt(geo[0],geo[1]-d*.5)-heightAt(geo[0],geo[1]+d*.5))/(d*4.4),slope=Math.hypot(gx,gz);
  if(slope<.18)continue;
  const tx=-gz/slope,tz=gx/slope,span=.20+random()*.48,bend=(random()-.5)*.13,points=[];
  for(let j=0;j<=7;j++){
   const t=j/7-.5,s=t*span*2,curve=Math.sin((t+.5)*Math.PI)*bend;
   points.push([p.x+tx*s+gx/slope*curve,p.z+tz*s+gz/slope*curve]);
  }
  stroke(points,contours);
  for(let j=0;j<3;j++){
   const s=(j/2-.5)*span*1.6,x=p.x+tx*s,z=p.z+tz*s,length=.12+random()*.30;
   const end=[x-gx/slope*length,z-gz/slope*length];
   if(!regionAt([end[0]/2.2+13,60-end[1]/4.4]))continue;
   stroke([[x,z],[x-gx/slope*length*.55+tx*.025,z-gz/slope*length*.55+tz*.025],end],hatches);
  }
  count++;
 }
 // Ridge contour strokes removed; retain the downhill rock hachures.
 lineBatch(THREE,group,hatches,0x50432e,.43,'dem-slope-hachures');
 scene.add(group);return{group,count,drawCalls:2,vertices:(contours.length+hatches.length)/3};
}

/** Broad, gently meandering channels follow the real Natural Earth rivers.
 * Both banks and water are one opaque surface shaped to the local terrain. */
function addRiverRibbons({THREE,group,rivers,worldPoint,heightAt,regionAt}){
 const positions=[],uvs=[],indices=[];let riverCount=0;
 const toGeo=p=>[p.x/2.2+13,60-p.z/4.4];
 for(const river of rivers){
  if(river.length<2)continue;
  const controls=river.map(p=>worldPoint(p)),curve=new THREE.CatmullRomCurve3(controls,false,'centripetal'),length=curve.getLength();
  if(length<.20)continue;
  const steps=Math.max(2,Math.ceil(length/.28)),wide=.12+Math.min(.15,length*.004),descending=heightAt(...river[0])>heightAt(...river.at(-1));
  let previous=null,validSegments=0;
  for(let i=0;i<=steps;i++){
   const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t),d=Math.hypot(tangent.x,tangent.z),geo=toGeo(p);
   if(d<.0001||!regionAt(geo)){previous=null;continue;}
   const nx=-tangent.z/d,nz=tangent.x/d,downstream=descending?t:1.-t,width=wide*(.71+downstream*.29)*(1.+Math.sin(t*11.7+length)*.055),row=[];
   for(const cross of[-1,-.65,0,.65,1]){
    const x=p.x+nx*width*cross,z=p.z+nz*width*cross,g=[x/2.2+13,60-z/4.4];
    // A river mouth may enter the sea, but its bank cannot become an artificial
    // raised strip across a neighbouring inlet or small island.
    if(!regionAt(g)){row.length=0;break;}
    row.push([x,heightAt(...g)+.115+Math.abs(cross)*.013,z]);
   }
   if(!row.length){previous=null;continue;}
   const start=positions.length/3;row.forEach((v,j)=>{positions.push(...v);uvs.push(j/4,t*length);});
   if(previous!==null){for(let j=0;j<4;j++)indices.push(previous+j,start+j,previous+j+1,start+j,start+j+1,previous+j+1);validSegments++;}
   previous=start;
  }
  if(validSegments)riverCount++;
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexShader,fragmentShader:`varying vec2 vUv;varying vec3 vNormal,vWorld;${pigmentShader}
 void main(){float across=abs(vUv.x*2.-1.),grain=wash(vWorld.xz*9.);float bank=smoothstep(.68,.95,across);
 vec3 water=mix(vec3(.251,.492,.458),vec3(.507,.685,.574),grain*.63+(.5-.5*across)*.4);
 vec3 earth=mix(vec3(.331,.293,.154),vec3(.692,.568,.304),smoothstep(.77,.99,across));
 vec3 color=mix(water,earth,bank);
 float quill=(1.-smoothstep(.012,.045,abs(across-.76)))*.34;
 color-=vec3(.17,.15,.07)*quill;
 float flow=engraved(vUv.y*3.8+vUv.x*.45+sin(vUv.y*.8)*.08,.023)*(1.-bank);
 color+=vec3(.17,.17,.10)*flow*.36;
 color+=(hash(floor(vWorld.xz*130.))-.5)*.027;
 gl_FragColor=vec4(color,1.);}`});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='exaggerated-geographic-river-banks-and-water';mesh.userData={riverCount,triangles:indices.length/3};group.add(mesh);
 return{riverCount,vertices:positions.length/3};
}

/** Geographic ink stays tied to real coastlines, waterways and DEM contours. */
export function addIllustratedGeography({THREE,scene,geography,worldPoint,heightAt,regionAt,mobile=false}){
 const group=new THREE.Group();group.name='engraved-geography';
 const coastline=[],rivers=[],borders=[],wetInk=[],currents=[],fieldInk=[];
 const bounds=geography.bounds;
 const visible=([lon,lat])=>lon>=bounds.west&&lon<=bounds.east&&lat>=bounds.south&&lat<=bounds.north;
 const append=(lines,target,lift)=>{
  for(const line of lines)for(let i=1;i<line.length;i++){
   if(!visible(line[i])&&!visible(line[i-1]))continue;
   // Short segments follow the DEM rather than passing through raised relief.
   // Full atlas bounds include Greenland, Iceland and the northern archipelagos.
   const from=line[i-1],to=line[i],length=Math.hypot((to[0]-from[0])*2.2,(to[1]-from[1])*4.4),steps=Math.max(1,Math.ceil(length/.65));
   let previous=worldPoint(from,lift);
   for(let j=1;j<=steps;j++){
    const t=j/steps,next=worldPoint([from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t],lift);
    target.push(...previous,...next);previous=next;
   }
  }
 };
 append(geography.coasts,coastline,.09);
 append(geography.outlines.no,borders,.07);append(geography.outlines.pl,borders,.07);
 lineBatch(THREE,group,coastline,0x4b4d32,.76,'quill-coastlines');
 const riverArtwork=addRiverRibbons({THREE,group,rivers:geography.rivers,worldPoint,heightAt,regionAt});
 lineBatch(THREE,group,borders,0x817350,.14,'country-engraving');
 // Broken wet contours just offshore make islands and fjords feel hand inked.
 let step=0;
 for(const line of geography.coasts)for(let i=1;i<line.length;i++){
  if(++step%(mobile?18:10)!==0||!visible(line[i]))continue;
  const a=worldPoint(line[i-1]),b=worldPoint(line[i]),dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if(length<.06||length>2.4)continue;
  let nx=-dz/length,nz=dx/length;const cx=(a.x+b.x)/2,cz=(a.z+b.z)/2;
  if(regionAt([((cx+nx*.2)/2.2)+13,60-(cz+nz*.2)/4.4])){nx=-nx;nz=-nz;}
  if(regionAt([((cx+nx*.27)/2.2)+13,60-(cz+nz*.27)/4.4]))continue;
  for(const distance of[.17,.34]){
   if(regionAt([((cx+nx*distance)/2.2)+13,60-(cz+nz*distance)/4.4]))continue;
   const span=Math.min(length*.65,.55),tx=dx/length,tz=dz/length;
   wetInk.push(cx+nx*distance-tx*span,-.022,cz+nz*distance-tz*span,cx+nx*distance+tx*span,-.022,cz+nz*distance+tz*span);
  }
 }
 lineBatch(THREE,group,wetInk,0x4e6a59,.35,'shoreline-wash-contours');
 // Loose groups of sweeping quill strokes describe water, with plenty of bare
 // parchment between them. Each current has its own length, curve and bearing.
 const seaRandom=seeded(744),seaPoint=(x,z)=>[x/2.2+13,60-z/4.4];
 let currentCount=0;
 for(let attempt=0;attempt<220&&currentCount<(mobile?17:30);attempt++){
  const cx=-76+seaRandom()*145,cz=-78+seaRandom()*142;
  if(regionAt(seaPoint(cx,cz)))continue;
  const length=4.8+seaRandom()*7.2,angle=(seaRandom()-.5)*.50,bend=(seaRandom()-.5)*1.35;
  const c=Math.cos(angle),s=Math.sin(angle),local=[];
  let land=false;
  for(let echo=0;echo<3;echo++){
   const trim=echo*.095+(seaRandom()-.5)*.045,points=[];
   for(let j=0;j<=25;j++){
    const t=-.5+trim+j/25*(1-trim*2),x=t*length,z=Math.sin((t+.5)*Math.PI)*bend+echo*.26;
    const px=cx+x*c-z*s,pz=cz+x*s+z*c;
    if(regionAt(seaPoint(px,pz))){land=true;break;}
    points.push([px,-.018,pz]);
   }
   if(land)break;
   for(let j=1;j<points.length;j++){
    // The narrow last echo is broken, as a quill runs dry across paper fibres.
    if(echo===2&&j>10&&j<14)continue;
    local.push(...points[j-1],...points[j]);
   }
  }
  if(!land){currents.push(...local);currentCount++;}
 }
 lineBatch(THREE,group,currents,0x526e5b,.23,'engraved-sea-currents');
 const random=seeded(631),point=(x,z,lift=.055)=>worldPoint([x/2.2+13,60-z/4.4],lift);
 // Occasional ploughed fields and rolling meadows continue the penwork into the
 // lowlands. They follow actual relief and leave the three city approaches clear.
 for(let i=0;i<(mobile?36:65);i++){
  const geo=[-7+random()*36,49.2+random()*17.2];
  if(!regionAt(geo)||heightAt(...geo)>1.5)continue;
  if(geo[0]>9.3&&geo[0]<11.8&&geo[1]>58.6&&geo[1]<63.7)continue;
  const p=worldPoint(geo),width=.7+random()*1.5,angle=(random()-.5)*1.1;
  for(let echo=0;echo<3;echo++){
   const points=[];
   for(let j=0;j<=9;j++){
    const t=j/9-.5,x=t*width,z=Math.sin((t+.5)*Math.PI)*.17+echo*.10;
    points.push(point(p.x+x*Math.cos(angle)-z*Math.sin(angle),p.z+x*Math.sin(angle)+z*Math.cos(angle),.075));
   }
   for(let j=1;j<points.length;j++)fieldInk.push(...points[j-1],...points[j]);
  }
 }
 lineBatch(THREE,group,fieldInk,0x75663b,.30,'meadow-quill-strokes');
 const mountains=addIllustratedMountains({THREE,scene:group,worldPoint,heightAt,regionAt,mobile});
 scene.add(group);return{group,mountains:mountains.count,rivers:riverArtwork.riverCount,drawCalls:8,vertices:riverArtwork.vertices+mountains.vertices+(coastline.length+borders.length+wetInk.length+currents.length+fieldInk.length)/3};
}
