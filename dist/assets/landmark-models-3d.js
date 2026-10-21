// Sculpted atlas landmarks. All silhouettes, openings, roof ribs and ornament
// have depth; no image cards, billboard facades, or painted background plates.
// The host fits the complete model footprint to dry ground before calling make.
const C={stone:0xd3b582,ivory:0xe5d1a7,light:0xf0dfb9,ochre:0xc69a58,shadow:0x887252,
 brick:0xa75e43,red:0xb96a45,roof:0x6e5c48,copper:0x58776b,verdigris:0x718776,
 ink:0x37463d,wood:0x765536,gold:0xd8b56c,iron:0x8c6949,snow:0xe6dec4};

function footing(b,g,x,z,w,d,y=g.support(x,z,w,d),color=C.stone){
 b.skirt(x,y+.035,z,w,d,g,C.shadow);b.box(x,y+.045,z,w,.09,d,color);return y+.09;
}
function block(b,g,x,z,w,h,d,color=C.stone,y=g.support(x,z,w,d)){
 const base=footing(b,g,x,z,w,d,y);b.box(x,base+h/2,z,w,h,d,color,true);return base;
}
function band(b,x,y,z,w,d,color=C.ivory,h=.07){b.box(x,y,z,w,h,d,color,true);}
function cross(b,x,y,z,s=.15){b.beam([x,y,z],[x,y+s*2,z],.018,C.gold,8);b.beam([x-s*.6,y+s*1.35,z],[x+s*.6,y+s*1.35,z],.016,C.gold,8);}
function ellipsoid(b,THREE,x,y,z,rx,ry,rz,color){b.add(new THREE.SphereGeometry(1,12,8),color,[x,y,z],[0,0,0],[rx,ry,rz]);}
function finial(b,x,y,z,h=.55,r=.12,color=C.copper){
 b.cylinder(x,y+.08,z,r*.8,r,.16,C.stone,10);b.cylinder(x,y+.16+h/2,z,.008,r*.8,h,color,12);b.beam([x,y+.16+h,z],[x,y+.28+h,z],.012,C.gold,6);
}
function column(b,x,y,z,h,r=.12,color=C.ivory){
 b.box(x,y+.055,z,r*2.8,.11,r*2.8,color);b.cylinder(x,y+.14,z,r*1.13,r*1.25,.09,color,16);
 b.cylinder(x,y+.19+h/2,z,r*.89,r,h,color,16);b.cylinder(x,y+.2+h,z,r*1.18,r,.09,color,16);b.box(x,y+.3+h,z,r*2.7,.11,r*2.7,color);
 // Molded fluting is dimensional and deliberately restrained at overview scale.
 for(let j=0;j<8;j++){const a=j*Math.PI/4;b.beam([x+Math.cos(a)*r*.94,y+.25,z+Math.sin(a)*r*.94],[x+Math.cos(a)*r*.87,y+h+.12,z+Math.sin(a)*r*.87],.009,C.stone,5);}
}
function lancet(b,x,y,z,w,h,face='front'){
 const a=face==='side'?Math.PI/2:0,pts=[[-w/2,0],[-w/2,h*.68],[-w*.29,h*.87],[0,h],[w*.29,h*.87],[w/2,h*.68],[w/2,0]];
 b.prism(pts,.055,C.ivory,[x,y,z],[0,a,0]);b.prism(pts.map(([xx,yy])=>[xx*.78,yy*.88]),.06,C.ink,[x+(face==='side'?.035:0),y+.025,z+(face==='front'?.035:0)],[0,a,0]);
 const p=(xx,yy)=>face==='side'?[x+.072,y+yy,z+xx]:[x+xx,y+yy,z+.072];
 b.beam(p(0,.06),p(0,h*.86),.015,C.stone,6);b.beam(p(-w*.34,h*.42),p(w*.34,h*.42),.012,C.stone,6);
}
function house(b,g,x,z,w=.6,h=1.05,d=.8,color=C.ochre,y=g.support(x,z,w,d)){
 const p=block(b,g,x,z,w,h,d,color,y);b.roof(x,p+h,z,w+.08,.4,d+.12,C.roof);
 for(let j=0;j<2;j++)for(let r=0;r<2;r++)b.window(x+(j-.5)*w*.45,p+.25+r*.4,z+d/2+.02,.12,.18);
 b.box(x,p+.15,z+d/2+.04,.13,.29,.04,C.wood);b.box(x-w*.25,p+h+.30,z-.16,.10,.32,.12,C.brick);return p;
}

export function makeBrandenburg({b,g,THREE}){
 const y=g.support(0,0,4.9,1.52);footing(b,g,0,0,4.8,1.45,y);
 for(const z of[-.47,.47])for(let i=0;i<6;i++)column(b,(i-2.5)*.61,y+.09,z,1.78,.115);
 for(const x of[-2.05,2.05]){const p=block(b,g,x,0,.67,1.42,1.19,C.stone,y);b.arch(x,p+.06,.62,.30,.87,.05,C.ink);band(b,x,p+1.40,0,.78,1.32);b.roof(x,p+1.45,0,.78,.29,1.32,C.roof);}
 for(const[yy,w,h,d,col]of[[2.18,3.91,.17,1.25,C.ivory],[2.38,4.03,.23,1.36,C.stone],[2.55,4.20,.10,1.51,C.light],[2.68,3.61,.18,1.16,C.stone],[2.80,3.83,.075,1.30,C.ivory]])b.box(0,y+yy,0,w,h,d,col,true);
 for(let i=0;i<20;i++)b.box((i-9.5)*.18,y+2.35,.694,.065,.19,.035,C.shadow);
 for(let i=0;i<7;i++){const x=(i-3)*.41;ellipsoid(b,THREE,x,y+2.69,.61,.075,.055,.027,C.light);b.beam([x-.1,y+2.69,.62],[x+.1,y+2.69,.62],.013,C.ivory);}
 b.box(0,y+2.91,0,1.45,.17,.79,C.stone,true);
 // Quadriga: four bronze horses, sculpted chariot, and Victoria with a staff.
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.25;ellipsoid(b,THREE,x,y+3.29,.07,.125,.18,.29,C.copper);
  b.beam([x,y+3.32,.23],[x,y+3.64,.36],.08,C.copper,10);ellipsoid(b,THREE,x,y+3.64,.43,.075,.09,.13,C.copper);
  for(const dx of[-.065,.065]){b.beam([x+dx,y+3.21,-.10],[x+dx,y+3.00,-.11],.024,C.copper,7);b.beam([x+dx,y+3.25,.24],[x+dx,y+3.04,.34],.024,C.copper,7);b.box(x+dx,y+3.01,.35,.07,.06,.10,C.copper);}
  b.curve([[x,y+3.38,-.18],[x-.04,y+3.18,-.37],[x-.02,y+3.05,-.42]],.025,C.copper,9);
  for(const dx of[-.045,.045])b.cylinder(x+dx,y+3.76,.40,.005,.025,.12,C.copper,7);
 }
 b.box(0,y+3.14,-.39,.47,.25,.35,C.copper,true);for(const x of[-.27,.27])b.add(new THREE.TorusGeometry(.15,.027,5,14),C.copper,[x,y+3.10,-.39],[0,Math.PI/2,0]);
 b.cylinder(0,y+3.51,-.38,.065,.13,.46,C.copper,12);ellipsoid(b,THREE,0,y+3.83,-.38,.071,.09,.07,C.copper);
 b.beam([0,y+3.68,-.38],[.26,y+3.79,-.34],.024,C.copper,7);b.beam([.26,y+3.47,-.34],[.26,y+4.10,-.34],.016,C.copper,7);
 b.add(new THREE.TorusGeometry(.10,.023,5,14),C.copper,[.26,y+4.12,-.34]);b.beam([.26,y+4.18,-.34],[.26,y+4.31,-.34],.015,C.copper,6);
 for(const s of[-1,1])b.prism([[0,0],[s*.31,.24],[s*.37,.17],[s*.16,-.03]],.045,C.copper,[s*.05,y+3.68,-.41]);
}

export function makeEiffel({b,g}){
 const y=g.support(0,0,3.8,3.8),iron=C.iron,levels=[[0,1.64],[1.65,1.01],[3.05,.59],[4.85,.22],[5.55,.10]];
 for(const sx of[-1,1])for(const sz of[-1,1])footing(b,g,sx*1.64,sz*1.64,.50,.50,y);
 for(let k=0;k<levels.length-1;k++){
  const[ya,ra]=levels[k],[yb,rb]=levels[k+1];
  for(const sx of[-1,1])for(const sz of[-1,1]){
   b.beam([sx*ra,y+ya+.10,sz*ra],[sx*rb,y+yb+.10,sz*rb],k<2?.074:.047,iron,10);
   for(let j=0;j<5;j++){
    const t=j/5,u=(j+1)/5,rr=ra+(rb-ra)*t,rt=ra+(rb-ra)*u,yy=ya+(yb-ya)*t,yt=ya+(yb-ya)*u;
    const q=k===0?.23:k===1?.18:.10;
    b.beam([sx*(rr-q),y+yy+.1,sz*rr],[sx*(rt+q),y+yt+.1,sz*rt],.021,iron,6);
    b.beam([sx*(rr+q),y+yy+.1,sz*rr],[sx*(rt-q),y+yt+.1,sz*rt],.021,iron,6);
    b.beam([sx*rr,y+yy+.1,sz*(rr-q)],[sx*rt,y+yt+.1,sz*(rt+q)],.021,iron,6);
    b.beam([sx*rr,y+yy+.1,sz*(rr+q)],[sx*rt,y+yt+.1,sz*(rt-q)],.021,iron,6);
   }
  }
  if(k>0)for(const s of[-1,1])for(let j=0;j<5;j++){
   const t=j/5,u=(j+1)/5,rr=ra+(rb-ra)*t,rt=ra+(rb-ra)*u,yy=ya+(yb-ya)*t,yt=ya+(yb-ya)*u;
   b.beam([-rr,y+yy+.10,s*rr],[rt,y+yt+.10,s*rt],.021,iron,6);b.beam([rr,y+yy+.10,s*rr],[-rt,y+yt+.10,s*rt],.021,iron,6);
   b.beam([s*rr,y+yy+.10,-rr],[s*rt,y+yt+.10,rt],.021,iron,6);b.beam([s*rr,y+yy+.10,rr],[s*rt,y+yt+.10,-rt],.021,iron,6);
  }
 }
 for(const[h,r]of[[1.72,1.15],[3.10,.72],[5.20,.25]]){
  b.box(0,y+h,0,r*2,.13,r*2,iron,true);b.box(0,y+h+.09,0,r*2+.08,.05,r*2+.08,C.ochre);
  for(const s of[-1,1]){b.beam([-r,y+h+.28,s*r],[r,y+h+.28,s*r],.02,iron,6);b.beam([s*r,y+h+.28,-r],[s*r,y+h+.28,r],.02,iron,6);
   for(let i=0;i<13;i++){const x=-r+i*r/6;b.beam([x,y+h+.09,s*r],[x,y+h+.28,s*r],.01,iron,5);b.beam([s*r,y+h+.09,x],[s*r,y+h+.28,x],.01,iron,5);}}
 }
 // Four curved, open arch ribs under the first gallery.
 for(const s of[-1,1]){
  const points=[];for(let i=0;i<=20;i++){const x=-1.56+i*3.12/20;points.push([x,y+.13+1.37*Math.sqrt(Math.max(0,1-(x/1.68)**2)),s*1.38]);}b.curve(points,.065,iron,24);
  b.curve(points.map(([x,yy,z])=>[z,yy,x]),.065,iron,24);
 }
 b.cylinder(0,y+5.54,0,.09,.15,.55,iron,12);b.beam([0,y+5.81,0],[0,y+6.42,0],.023,C.ink,8);
}

export function makeCologne({b,g,THREE}){
 const y=g.support(0,-.40,3.5,4.80),stone=0xb49a72,dark=0x685f4e;
 block(b,g,0,-.38,1.28,2.35,3.10,stone,y);b.roof(0,y+2.44,-.38,1.45,.91,3.28,dark);
 for(const x of[-1.02,1.02]){block(b,g,x,-.33,.73,1.47,3.16,stone,y);b.roof(x,y+1.56,-.33,.83,.5,3.31,dark);}
 block(b,g,0,-.68,3.36,1.88,.83,stone,y);b.roof(0,y+1.97,-.68,3.46,.70,.96,dark);
 for(const x of[-.73,.73]){
  block(b,g,x,1.30,.91,3.55,1.00,stone,y);band(b,x,y+1.42,1.30,1.0,1.09);band(b,x,y+2.66,1.30,1.02,1.11);
  for(let j=0;j<3;j++)for(const dx of[-.22,.22])lancet(b,x+dx,y+.37+j*.85,1.82,.25,.64);
  for(const s of[-1,1])for(const dz of[-.41,.41]){b.box(x+s*.44,y+1.84,1.30+dz,.10,3.51,.12,C.stone);finial(b,x+s*.44,y+3.60,1.30+dz,.71,.11,dark);}
  b.cylinder(x,y+3.93,1.3,.33,.43,.67,stone,8,true);for(const dx of[-.18,.18])lancet(b,x+dx,y+3.65,1.72,.18,.55);
  b.cylinder(x,y+4.80,1.3,.015,.38,1.62,dark,12,true);
  for(let j=0;j<8;j++){const a=j*Math.PI/4;b.beam([x+Math.cos(a)*.36,y+4.02,1.3+Math.sin(a)*.36],[x,y+5.61,1.3],.023,C.stone,7);}
  for(let j=0;j<5;j++){const h=j*.27,r=.34*(1-j*.16);b.cylinder(x,y+4.13+h,1.3,r,r,.031,stone,12);}
  cross(b,x,y+5.61,1.3,.13);
 }
 block(b,g,0,1.30,.49,1.84,.88,stone,y);lancet(b,0,y+.14,1.78,.39,1.32);
 b.add(new THREE.TorusGeometry(.27,.045,6,24),C.stone,[0,y+2.26,1.83]);b.add(new THREE.CylinderGeometry(.235,.235,.04,24),C.ink,[0,y+2.26,1.82],[Math.PI/2,0,0]);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;b.beam([0,y+2.26,1.86],[Math.cos(a)*.24,y+2.26+Math.sin(a)*.24,1.86],.016,C.ivory,6);}
 for(const s of[-1,1])for(let j=0;j<6;j++){
  const z=-1.76+j*.49,x=s*1.52;block(b,g,x,z,.16,1.57,.25,C.stone,y);finial(b,x,y+1.66,z,.55,.10,dark);
  b.curve([[x,y+1.36,z],[s*1.18,y+1.88,z],[s*.70,y+2.48,z]],.063,C.stone,10);
  lancet(b,s*1.40,y+.43,z,.20,.82,'side');lancet(b,s*.66,y+1.74,z,.20,.60,'side');
 }
 // Faceted choir, radiating chapels, and a slim crossing fleche.
 for(let i=0;i<5;i++){const a=Math.PI+i*Math.PI/4,x=Math.cos(a)*.79,z=-1.78+Math.sin(a)*.56;block(b,g,x,z,.47,.91,.53,stone,y);b.cylinder(x,y+1.22,z,.01,.36,.45,dark,8);finial(b,x,y+1.48,z,.30,.05,dark);}
 b.cylinder(0,y+3.41,-.68,.16,.22,.48,stone,8);b.cylinder(0,y+4.02,-.68,.008,.21,.82,dark,12);cross(b,0,y+4.43,-.68,.11);
}

export function makeTrakai({b,g}){
 const y=g.support(0,0,3.85,3.35),brick=C.brick;
 for(const[x,z,w,d]of[[0,1.22,3.25,.34],[-1.48,0,.34,2.49],[1.48,0,.34,2.49],[0,-1.15,3.25,.34]]){
  block(b,g,x,z,w,1.06,d,brick,y);const along=w>d,length=along?w:d,n=Math.floor(length/.20);
  for(let i=0;i<n;i++)b.box(x+(along?(i-(n-1)/2)*.20:0),y+1.25,z+(along?0:(i-(n-1)/2)*.20),along?.12:w,.22,along?d:.12,C.red);
 }
 for(const x of[-1.48,1.48])for(const z of[-1.15,1.22]){
  footing(b,g,x,z,.78,.78,y);b.cylinder(x,y+.95,z,.34,.40,1.73,brick,20,true);b.cylinder(x,y+2.15,z,.015,.46,.87,C.red,24,true);b.beam([x,y+2.57,z],[x,y+2.76,z],.014,C.gold,6);
  for(let j=0;j<3;j++)b.window(x,y+.42+j*.43,z+.37,.10,.20);
 }
 for(const x of[-.64,.64]){const p=block(b,g,x,-.51,.63,2.12,1.43,brick,y);b.roof(x,p+2.12,-.51,.79,.75,1.58,C.red);for(let r=0;r<3;r++)for(const dx of[-.16,.16])b.window(x+dx,p+.43+r*.53,.23,.12,.26);}
 const p=block(b,g,0,.49,.77,3.03,.81,brick,y);b.roof(0,p+3.03,.49,.98,.83,1.02,C.red);for(let r=0;r<4;r++)b.window(0,p+.46+r*.60,.91,.16,.30);b.arch(0,y+.10,1.412,.39,.78,.045,C.ink);
 for(const x of[-1.17,1.17])for(let j=0;j<5;j++)b.arch(x,y+.18,-.91+j*.43,.19,.70,.045,C.ink,Math.PI/2);
 // The castle has a dry courtyard; its island is supplied by actual map geography.
 for(let i=0;i<8;i++)b.box(-1.17+i*.33,y+.11,.80,.28,.035,.21,i%2?C.stone:C.ochre);
}

function dome(b,THREE,x,y,z,r,h){
 const points=[new THREE.Vector2(0,0),new THREE.Vector2(r,0)];for(let i=0;i<=14;i++){const a=i/14*Math.PI/2;points.push(new THREE.Vector2(r*Math.cos(a),h*Math.sin(a)));}
 b.add(new THREE.LatheGeometry(points,24),C.copper,[x,y,z]);
 for(let j=0;j<12;j++){const a=j*Math.PI/6,p=[];for(let i=0;i<=10;i++){const t=i/10*Math.PI/2;p.push([x+Math.cos(a)*r*Math.cos(t),y+h*Math.sin(t),z+Math.sin(a)*r*Math.cos(t)]);}b.curve(p,.012,C.verdigris,12);}
}
export function makeHelsinki({b,g,THREE}){
 const y=g.support(0,.30,4.24,4.55),white=0xe4d4ae;
 block(b,g,0,0,2.17,1.74,3.23,white,y);block(b,g,0,0,3.93,1.74,1.57,white,y);
 for(const[x,z,w,d]of[[0,1.50,2.37,.87],[0,-1.50,2.37,.87],[-1.66,0,.79,1.96],[1.66,0,.79,1.96]]){band(b,x,y+1.88,z,w,d,C.ivory,.17);b.roof(x,y+1.96,z,w,.46,d,C.ivory);}
 for(const z of[-1.82,1.82])for(let i=0;i<6;i++)column(b,(i-2.5)*.37,y+.13,z,1.39,.072,white);
 for(const x of[-1.94,1.94])for(let i=0;i<4;i++)column(b,x,y+.13,(i-1.5)*.41,1.39,.072,white);
 for(let i=0;i<5;i++){const z=2.00+i*.12,top=y+.14-i*.026;footing(b,g,0,z,2.58+i*.10,.13,top,C.ivory);}
 b.cylinder(0,y+2.49,0,.66,.66,1.03,white,24,true);b.cylinder(0,y+3.02,0,.73,.73,.10,C.ivory,24);dome(b,THREE,0,y+3.08,0,.75,.72);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*.67,z=Math.sin(a)*.67;b.cylinder(x,y+2.49,z,.032,.037,.88,C.ivory,8);}
 for(const x of[-.36,0,.36])b.arch(x,y+2.17,.66,.19,.55,.055,C.ink);
 b.cylinder(0,y+3.89,0,.10,.14,.24,C.ivory,12);dome(b,THREE,0,y+4.02,0,.15,.15);cross(b,0,y+4.17,0,.18);
 for(const x of[-1.05,1.05])for(const z of[-.95,.95]){
  b.cylinder(x,y+2.09,z,.25,.28,.52,white,16);dome(b,THREE,x,y+2.36,z,.31,.36);b.cylinder(x,y+2.77,z,.05,.07,.13,C.ivory,10);cross(b,x,y+2.84,z,.11);
 }
 // Twelve roofline statues and their plinths read as sculpture, never printed faces.
 for(let i=0;i<6;i++)for(const s of[-1,1]){const x=(i-2.5)*.37,z=s*1.71;b.box(x,y+2.14,z,.13,.13,.15,C.ivory);b.cylinder(x,y+2.34,z,.037,.065,.30,white,8);ellipsoid(b,THREE,x,y+2.54,z,.05,.065,.05,white);}
 for(const x of[-1.29,1.29])for(const z of[-.37,.37])lancet(b,x,y+.42,z,.23,.91,'side');
}

export function makeTallinn({b,g}){
 const y=g.support(0,.30,3.79,3.40),limestone=0xc5b58b;
 for(const[x,z,w,d]of[[0,-1.02,2.89,.48],[-1.30,.02,.52,2.34],[0,1.07,2.89,.49]]){block(b,g,x,z,w,1.51,d,limestone,y);b.roof(x,y+1.60,z,w+.12,.41,d+.10,C.red);}
 const p=block(b,g,1.17,0,.62,1.94,2.40,0xcfa58d,y);b.roof(1.17,p+1.94,0,.75,.52,2.55,C.roof);
 for(let j=0;j<7;j++)for(let r=0;r<3;r++)b.window(1.50,y+.4+r*.48,-1.0+j*.32,.14,.22,'side');
 for(let j=0;j<9;j++)for(let r=0;r<2;r++)b.window(-1.16+j*.29,y+.45+r*.55,1.33,.14,.23);
 const x=-1.37,z=.99;footing(b,g,x,z,.72,.72,y);b.cylinder(x,y+1.85,z,.32,.37,3.56,limestone,24,true);
 b.cylinder(x,y+3.67,z,.42,.40,.16,C.stone,24);b.cylinder(x,y+3.86,z,.33,.33,.26,limestone,24);for(let j=0;j<12;j++){const a=j*Math.PI/6;b.box(x+Math.cos(a)*.35,y+4.07,z+Math.sin(a)*.35,.14,.23,.14,C.stone);}
 b.beam([x,y+3.99,z],[x,y+4.94,z],.018,C.wood,8);b.box(x+.15,y+4.76,z,.29,.11,.015,0x47758b);b.box(x+.15,y+4.65,z,.29,.11,.015,0x3b392e);b.box(x+.15,y+4.54,z,.29,.11,.015,C.ivory);
 for(let r=0;r<6;r++)b.arch(x,y+.37+r*.53,z+.365,.085,.26,.04,C.ink);
 for(const zz of[-.76,.02]){footing(b,g,-1.42,zz,.54,.54,y);b.cylinder(-1.42,y+.91,zz,.23,.27,1.65,limestone,18);b.cylinder(-1.42,y+2.03,zz,.008,.35,.65,C.red,20);}
 house(b,g,.08,-.09,.62,1.23,.84,0xc6a477,y);house(b,g,.73,1.60,.56,1.10,.57,0xb67951,y);
}

export function makeRiga({b,g,THREE}){
 const y=g.support(0,0,3.45,2.18),brick=0xb56c49;
 for(const[x,w,h,d]of[[-.65,1.70,1.72,1.65],[.94,1.35,1.47,1.53]]){
  const p=block(b,g,x,0,w,h,d,brick,y);b.roof(x,p+h,0,w+.13,1.27,d+.15,C.roof);
  // Stepped Dutch Renaissance facade, molded stone scrolls, gilded pinnacles.
  for(let j=0;j<7;j++){const ww=w*(1-j*.125);b.box(x,p+h+.055+j*.16,d/2+.045,ww,.19,.13,brick);band(b,x,p+h+.15+j*.16,d/2+.06,ww+.055,.17,C.ivory,.035);}
  for(let j=0;j<5;j++)for(const s of[-1,1]){const xx=x+s*(w*.5-j*w*.0625);b.add(new THREE.TorusGeometry(.055,.018,5,12),C.ivory,[xx,p+h+.13+j*.16,d/2+.12]);}
  for(let r=0;r<3;r++)for(let j=0;j<4;j++)b.window(x+(j-1.5)*w*.215,p+.28+r*.45,d/2+.08,w*.12,.25);
  for(const dx of[-w*.44,-w*.20,w*.20,w*.44])b.box(x+dx,p+h*.51,d/2+.08,.045,h,.085,C.ivory);
  for(let r=0;r<4;r++)band(b,x,p+.13+r*.47,d/2+.08,w+.04,.15,C.ivory,.035);
  finial(b,x,p+h+1.10,d/2+.06,.38,.065,C.copper);b.arch(x,p+.02,d/2+.13,.30,.47,.05,C.ink);
 }
 b.add(new THREE.CylinderGeometry(.22,.22,.06,24),C.gold,[-.65,y+2.10,.97],[Math.PI/2,0,0]);b.add(new THREE.CylinderGeometry(.17,.17,.07,24),0x4d6a62,[-.65,y+2.10,1.0],[Math.PI/2,0,0]);
 b.beam([-.65,y+2.10,1.045],[-.65,y+2.24,1.045],.013,C.gold);b.beam([-.65,y+2.10,1.045],[-.55,y+2.05,1.045],.013,C.gold);
 for(const x of[-1.25,-.84,-.44,-.03]){b.box(x,y+.9,1.02,.14,.11,.17,C.ivory);b.cylinder(x,y+1.10,1.02,.035,.063,.30,C.ivory,8);ellipsoid(b,THREE,x,y+1.30,1.02,.05,.062,.05,C.ivory);}
 // A small Roland column in the square, grounded independently.
 const h=footing(b,g,.80,1.31,.33,.33);b.box(.8,h+.23,1.31,.22,.46,.22,C.stone);b.cylinder(.8,h+.76,1.31,.065,.09,.59,C.ivory,10);ellipsoid(b,THREE,.8,h+1.10,1.31,.075,.10,.07,C.ivory);b.beam([.92,h+.49,1.31],[.92,h+1.25,1.31],.015,C.iron,6);
}

export function makeRosenholm({b,g,THREE}){
 const y=g.support(0,0,3.75,2.9),brick=0xa76546;
 for(const[x,z,w,d]of[[0,-.92,3.14,.73],[-1.26,0,.65,2.20],[1.26,0,.65,2.20],[0,.97,3.14,.64]]){
  const p=block(b,g,x,z,w,1.39,d,brick,y);b.roof(x,p+1.39,z,w+.12,.62,d+.13,C.roof);const n=Math.max(2,Math.floor(w/.31));
  for(let j=0;j<n;j++)for(let r=0;r<2;r++)b.window(x+(j-(n-1)/2)*w/n,p+.35+r*.55,z+d/2+.03,.14,.26);
  for(let j=0;j<n;j++){const xx=x+(j-(n-1)/2)*w/n;b.box(xx,p+1.53,z+d*.20,.16,.24,.19,C.stone);b.roof(xx,p+1.65,z+d*.20,.22,.20,.25,C.roof);}
 }
 for(const x of[-1.47,1.47])for(const z of[-1.02,1.02]){
  footing(b,g,x,z,.61,.61,y);b.cylinder(x,y+1.15,z,.26,.30,2.13,brick,20,true);b.cylinder(x,y+2.25,z,.31,.31,.14,C.stone,20);
  b.cylinder(x,y+2.53,z,.14,.33,.48,C.copper,20);ellipsoid(b,THREE,x,y+2.86,z,.19,.27,.19,C.copper);b.cylinder(x,y+3.19,z,.012,.12,.40,C.copper,14);b.beam([x,y+3.39,z],[x,y+3.59,z],.014,C.gold,6);
  for(let j=0;j<3;j++)b.window(x,y+.50+j*.52,z+.29,.10,.23);
 }
 b.arch(0,y+.12,1.33,.43,.84,.07,C.ink);band(b,0,y+1.24,1.35,.66,.16,C.ivory,.075);
 for(const x of[-.28,.28])column(b,x,y+.12,1.37,.88,.045,C.stone);
 for(let j=0;j<4;j++)b.box(0,y+1.65+j*.14,1.33,.65-j*.13,.15,.10,C.stone);b.box(0,y+2.28,1.34,.08,.18,.10,C.ivory);
}

export function makeEdinburgh({b,g}){
 const y=g.support(0,0,4.20,2.7),stone=0xa89570;
 // The castle's curtain walls follow the underlying crag with skirts all around.
 for(const[x,z,w,d,h]of[[0,1.02,3.92,.37,.83],[-1.78,0,.39,2.25,1.08],[1.75,0,.39,2.25,1.08],[0,-1.03,3.86,.37,1.03]]){
  block(b,g,x,z,w,h,d,stone,y);const n=Math.max(2,Math.floor(Math.max(w,d)/.24));for(let j=0;j<n;j++)b.box(x+(w>d?(j-(n-1)/2)*.24:0),y+h+.19,z+(w>d?0:(j-(n-1)/2)*.24),w>d?.13:w,.21,w>d?d:.13,C.stone);
 }
 for(const[x,z,w,d,h]of[[-.65,-.33,1.45,1.14,1.87],[.92,-.30,.91,1.28,1.60],[-.54,.65,1.40,.55,1.25]]){
  const p=block(b,g,x,z,w,h,d,stone,y);b.roof(x,p+h,z,w+.14,.59,d+.12,C.roof);for(let r=0;r<3;r++)for(let j=0;j<3;j++)b.window(x+(j-1)*w*.25,p+.30+r*.47,z+d/2+.03,.14,.24);
  for(const xx of[-w*.34,w*.34])b.box(x+xx,p+h+.50,z-.22,.14,.52,.17,C.shadow);
 }
 const x=1.48,z=.81;footing(b,g,x,z,1.0,.95,y);b.cylinder(x,y+.80,z,.46,.52,1.42,stone,24,true);for(let j=0;j<10;j++){const a=j*Math.PI/5;b.box(x+Math.cos(a)*.45,y+1.64,z+Math.sin(a)*.45,.17,.24,.17,C.stone);}
 b.arch(.25,y+.10,1.23,.43,.69,.04,C.ink);b.beam([-1.18,y+2.71,-.31],[-1.18,y+3.63,-.31],.015,C.wood,6);b.box(-1.02,y+3.44,-.31,.31,.20,.018,0x536d85);
}

export function makeHekla({b,g,THREE}){
 // A continuous cratered, elongated stratovolcano, sewn into the DEM at the foot.
 // It is an atlas interpretation of Hekla, whose real edifice is fissure-shaped.
 const rings=25,sectors=72,verts=[],cols=[],inds=[],center=g(0,0);
 const surface=(r,a)=>{
  const rough=1+.07*Math.sin(a*7)+.035*Math.sin(a*13),x=Math.cos(a)*r*3.10*rough,z=Math.sin(a)*r*2.28*rough;
  const ridge=Math.pow(Math.max(0,1-r),1.25)*3.13,crater=r<.21?(1-r/.21)*.82:0;
  const folds=Math.sin(a*13+r*4)*Math.sin(r*Math.PI)*.15+Math.sin(a*23-r*6)*Math.sin(r*Math.PI)*.07;
  const y=g(x,z)*(r**2)+center*(1-r**2)+ridge-crater+folds;
  return[x,y,z];
 };
 for(let j=0;j<=rings;j++)for(let i=0;i<=sectors;i++){
  const r=j/rings,a=i/sectors*Math.PI*2,p=surface(r,a);verts.push(...p);
  const rock=r<.18?0x624b3c:r<.44&&Math.sin(a*9+r*13)>.02?C.snow:r>.83?0x999052:Math.sin(a*13+r*3)>.25?0x8c8270:0x68695a;
  const c=new THREE.Color(rock);cols.push(c.r,c.g,c.b);
 }
 for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){const a=j*(sectors+1)+i,c=a+sectors+1;inds.push(a,a+1,c,a+1,c+1,c);}
 const smooth=new THREE.BufferGeometry();smooth.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));smooth.setIndex(inds);smooth.computeVertexNormals();const normal=smooth.attributes.normal;
 // Preserve individual pigment zones; builder consumes color only per part, so
 // split the continuous surface into small radial ribbons with no detached bases.
 for(let i=0;i<sectors;i++){
  for(let j=0;j<rings;j++){
   const a=j*(sectors+1)+i,c=a+sectors+1,ids=[a,a+1,c,a+1,c+1,c],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ids.flatMap(k=>verts.slice(k*3,k*3+3)),3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(ids.flatMap(k=>[normal.getX(k),normal.getY(k),normal.getZ(k)]),3));
   const color=new THREE.Color(cols[a*3],cols[a*3+1],cols[a*3+2]);b.add(geo,color.getHex());
  }
 }
 smooth.dispose();
 const craterY=surface(.09,0)[1];b.cylinder(0,craterY+.015,0,.27,.34,.055,0xa64e2f,32);b.cylinder(0,craterY+.045,0,.15,.22,.035,0xd99942,24);
 for(const a of[.18,1.12,2.45,3.70,5.2]){
  const path=[];for(let j=0;j<17;j++){const r=.12+j*.035,p=surface(r,a+Math.sin(j*.6)*.04);path.push([p[0],p[1]+.027,p[2]]);}b.curve(path,.035,0x974b30,28);b.curve(path.map(([x,y,z])=>[x,y+.016,z]),.012,0xd59b45,28);
 }
 // Soft sculpted ash plume: several lobes of a single shared opaque clay pigment.
 for(let i=0;i<7;i++){const r=.17+i*.036;ellipsoid(b,THREE,.06+Math.sin(i*.9)*.10,craterY+.33+i*.29,-i*.075,r*.83,r*1.08,r,0xa49982);}
}

export const EXTRA_LANDMARK_SITES=Object.freeze([
 {asset:'brandenburg',title:'Berlin · Brandenburg Gate',coordinates:[13.3777034,52.5162699],make:makeBrandenburg,scale:1.12,region:1},
 {asset:'eiffel',title:'Paris · Eiffel Tower',coordinates:[2.2945,48.8584],make:makeEiffel,scale:1.15,region:1},
 {asset:'cologne',title:'Cologne · Cathedral',coordinates:[6.95828,50.94128],make:makeCologne,scale:1.10,region:1},
 {asset:'trakai',title:'Trakai · Island Castle',coordinates:[24.9333,54.6522],make:makeTrakai,scale:1.07,region:1},
 {asset:'helsinki',title:'Helsinki · Cathedral',coordinates:[24.9524,60.1704],make:makeHelsinki,scale:1.05,region:1},
 {asset:'tallinn',title:'Tallinn · Toompea Castle',coordinates:[24.7375,59.4355],make:makeTallinn,scale:1.05,region:1},
 {asset:'riga',title:'Riga · House of the Blackheads',coordinates:[24.1067,56.9473],make:makeRiga,scale:1.17,region:1},
 {asset:'rosenholm',title:'Jutland · Rosenholm Castle',coordinates:[10.3331,56.3293],make:makeRosenholm,scale:.90,region:1},
 {asset:'edinburgh',title:'Edinburgh · Castle',coordinates:[-3.2007,55.9486],make:makeEdinburgh,scale:1.10,region:1},
 {asset:'iceland_volcano',title:'Iceland · Hekla',coordinates:[-19.7067517,63.9832686],make:makeHekla,scale:1.30,region:1,grounding:'volcanic-terrain'},
]);
