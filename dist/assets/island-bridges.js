/* Atlas-scale island crossings. The drawing is a historical stone-and-timber
 * interpretation; geographic abutments remain on the two real shores. */
import {createModelBuilder,createMapModelMaterial} from './atlas-models.js';
const geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const crossings=[
 {name:'Great Belt · Funen to Zealand',coordinates:[[10.75,55.31],[11.16,55.35]],span:.95},
 {name:'Little Belt · Jutland to Funen',coordinates:[[9.63,55.55],[9.80,55.50]],span:.63},
 {name:'Øresund · Zealand to Scania',coordinates:[[12.59,55.61],[12.96,55.56]],span:.95},
 {name:'Storstrøm · Zealand to Falster',coordinates:[[11.88,55.01],[11.85,54.90]],span:.72}
];

export function addIslandBridges({THREE,scene,worldPoint,heightAt,regionAt,isDry,reservedBounds=[]}){
 const group=new THREE.Group();group.name='terrain-fitted-island-bridges';
 const dry=isDry||((x,z)=>!!regionAt(geoFrom(x,z))),builder=createModelBuilder(THREE),bridges=[],rejected=[];
 const material=createMapModelMaterial(THREE),stone=0xc5ac78,dark=0x7b7355,rail=0x725438,copper=0x737c60,deckWidth=.25;
 const clearOfLandmarks=(x,z,margin=0)=>!reservedBounds.some(b=>{const a=b.min,c=b.max,ax=a.x??a[0],az=a.z??a[2],cx=c.x??c[0],cz=c.z??c[2];return x+margin>ax-.10&&x-margin<cx+.10&&z+margin>az-.10&&z-margin<cz+.10;});
 function support(p,direction){
  const normal=new THREE.Vector2(-direction.y,direction.x),samples=[];let low=Infinity,high=-Infinity;
  for(let i=0;i<=6;i++)for(let j=0;j<=6;j++){
   const a=(i/6-.5)*.34,b=(j/6-.5)*.36,x=p.x+direction.x*a+normal.x*b,z=p.z+direction.y*a+normal.y*b;
   if(!dry(x,z,.025)||!clearOfLandmarks(x,z,.025))return null;const y=heightAt(...geoFrom(x,z));samples.push([x,y,z]);low=Math.min(low,y);high=Math.max(high,y);
  }
  return high-low<.24?{samples,min:low,max:high}:null;
 }
 function candidates(geo,direction){
  const p=worldPoint(geo),list=[];
  for(let ring=0;ring<=20;ring++)for(let j=0;j<(ring?24:1);j++){
   const angle=j*Math.PI/12,a=new THREE.Vector3(p.x+Math.cos(angle)*ring*.065,0,p.z+Math.sin(angle)*ring*.065),s=support(a,direction);
   if(s)list.push({p:a,s,displacement:ring*.065});
  }
  return list.sort((a,b)=>a.displacement-b.displacement).slice(0,80);
 }
 for(const site of crossings){
  const original=site.coordinates.map(g=>worldPoint(g)),axis=new THREE.Vector2(original[1].x-original[0].x,original[1].z-original[0].z).normalize(),starts=candidates(site.coordinates[0],axis),ends=candidates(site.coordinates[1],axis);let match=null;
  for(const a of starts)for(const b of ends){
   const distance=a.p.distanceTo(b.p);if(distance<site.span*.72||distance>2.9)continue;
   const score=a.displacement+b.displacement+distance*.06;if(match&&score>=match.score)continue;
   const direction=new THREE.Vector2(b.p.x-a.p.x,b.p.z-a.p.z).normalize(),sa=support(a.p,direction),sb=support(b.p,direction);if(!sa||!sb)continue;
   const water=[],sections=[];let obstructed=false;
   for(let i=0;i<=80;i++){
    const t=i/80,x=a.p.x+(b.p.x-a.p.x)*t,z=a.p.z+(b.p.z-a.p.z)*t,wet=!regionAt(geoFrom(x,z));
    if(!clearOfLandmarks(x,z,.36)){obstructed=true;break;}
    sections.push({t,x,z,wet,terrain:heightAt(...geoFrom(x,z))});if(wet)water.push(t);
   }
   // Both banks must be connected by a real wet channel, not a bridge on a field.
   if(obstructed||water.length<4||water[0]<.07||water.at(-1)>.93||!water.some(t=>t>.25&&t<.75))continue;
   if(!match||score<match.score)match={a:a.p,b:b.p,sa,sb,direction,distance,water,sections,score};
  }
  if(!match){rejected.push({name:site.name,reason:'No fully dry abutment pair with an intervening wet channel clear of landmarks in the local search area.'});continue;}
  const{a,b,sa,sb,direction,distance,sections}=match,n=new THREE.Vector2(-direction.y,direction.x),angle=-Math.atan2(direction.y,direction.x),rise=Math.min(.58,.23+distance*.16);
  const position=(t,side=0,yOffset=0)=>{
   const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,bank=sa.max*(1-t)+sb.max*t,y=bank+.045+Math.sin(Math.PI*t)*rise;
   return[x+n.x*side,y+yOffset,z+n.y*side];
  };
  // Landing masonry is sampled down to the same terrain as the adjoining shore.
  const abutments=[];
  for(const[p,s,t]of[[a,sa,0],[b,sb,1]]){
   const y=position(t)[1];builder.box(p.x,(s.min+y)/2,p.z,.34,y-s.min+.08,.36,stone,false,angle);
   abutments.push({coordinates:geoFrom(p.x,p.z),position:[p.x,y,p.z],groundSamples:s.samples,width:.34,depth:.36});
  }
  const steps=Math.max(16,Math.ceil(distance/.07)),deckSamples=[];
  for(let i=0;i<steps;i++){
   const t=(i+.5)/steps,p=position(t),p0=position(i/steps),p1=position((i+1)/steps),slope=Math.atan2(p1[1]-p0[1],distance/steps);
   builder.add(new THREE.BoxGeometry(distance/steps+.009,.09,deckWidth),stone,p,[0,angle,slope]);deckSamples.push({position:p,terrain:heightAt(...geoFrom(p[0],p[2]))});
   // Individually modelled paving catches light in the bridge's arch.
   if(i%2===0)builder.beam([p[0]+n.x*deckWidth*.44,p[1]+.049,p[2]+n.y*deckWidth*.44],[p[0]-n.x*deckWidth*.44,p[1]+.049,p[2]-n.y*deckWidth*.44],.008,dark,4);
  }
  for(const side of[-1,1]){
   const r=deckWidth*.57*side,points=Array.from({length:25},(_,i)=>position(i/24,r,.18));builder.curve(points,.022,rail,28);
   for(let i=0;i<=12;i++){const t=i/12,foot=position(t,r,.02),top=position(t,r,.19);builder.beam(foot,top,.018,stone,6);}
  }
  const supports=[];
  for(const t of[.25,.75]){
   const p=position(t),ground=regionAt(geoFrom(p[0],p[2]))?heightAt(...geoFrom(p[0],p[2])):-.13;
   builder.cylinder(p[0],(p[1]+ground)/2-.035,p[2],.085,.12,p[1]-ground,dark,12);supports.push({position:[p[0],ground,p[2]],deckHeight:p[1],inWater:!regionAt(geoFrom(p[0],p[2]))});
   // Twin miniature copper roofed watchtowers enrich the long island crossings.
   if(distance>1.1)for(const side of[-1,1]){
    const q=position(t,side*.22);builder.beam([p[0],p[1]-.03,p[2]],[q[0],q[1]-.03,q[2]],.065,stone,8);builder.cylinder(q[0],q[1]+.22,q[2],.075,.10,.48,stone,10);builder.add(new THREE.ConeGeometry(.12,.19,10),copper,[q[0],q[1]+.55,q[2]]);
    builder.beam([q[0],q[1]+.62,q[2]],[q[0],q[1]+.74,q[2]],.009,rail,5);
   }
  }
  bridges.push({name:site.name,coordinates:site.coordinates,abutments,supports,span:distance,width:deckWidth,wetSpanSamples:sections.filter(s=>s.wet).map(s=>[s.x,s.z]),deckSamples,dimensional:true,landmarkClearance:.36});
 }
 const mesh=builder.finish('carved-stone-island-crossings',material);group.add(mesh);group.userData={dimensional:true,bridges,bridgeCount:bridges.length,rejected,grounding:'Every complete abutment footprint is dry. Both approaches meet local terrain; every span crosses a verified water channel.'};scene.add(group);return{group,count:bridges.length,drawCalls:mesh.children.length};
}
