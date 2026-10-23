import {createMapModelMaterial,createModelBuilder} from './atlas-models.js';

import {EXTRA_LANDMARK_SITES} from './landmark-models-3d.js';
import {fitDryFootprint,footprintSamples,toGeo} from './ground-support.js';
// Real building anchors researched before modeling; data/landmark-locations.json.
export const OPERA_FOOTPRINT=Object.freeze({coordinates:[10.7526806,59.9075238],minX:1.2,maxX:4.1,minZ:-1.55,maxZ:1.6});
const C={stone:0xd4b47c,ivory:0xe8d4a4,light:0xf0dfb8,ochre:0xcaa060,umber:0x806241,ink:0x3f392b,brick:0x9d5039,red:0xb46645,roof:0x695448,copper:0x526d5b,teal:0x4f7770,window:0x344d49,wood:0x68482f,gold:0xd4aa54};
const sites=[
 {asset:'bryggen',title:'Bergen · Bryggen',coordinates:[5.32309,60.39721],make:bryggen,grounding:'waterfront'},
 {asset:'oslo',title:'Oslo · Opera House',coordinates:[10.7526806,59.9075238],make:opera,footprint:OPERA_FOOTPRINT},
 {asset:'stockholm',title:'Stockholm · City Hall',coordinates:[18.0542148,59.3274942],make:stockholm,grounding:'waterfront'},
 {asset:'nyhavn',title:'Copenhagen · Nyhavn',coordinates:[12.589145,55.680452],make:nyhavn,grounding:'waterfront'},
 {asset:'warsaw',title:'Warsaw · Royal Castle',coordinates:[21.014217,52.247749],make:warsaw},
 {asset:'windmill',title:'Kinderdijk · Nederwaard Mill No. 2',coordinates:[4.6399791,51.8833949],make:windmill},
 {asset:'gdansk',title:'Gdańsk · Żuraw',coordinates:[18.6574644147,54.3505592969],drawingCoordinates:[18.6574644147,54.43],make:gdansk,grounding:'waterfront'},
 {asset:'london',title:'London · Tower Bridge',coordinates:[-.0753665,51.5055158],make:towerBridge,grounding:'river-crossing'},
 {asset:'borgund',title:'Lærdal · Borgund Stave Church',coordinates:[7.8122905,61.0472015],make:borgund},
];
function foundation(b,x,y,z,w,d){b.skirt(x,y+.02,z,w+.025,d+.025,b.ground,C.umber);b.box(x,y+.025,z,w,.09,d,C.stone);}
function courses(b,x,y,z,w,h,d,col=C.stone){for(let k=.28;k<h;k+=.28)b.box(x,y+k,z+d/2+.008,w,.012,.012,col);}
function gableHouse(b,g,x,z,w=.55,h=1.2,d=1,col=C.ochre,{roof=C.roof,dutch=false,rows=3}={}){
 const y=g.support(x,z,w,d);foundation(b,x,y,z,w,d);b.box(x,y+h/2+.08,z,w,h,d,col,true);b.roof(x,y+h+.08,z,w+.09,.46,d+.11,roof);
 if(dutch){for(let k=0;k<4;k++)b.box(x,y+h+.1+k*.095,z+d/2+.016,w-k*w*.21,.1,.055,col);b.box(x,y+h+.49,z+d/2+.02,.095,.11,.08,C.ivory);}
 else b.prism([[-w*.45,0],[0,.4],[w*.45,0]],.045,col,[x,y+h+.08,z+d/2+.025]);
 for(const side of[-1,1])b.box(x+side*(w/2-.025),y+h/2+.08,z+d/2+.024,.035,h,.028,C.ivory);
 const cols=w>.6?3:2;for(let r=0;r<rows;r++)for(let j=0;j<cols;j++)b.window(x+(j-(cols-1)/2)*w/(cols+.4),y+.28+r*(h-.3)/rows,z+d/2+.034,w/(cols*2.5),.18);
 for(let j=0;j<3;j++)b.window(x+w/2+.015,y+.35+j*.31,z+.1,.12,.18,'side');
 b.box(x,y+.18,z+d/2+.055,.12,.27,.035,C.wood);b.box(x,y+h+.018,z+d/2+.045,w+.05,.055,.06,C.ivory);b.window(x,y+h+.22,z+d/2+.045,.1,.12);
 b.box(x+w*.22,y+h+.46,z-d*.20,.105,.3,.12,C.brick,true);b.box(x,y+h+.25,z+.22,.17,.18,.20,C.stone);b.roof(x,y+h+.34,z+.22,.22,.15,.25,roof);
 b.beam([x,y+h+.55,z-d/2-.04],[x,y+h+.55,z+d/2+.04],.012,C.umber);b.box(x-w*.31,y+.42,z+d/2+.09,.06,.085,.04,C.gold);return y;
}
function bryggen({b,g}){
 const pigments=[0xa54e38,0xcd9b50,0xd0b77d,0x9b4d37,0xb26840,0xd2ac6d,0x89513b];
 for(let i=0;i<7;i++){const x=(i-3)*.52+.55,z=-.07*Math.abs(i-3),h=1.28+[.15,.32,0,.22,.34,.12,.18][i],y=gableHouse(b,g,x,z,.49,h,.95,pigments[i],{roof:i%2?C.roof:0x75523b,rows:3});
  for(let j=0;j<5;j++)b.box(x-.22+j*.11,y+.78,z+.505,.009,1.28,.012,0x624631);b.beam([x-.25,y+.52,z+.52],[x+.25,y+1.03,z+.52],.009,C.umber);for(const sx of[-.2,.2])b.cylinder(x+sx,y-.02,z+.64,.034,.04,.32,C.wood,8);}
 for(let i=0;i<8;i++){const x=-.88+i*.43,y=g(x,.66);b.cylinder(x,y+.12,.66,.075,.075,.24,0x927040,12);b.cylinder(x,y+.12,.66,.079,.079,.025,C.umber,12);}
}
function opera({b,g}){
 // Snøhetta's marble slopes, glass foyer, fly tower; west arrival remains clear.
 const y=g(2.6,0)+.04;
 b.skirt(2.61,y,-.16,2.82,2.58,g,C.ivory);
 b.prism([[1.2,0],[4.02,0],[4.02,1.02],[2.78,1.16]],2.58,C.ivory,[0,y,-.16],[0,0,0],true);
 b.prism([[1.2,.045],[3.25,.10],[3.25,.75],[2.72,.96]],1.12,C.light,[0,y,1.0],[0,0,0],true);
 b.box(3.15,y+.76,-.43,1.65,1.06,1.45,0xc6b997,true);b.box(3.15,y+1.34,-.43,1.73,.12,1.53,C.light,true);b.box(3.12,y+1.23,-.80,1.04,.73,.74,0xc4bd9c,true);b.box(3.12,y+1.62,-.8,1.12,.08,.82,C.ivory,true);
 b.box(2.64,y+.67,1.25,1.72,.61,.042,C.window);for(let i=0;i<=14;i++)b.box(1.80+i*.12,y+.67,1.284,.018,.61,.025,C.ivory);b.box(2.64,y+.68,1.29,1.75,.022,.035,C.ivory);
 for(let i=0;i<11;i++){const x=1.24+i*.245,top=x<2.78?(x-1.2)/1.58*1.16:1.16-(x-2.78)*.11;b.beam([x,y+top+.012,-1.44],[x,y+top+.012,.94],.0065,0xacaa8b,5);}
 for(let i=0;i<5;i++)b.beam([1.22,y+.03,-1.36+i*.51],[2.76,y+1.17,-1.36+i*.51],.0065,0xacaa8b,5);
 for(let i=0;i<7;i++)b.box(3.5,y+.38+i*.09,1.3,.75,.027,.12,0xddd0aa);for(let i=0;i<14;i++)b.box(2.36+i*.11,y+.75,-1.18,.018,.82,.02,0x8e8a72);
}
function stockholm({b,g}){
 const y=g.support(-1.4,0,2.9,2),red=0x9c543c;
 for(const[x,z,w,d]of[[-1.6,-.95,2.65,.68],[-2.52,-.05,.65,1.9],[-1.38,.76,2.92,.64]]){
  foundation(b,x,y,z,w,d);b.box(x,y+.74,z,w,1.43,d,red,true);b.hip(x,y+1.47,z,w+.12,d+.12,.62,0x635b46);const count=Math.floor(w/.27);
  for(let k=0;k<count;k++)for(let r=0;r<3;r++)b.window(x+(k-(count-1)/2)*.27,y+.29+r*.39,z+d/2+.018,.11,.23);courses(b,x,y+.02,z,w,1.4,d,0xa76a49);}
 const x=-.12,z=.18;foundation(b,x,y,z,.74,.82);b.box(x,y+1.56,z,.72,3.1,.80,red,true);for(let r=0;r<5;r++)for(const dx of[-.18,.18])b.window(x+dx,y+.53+r*.46,z+.414,.11,.24);
 b.box(x,y+2.98,z,.84,.10,.91,C.stone,true);b.box(x,y+3.19,z,.62,.39,.68,red,true);
 for(const dx of[-.19,.19]){b.arch(x+dx,y+3.04,z+.354,.13,.32,.035,C.ink);b.arch(x+.334,y+3.04,z+dx,.13,.32,.035,C.ink,Math.PI/2);}
 b.cylinder(x,y+3.58,z,.18,.38,.55,C.copper,12);b.cylinder(x,y+3.99,z,.055,.16,.33,C.copper,12);b.cylinder(x,y+4.25,z,.017,.025,.24,C.gold,8);
 for(const dx of[-.14,0,.14]){b.cylinder(x+dx,y+4.42-Math.abs(dx)*.30,z,.065,.065,.065,C.gold,8);for(let k=0;k<3;k++)b.sphere(x+dx+(k-1)*.04,y+4.48-Math.abs(dx)*.3,z,.018,.036,.018,C.gold);}
 for(let i=0;i<8;i++)b.arch(-2.52+i*.30,y+.10,1.096,.18,.51,.03,C.ink);for(let i=0;i<9;i++)b.cylinder(-2.66+i*.31,y+.36,1.12,.035,.045,.63,C.stone,10);
 b.box(-1.41,y+.025,1.19,3.18,.08,.30,C.ochre);for(let i=0;i<18;i++)b.box(-2.94+i*.18,y+.14,1.34,.025,.21,.035,C.stone);b.box(-1.41,y+.26,1.34,3.18,.035,.055,C.ivory);
}
function nyhavn({b,g}){
 const palette=[0xc5a15b,0xb56243,0x778a74,0xe0c386,0xa94f36,0xc6b788,0x9d6c42];
 // Ensemble grows west/south across Sjælland from Copenhagen's east-coast anchor.
 for(let i=0;i<7;i++){const x=-2.58+i*.39,z=.38+Math.sin(i*.45)*.15,h=[1.25,1.61,1.38,1.80,1.48,1.66,1.34][i];gableHouse(b,g,x,z,.365,h,.82,palette[i],{dutch:i%3!==1,rows:4});}
 for(let i=0;i<5;i++){const x=-2.20+i*.43,z=-.88;gableHouse(b,g,x,z,.4,.95+(i%3)*.18,.7,palette[(i+3)%7],{dutch:i%2===0,rows:3});}
 for(let i=0;i<20;i++){const x=-2.8+i*.155,z=1.05,y=g(x,z);b.box(x,y+.025,z,.14,.05,.16,i%3?0xb49d6b:0xc9b37d);}
 for(let i=0;i<7;i++){const x=-2.52+i*.43,z=1.24,y=g(x,z);b.cylinder(x,y+.12,z,.034,.046,.23,C.ink,8);b.cylinder(x,y+.22,z,.055,.055,.035,C.gold,10);}
 const x=-1.45,z=-1.45,y=g(x,z);b.box(x,y+.71,z,.42,1.42,.50,0xc3a979,true);b.roof(x,y+1.42,z,.49,.43,.58,C.copper);b.cylinder(x,y+1.98,z,.14,.23,.75,C.copper,8);b.cylinder(x,y+2.58,z,.018,.13,.54,C.copper,8);b.beam([x,y+2.85,z],[x,y+3.07,z],.012,C.gold);
}
function warsaw({b,g,THREE}){
 const y=g.support(0,0,4.5,2.95),wall=0xb97551,roof=0x765b49;
 for(const[x,z,w,d,h]of[[0,.95,4.34,.74,1.50],[-1.76,-.12,.82,2.17,1.43],[1.76,-.12,.82,2.17,1.43],[0,-1.15,4.1,.72,1.44]]){
  foundation(b,x,y,z,w,d);b.box(x,y+h/2,z,w,h,d,wall,true);b.hip(x,y+h,z,w+.13,d+.13,.53,roof);const count=Math.floor(w/.34);
  for(let r=0;r<3;r++)for(let j=0;j<count;j++)b.window(x+(j-(count-1)/2)*.34,y+.25+r*.43,z+d/2+.02,.14,.25);
  for(let j=0;j<Math.floor(w/.55);j++){const xx=x+(j-(Math.floor(w/.55)-1)/2)*.55;b.box(xx,y+h+.22,z+d*.22,.17,.22,.20,C.stone);b.roof(xx,y+h+.33,z+d*.22,.23,.16,.27,roof);b.window(xx,y+h+.24,z+d*.22+.12,.08,.11);}
  b.box(x,y+1.02,z+d/2+.03,w,.045,.055,C.ochre);b.box(x,y+h-.02,z+d/2+.04,w+.09,.075,.08,C.ivory);
 }
 const z=1;b.box(0,y+1.30,z,.63,2.60,.82,wall,true);b.box(0,y+2.62,z,.79,.13,.94,C.stone,true);b.box(0,y+2.89,z,.59,.47,.69,wall,true);b.cylinder(0,y+3.21,z,.22,.32,.22,C.copper,16);b.sphere(0,y+3.36,z,.27,.24,.27,C.copper);b.cylinder(0,y+3.66,z,.10,.13,.34,C.copper,12);b.sphere(0,y+3.89,z,.13,.16,.13,C.copper);b.cylinder(0,y+4.10,z,.015,.11,.28,C.copper,12);b.beam([0,y+4.22,z],[0,y+4.45,z],.012,C.gold);
 for(const dx of[-.255,.255])b.box(dx,y+1.35,z+.43,.07,2.43,.045,C.stone);b.arch(0,y+.04,z+.44,.28,.61,.04,C.ink);
 b.add(new THREE.CylinderGeometry(.16,.16,.027,24),C.gold,[0,y+2.21,z+.45],[Math.PI/2,0,0]);b.add(new THREE.CylinderGeometry(.127,.127,.028,24),C.ivory,[0,y+2.21,z+.468],[Math.PI/2,0,0]);b.beam([0,y+2.21,z+.491],[0,y+2.31,z+.491],.009,C.ink);b.beam([0,y+2.21,z+.491],[.07,y+2.18,z+.491],.009,C.ink);
 for(const xx of[-1.8,1.8]){b.cylinder(xx,y+1.82,-1.12,.20,.20,.39,wall,12);b.sphere(xx,y+2.06,-1.12,.25,.22,.25,C.copper);b.cylinder(xx,y+2.3,-1.12,.012,.13,.3,C.copper,12);}
}
function gdansk({b,g}){
 const y=g.support(-.9,.65,3.55,1.9),brick=0xa6623e;
 for(const x of[-.61,.61]){foundation(b,x,y,.42,.77,.80);b.cylinder(x,y+.90,.42,.35,.40,1.80,brick,28,true);b.cylinder(x,y+1.91,.42,.02,.44,.67,0x68503d,28,true);for(let j=0;j<6;j++)b.box(x,y+.23+j*.27,.814,.52,.012,.014,0xc29159);for(let r=0;r<3;r++)b.window(x,y+.51+r*.43,.817,.12,.23);}
 b.box(0,y+1.20,.37,.66,2.26,.78,C.wood,true);b.roof(0,y+2.30,.35,.84,.55,1.05,0x5c4833);b.prism([[-.44,0],[.44,0],[.34,1.09],[-.34,1.09]],.68,0x604630,[0,y+1.05,.88],[0,0,0],true);b.roof(0,y+2.13,.92,.92,.32,.81,0x715039);
 for(let i=0;i<7;i++)b.box(-.31+i*.105,y+1.56,1.24,.018,1.0,.018,0xc3975c);for(let i=0;i<4;i++)b.box(0,y+1.16+i*.27,1.25,.7,.026,.022,0xbd9057);
 b.arch(0,y+.02,1.26,.36,.76,.025,C.ink);b.box(0,y+1.65,1.275,.26,.34,.025,C.ink);b.beam([-.30,y+1.05,1.29],[.30,y+2.05,1.29],.022,C.umber);b.beam([.30,y+1.05,1.29],[-.30,y+2.05,1.29],.022,C.umber);b.beam([0,y+2.21,1.11],[0,y+1.33,1.11],.014,C.ink);
 for(let i=0;i<4;i++)gableHouse(b,g,-1.10-i*.39,.36,.36,1.16+(i%3)*.2,.77,[0xccac6b,0xa95b3e,0xc5b184,0x8f6e48][i],{dutch:true,rows:3});
 for(let i=0;i<12;i++)b.box(-2.67+i*.28,y+.03,1.40,.26,.10,.24,C.stone);for(const x of[-2.4,-1.5,-.6,.3,.9])b.cylinder(x,y+.16,1.56,.04,.05,.28,C.wood,8);
}
function windmill({b,g,THREE,material}){
 const y=g.support(0,0,1.55,1.55);b.skirt(0,y,0,1.48,1.48,g,C.umber);b.cylinder(0,y+.07,0,.67,.75,.15,C.stone,32,true);b.cylinder(0,y+1.15,0,.34,.58,2.18,0xb18d5b,32,true);b.cylinder(0,y+2.28,0,.38,.38,.14,C.umber,32,true);b.sphere(0,y+2.50,0,.43,.35,.43,0x5c523a);b.box(0,y+.26,.55,.20,.46,.04,C.wood);
 for(let j=0;j<9;j++){const yy=y+.18+j*.235,r=.58-(yy-y)/2.18*.24,points=[];for(let i=0;i<=40;i++)points.push([Math.cos(i/40*Math.PI*2)*r,yy,Math.sin(i/40*Math.PI*2)*r]);b.curve(points,.006,0x8e6a44,40);}
 for(let j=0;j<3;j++)b.window(0,y+.63+j*.53,.56-j*.058,.15,.22);b.sphere(0,y+2.45,.48,.11,.11,.13,C.wood);
 // The four sails are a single rigid rotor in coordinates local to the axle.
 // Keeping their geometry separate lets the mill turn without moving its tower.
 const sails=createModelBuilder(THREE);
 for(let i=0;i<4;i++){
  const a=Math.PI/4+i*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx,p=(r,s,z=0)=>[dx*r+nx*s,dy*r+ny*s,z];
  sails.beam(p(.10,0),p(1.66,0),.028,C.umber);sails.beam(p(.45,.24),p(1.66,.24),.015,C.umber);for(let j=0;j<9;j++)sails.beam(p(.46+j*.147,-.045),p(.46+j*.147,.27),.009,C.wood,6);
  const poly=[[.57,.018],[1.6,.018],[1.6,.20],[.57,.20]].map(([r,s])=>{const pnt=p(r,s);return[pnt[0],pnt[1]]});sails.prism(poly,.012,0xdbc393,[0,0,.012]);
 }
 const rotor=sails.finish('windmill-sails',material);rotor.position.set(0,y+2.45,.56);rotor.userData.angularSpeed=-.42;
 rotor.userData.sweepRadius=rotor.children[0].geometry.boundingSphere.radius;
 b.beam([0,y+2.54,-.26],[.92,y+.10,-.98],.035,C.wood);b.beam([0,y+2.54,-.26],[-.92,y+.10,-.98],.035,C.wood);for(let i=0;i<4;i++){const x=-.94+i*.63;b.box(x,g(x,.8)+.08,.8,.31,.045,.12,0xb8a46c);}
 return[rotor];
}
function towerBridge({b,g}){
 const y=Math.max(g.support(0,-1.24,.88,.9),g.support(0,1.24,.88,.9)),stone=0xcbb98a,blue=0x617e79;
 for(const z of[-1.24,1.24]){b.skirt(0,y,z,.83,.88,g,C.umber);b.box(0,y+.11,z,.83,.27,.88,C.umber,true);b.box(0,y+1.23,z,.68,2.12,.66,stone,true);b.box(0,y+2.3,z,.79,.14,.78,C.ivory,true);b.roof(0,y+2.36,z,.70,.51,.72,0x5f6f63);
  for(const x of[-.33,.33])for(const zz of[-.29,.29]){b.cylinder(x,y+1.46,z+zz,.105,.13,1.89,stone,12,true);b.cylinder(x,y+2.57,z+zz,.008,.15,.52,0x5a6859,12,true);b.sphere(x,y+2.86,z+zz,.028,.045,.028,C.gold);}
  for(let r=0;r<4;r++)for(const dx of[-.13,.13])b.window(dx,y+.64+r*.38,z+.345,.105,.24);b.arch(0,y+.22,z+.36,.35,.77,.034,C.ink);b.box(0,y+1.7,z+.36,.54,.055,.05,C.ochre);courses(b,0,y+.22,z,.68,2.0,.68,0xa48c62);}
 b.box(0,y+.61,0,.54,.12,4.4,C.umber,true);b.box(0,y+.70,0,.48,.055,4.46,0xa8a98a);
 for(const x of[-.25,.25]){b.box(x,y+2.07,0,.075,.20,2.48,blue,true);for(let i=0;i<8;i++){const z=-1.20+i*.30;b.beam([x,y+1.99,z],[x,y+2.17,z+.29],.012,C.ivory);b.beam([x,y+2.17,z],[x,y+1.99,z+.29],.012,C.ivory);}
  for(const s of[-1,1]){const p=[];for(let j=0;j<=14;j++){const t=j/14;p.push([x,y+2.03-1.27*Math.sin(t*Math.PI/2),s*(1.24+t*.96)]);}b.curve(p,.032,blue,22);for(let j=1;j<8;j++){const t=j/8;b.beam([x,y+.79,s*(1.24+t*.96)],[x,y+2.03-1.27*Math.sin(t*Math.PI/2),s*(1.24+t*.96)],.011,blue);}}
  b.beam([x,y+.84,-2.2],[x,y+.84,2.2],.018,blue);for(let i=0;i<28;i++)b.beam([x,y+.73,-2.14+i*.16],[x,y+.85,-2.14+i*.16],.008,blue,5);}
 // Each approach is a solid masonry wedge meeting the sampled bank. The deck
 // ends at 2.23; the low end at 2.7 is the actual checked landing, not a marker.
 for(const sign of[-1,1]){
  const start=2.20*sign,end=2.7*sign,bank=g.support(0,end,.5,.08),deck=y+.7275;
  b.prism([[start,deck],[end,bank+.02],[end,g(0,end)-.055],[start,g(0,start)-.055]],.5,C.stone,[0,0,0],[0,-Math.PI/2,0]);
  for(const x of[-.25,.25]){b.beam([x,deck+.14,start],[x,bank+.16,end],.018,blue);b.beam([x,bank+.02,end],[x,bank+.16,end],.014,blue);}
 }
}
function borgund({b,g}){
 const y=g.support(0,.08,2.4,2.7),wood=0x69492f,tar=0x4a3b2a,roof=0x59442d;
 foundation(b,0,y,0,1.66,2.14);b.box(0,y+.39,0,1.46,.72,1.92,wood,true);b.roof(0,y+.72,0,1.94,.75,2.28,roof);b.box(0,y+1.21,-.09,1.05,.98,1.50,wood,true);b.roof(0,y+1.61,-.09,1.48,.82,1.84,tar);b.box(0,y+2.09,-.12,.65,.71,1.10,wood,true);b.roof(0,y+2.39,-.12,.99,.73,1.41,roof);b.box(0,y+2.99,-.15,.41,.54,.58,wood,true);b.roof(0,y+3.25,-.15,.70,.75,.88,tar);b.beam([0,y+3.95,-.15],[0,y+4.21,-.15],.022,wood);b.beam([-.13,y+4.11,-.15],[.13,y+4.11,-.15],.018,wood);
 for(const x of[-.89,.89]){b.box(x,y+.49,.05,.53,.78,1.19,wood,true);b.roof(x,y+.82,.05,.75,.53,1.47,roof);}
 b.box(0,y+.44,1.15,.68,.83,.50,wood,true);b.roof(0,y+.81,1.15,.89,.60,.71,tar);b.arch(0,y+.06,1.424,.28,.57,.033,0x302b21);
 for(const x of[-.205,.205]){b.cylinder(x,y+.39,1.46,.025,.03,.68,0xb0874c,9);for(let j=0;j<7;j++)b.sphere(x,y+.13+j*.087,1.47,.036,.025,.024,0xa07944);}
 for(const x of[-.65,-.42,.42,.65])b.box(x,y+.39,1,.035,.69,.044,0xa37d46);for(let j=0;j<15;j++)b.box(-.69+j*.098,y+.38,.985,.012,.69,.013,tar);for(let j=0;j<10;j++)b.box(.745,y+.4,-.85+j*.18,.02,.65,.012,tar);
 for(const[yy,d]of[[1.47,1.14],[2.43,.92],[3.12,.70]])for(const s of[-1,1]){b.curve([[0,y+yy,s*d],[0,y+yy+.09,s*(d+.13)],[0,y+yy+.29,s*(d+.26)],[0,y+yy+.36,s*(d+.23)]],.037,wood,16);b.sphere(0,y+yy+.35,s*(d+.23),.057,.044,.073,0x9d7745);b.beam([0,y+yy+.36,s*(d+.26)],[0,y+yy+.46,s*(d+.34)],.014,wood);}
 for(const side of[-1,1])for(let j=0;j<9;j++){const z=-.85+j*.22;b.beam([side*.74,y+.1,z],[side*.74,y+.71,z],.019,C.wood);}
}
export const LANDMARK_SITES=[...sites.filter(s=>!['oslo','bryggen'].includes(s.asset)),...EXTRA_LANDMARK_SITES];

function recipeFootprint(THREE,site,material){
 const b=createModelBuilder(THREE),g=()=>0;g.support=()=>0;b.ground=g;const articulated=site.make({b,g,THREE,material})||[];
 const model=b.finish('measure',material);if(articulated.length)model.add(...articulated);const bounds=new THREE.Box3().setFromObject(model),low=[],point=new THREE.Vector3();
 model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(point.y<bounds.min.y+.24)low.push([point.x,point.z]);}});
 const box=low.length?[Math.min(...low.map(p=>p[0])),Math.max(...low.map(p=>p[0])),Math.min(...low.map(p=>p[1])),Math.max(...low.map(p=>p[1]))]:[bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z];
 model.traverse(o=>o.geometry?.dispose());return box;
}

function fitThamesBridge({site,worldPoint,isDry}){
 const anchor=worldPoint(site.coordinates),points=[];
 // Both tower plinths and both approach ends are dry. Only the span crosses water.
 for(const z of[-1.24,1.24])for(const [x,dz]of footprintSamples([-.46,.46,-.48,.48]))points.push([x,z+dz]);
 for(const sign of[-1,1])for(const [x,z]of footprintSamples([-.28,.28,2.2,2.82]))points.push([x,sign*z]);
 for(let ring=0;ring<24;ring++)for(let j=0;j<(ring?24:1);j++){
  const a=j/24*Math.PI*2,x=anchor.x+Math.cos(a)*ring*.08,z=anchor.z+Math.sin(a)*ring*.08;
  if(!isDry.riverAt(x,z))continue;
  for(let k=0;k<36;k++){
   const yaw=k*Math.PI/36,c=Math.cos(yaw),s=Math.sin(yaw),scale=1.15;
   if(points.every(([px,pz])=>isDry(x+(px*c+pz*s)*scale,z+(-px*s+pz*c)*scale,.06)))return{x,z,yaw,scale,samples:points.length,coordinates:toGeo(x,z),supportPoints:points};
  }
 }
 throw new Error('Tower Bridge has no dry banks at the Thames');
}

export function addLandmarks({THREE,scene,worldPoint,mobile=false,heightAt,regionAt,isDry}){
 if(!isDry)throw new Error('Landmarks require the rendered river and coast support checker');
 const material=createMapModelMaterial(THREE),objects=[],occupied=[],rotors=[];
 for(const site of LANDMARK_SITES){
  const origin=worldPoint(site.coordinates),localBox=recipeFootprint(THREE,site,material);
  let xzScale=site.asset==='borgund'?.90:site.asset==='nyhavn'?1.05:1.22,yScale=site.asset==='borgund'?1.05:1.28,fit,yaw=0;
  if(site.asset==='london'){fit=fitThamesBridge({site,worldPoint,isDry});xzScale=fit.scale;yaw=fit.yaw;}
  else{
   const filter=site.asset==='warsaw'?geo=>geo[0]<site.coordinates[0]-.08&&geo[1]<site.coordinates[1]+.05:site.asset==='windmill'?geo=>geo[0]>4.3&&geo[0]<6.5&&geo[1]>51.45&&geo[1]<53.1:site.asset==='nyhavn'?geo=>geo[0]>11.3&&geo[0]<12.5&&geo[1]>55.1&&geo[1]<56.1:site.asset==='helsinki'?geo=>geo[1]>60.22&&geo[1]<61.2:site.asset==='tallinn'?geo=>geo[1]>58.8&&geo[1]<59.52:()=>true;
   for(const factor of[1,.9,.78,.67,.60]){
    const scale=xzScale*factor,box=localBox.map(v=>v*scale),region=site.asset==='borgund'?3:['warsaw','gdansk'].includes(site.asset)?2:1;
    fit=fitDryFootprint({anchor:origin,box,isDry,heightAt,regionAt,region,maxRadius:3.3,filter,occupied});
    if(fit){xzScale=scale;break;}
   }
   if(!fit)throw new Error('No dry foundation for '+site.title);
  }
  const drawing=worldPoint(fit.coordinates),b=createModelBuilder(THREE),c=Math.cos(yaw),s=Math.sin(yaw);
  const g=(x,z)=>(heightAt(...toGeo(drawing.x+(x*c+z*s)*xzScale,drawing.z+(-x*s+z*c)*xzScale))-drawing.y+.018)/yScale;
  g.support=(x,z,w,d)=>{let highest=-Infinity;for(const [dx,dz]of footprintSamples([x-w/2,x+w/2,z-d/2,z+d/2],.18))highest=Math.max(highest,g(dx,dz));return highest;};b.ground=g;
  const articulated=site.make({b,g,THREE,material})||[];
  const model=b.finish('landmark-'+site.asset,material);if(articulated.length)model.add(...articulated);rotors.push(...articulated.filter(part=>Number.isFinite(part.userData.angularSpeed)));model.position.copy(drawing);model.scale.set(xzScale,yScale,xzScale);model.rotation.y=yaw;
  for(const part of articulated)for(const key of['parts','triangles','drawCalls'])model.userData[key]+=part.userData[key]||0;
  model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);
  // Reserve the complete spinning disc so planted scenery clears every angle.
  for(const part of articulated)if(part.userData.sweepRadius){const r=part.userData.sweepRadius;bounds.union(new THREE.Box3(new THREE.Vector3(-r,-r,-.04),new THREE.Vector3(r,r,.04)).applyMatrix4(part.matrixWorld));}
  const worldBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};occupied.push(worldBounds);
  model.userData={...model.userData,title:site.title,kind:'landmark',style:'painted-solid-diorama',coordinates:[...site.coordinates],drawingCoordinates:fit.coordinates,drawingOffset:[drawing.x-origin.x,drawing.z-origin.z],grounding:site.asset==='london'?'river-crossing':'land',dimensional:true,geolocationVerified:true,worldBounds,localFoundation:localBox,scale:[xzScale,yScale,xzScale],surfaceFit:{clear:true,fullFootprint:true,solidGeometry:true,samples:fit.samples,riverClear:true},...(fit.supportPoints?{bankSupportPoints:fit.supportPoints}:{})};
  if(b.smokeEmitter)model.userData.smokeEmitter=new THREE.Vector3(...b.smokeEmitter).applyMatrix4(model.matrixWorld).toArray();
  scene.add(model);objects.push(model);
 }
 function update(time){for(const rotor of rotors)rotor.rotation.z=time*rotor.userData.angularSpeed;}
 update(0);
 return{count:objects.length,objects,ready:Promise.resolve(objects),reservedBounds:occupied,update};
}
