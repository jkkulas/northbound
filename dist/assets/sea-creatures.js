import { modelKit } from './cartographic-models.js';

function makeCreature(THREE,kit,kind){
  const group=new THREE.Group(),{box,ball,cylinder,beam,path,line,polygon,flag,shadow,wakes}=kit;
  if(kind==='serpent'){
    // Body dips into the water between exaggerated rising arches.
    path(group,[[-4,.12,.15],[-3.3,.9,.1],[-2.6,1.05,0],[-1.9,.1,-.12],[-1.1,.95,-.2],[-.3,1.2,-.15],[.5,.15,0],[1.3,.75,.07],[2.1,1.1,.08],[2.75,2.3,.07]],.35,'sage',true);
    ball(group,.72,[2.9,2.47,.08],[1.1,.7,.67],'sage',1);
    ball(group,.19,[3.2,2.66,.51],[1,1,.6],'cream');ball(group,.075,[3.25,2.67,.6],[1,1,.5],'ink',0);
    ball(group,.29,[3.57,2.27,.1],[1.2,.45,1],'ochre');
    for(let i=0;i<9;i++){const x=-3.25+i*.67,y=.85+.4*Math.sin(i*2.2);polygon(group,[[0,0],[.25,.6],[.5,0]],.07,'dark',[x,y,-.1],false)}
    beam(group,[2.66,2.78,-.16],[2.48,3.26,-.2],.065,'ochre');beam(group,[3.04,2.91,-.1],[3.16,3.37,-.12],.06,'ochre');
    path(group,[[3.6,2.25,.21],[3.99,2.3,.24],[4.14,2.46,.24]],.032,'red');wakes(group,8.6,2.2);shadow(group,9,3,-.015,.15);
  }else if(kind==='kraken'){
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a),bend=i%2?1:-1;
      path(group,[[dx*.45,.15,dz*.45],[dx*1.1,.22,dz*1.1],[dx*2,.45,dz*2],[dx*2.6,1.3,dz*2.5],[dx*2.8+bend*.2,1.8,dz*2.4],[dx*2.5+bend*.15,1.95,dz*2.1]],.19,'rust');
      for(let s=1;s<=3;s++)ball(group,.085,[dx*(1+s*.38),.38+s*.13,dz*(1+s*.38)+.15],[1,.5,1],'ochre',0);
    }
    ball(group,1.06,[0,1.03,0],[.87,1.18,.8],'rust',2);
    for(const x of [-.45,.45]){ball(group,.24,[x,1.3,.67],[1,1,.5],'cream');ball(group,.11,[x+.035,1.3,.79],[1,1,.45],'ink',1)}
    path(group,[[-.2,.77,.82],[0,.69,.88],[.2,.77,.82]],.035,'ink');wakes(group,6.3,4.8);shadow(group,7.7,6,-.015,.16);
  }else if(kind==='lobster'){
    ball(group,.84,[0,.48,.1],[.8,.65,1.5],'rust',1);
    for(let i=0;i<4;i++){const s=1-i*.13;ball(group,.57,[0,.35,-.9-i*.34],[s,.65,s*.64],'red',1)}
    for(const side of [-1,1]){
      for(let i=0;i<4;i++)path(group,[[side*.43,.3,.45-i*.43],[side*(1.15+i*.05),.2,.4-i*.6],[side*(1.45+i*.08),.11,.7-i*.6]],.065,'red');
      path(group,[[side*.5,.35,.65],[side*1.22,.65,1.18],[side*1.58,.8,1.65]],.16,'rust');
      ball(group,.55,[side*1.72,.85,1.93],[.68,.6,1.25],'rust',1);box(group,[.12,.23,.57],[side*1.72,.99,2.37],'water');
      path(group,[[side*.25,.68,.92],[side*.5,1.1,1.9],[side*.98,1.22,2.5]],.035,'wood');ball(group,.12,[side*.32,.87,1.05],[1,1,1],'ink',1);
    }
    polygon(group,[[-.65,0],[0,.65],[.65,0],[0,.15]],.13,'rust',[0,.05,-2.26],true).rotation.x=-Math.PI/2;
    group.rotation.y=-.28;wakes(group,4.2,5.8);shadow(group,5.5,7,-.015,.17);
  }else if(kind==='sailing-ship'||kind==='sinking-ship'){
    const vessel=new THREE.Group();group.add(vessel);
    // A faceted hull, complete cream rail, taut sails and rigging.
    polygon(vessel,[[-2,.5],[-1.5,0],[1.35,0],[2,.5],[1.7,.73],[-1.7,.73]],1.15,'wood',[0,.1,-.575]);
    box(vessel,[3.65,.12,1.22],[0,.83,0],'cream',true);box(vessel,[.8,.5,.9],[-1.05,1.07,0],'rust',true);
    beam(vessel,[-.14,.7,0],[-.14,4.45,0],.065,'wood');beam(vessel,[1,.65,0],[1,3.4,0],.045,'wood');beam(vessel,[-1.7,.75,0],[-2.55,1.3,0],.04,'wood');
    polygon(vessel,[[0,0],[1.42,-.15],[1.25,-1.58],[.1,-1.64]],.055,'cream',[-.1,3.97,.06]);
    polygon(vessel,[[0,0],[1.17,-1.7],[0,-1.7]],.04,'white',[1.04,3.16,.02]);
    beam(vessel,[-.2,4.05,0],[-1.85,.85,0],.02,'ink');beam(vessel,[-.2,4.05,0],[1.85,.85,0],.02,'ink');flag(vessel,[-.14,4.35,0],.55);
    for(let x=-1.6;x<1.6;x+=.4)cylinder(vessel,.045,.045,.29,[x,.99,.57],'wood',5);
    if(kind==='sinking-ship'){
      vessel.rotation.z=-.46;vessel.position.set(.1,-.55,0);vessel.scale.setScalar(.9);
      for(let i=0;i<5;i++)ball(group,.12+i*.025,[1.4+i*.22,.12,-.7+Math.sin(i)*.3],[1,.35,1],'cream',0);
    }else vessel.rotation.y=-.28;
    wakes(group,5.8,2.9);shadow(group,6.6,3.7,-.015,.14);
  }else if(kind==='oil-rig'){
    for(const x of [-1.3,1.3])for(const z of [-.8,.8]){cylinder(group,.11,.18,1.45,[x,.75,z],'ochre',6);beam(group,[x,.15,z],[x,1.45,-z],.045,'wood')}
    box(group,[3.5,.3,2.4],[0,1.55,0],'ochre',true);box(group,[1.15,.75,1.1],[-.85,2.05,0],'cream',true);
    for(const z of [-.5,0,.5])box(group,[.04,.28,.2],[-1.44,2.1,z],'dark');
    const top=[.6,4.4,0],base=[[.02,1.75,-.53],[1.18,1.75,-.53],[1.18,1.75,.53],[.02,1.75,.53]];
    for(const point of base)beam(group,point,top,.055,'red');
    for(let i=0;i<4;i++){const y=2+i*.5,s=.52*(1-(y-1.75)/2.65);for(const z of [-s,s])beam(group,[.6-s,y,z],[.6+s,y,z],.035,'rust')}
    beam(group,[-.85,2.4,0],[-.85,3.75,0],.045,'wood');beam(group,[-.85,3.75,0],[-2.45,3.03,0],.055,'wood');beam(group,[-2.45,3.03,0],[-2.45,2.03,0],.025,'ink');
    for(const z of [-1.12,1.12]){beam(group,[-1.7,1.88,z],[1.7,1.88,z],.025,'wood');for(let x=-1.5;x<1.6;x+=.5)beam(group,[x,1.64,z],[x,1.88,z],.02,'wood')}
    wakes(group,4.3,3.1);shadow(group,5.5,4,-.015,.15);
  }else if(kind==='whale'){
    ball(group,1.4,[0,.45,0],[1.82,.62,.8],'teal',2);ball(group,1,[-1.35,.4,.02],[1.12,.66,.9],'teal',1);
    path(group,[[1.3,.35,0],[2.2,.5,0],[2.87,1.03,0]],.27,'teal');
    for(const side of [-1,1]){const fin=ball(group,.65,[2.9,1.14,side*.48],[.75,.18,1.24],'teal',0);fin.rotation.x=side*.35}
    const flipper=ball(group,.67,[-.1,.13,.93],[1.3,.16,.6],'blue',0);flipper.rotation.y=.5;
    ball(group,.125,[-1.53,.7,.87],[1,1,.5],'cream');ball(group,.065,[-1.56,.7,.93],[1,1,.6],'ink',0);
    path(group,[[-2.18,.3,.5],[-1.65,.2,.81],[-.8,.21,.92]],.035,'ink');
    path(group,[[-.93,1.04,0],[-1.01,2,0],[-1.55,2.5,0]],.075,'cream');path(group,[[-.96,1.1,0],[-.7,2.05,0],[-.28,2.39,0]],.075,'cream');
    ball(group,.12,[-1.7,2.56,0],[1,1,1],'cream',0);ball(group,.11,[-.17,2.46,0],[1,1,1],'cream',0);
    group.rotation.y=-.22;wakes(group,6.6,3);shadow(group,8,4,-.015,.18);
  }
  return group;
}

export function addSeaCreatures({THREE,scene,mobile=false}){
  const kit=modelKit(THREE),items=[
    {name:'Jörmungandr',file:'serpent',geo:[mobile?4.2:-.8,66],scale:1.17,label:true},
    {name:'Kraken',file:'kraken',geo:[mobile?3:1.05,60.7],scale:1.12,label:true},
    {name:'The great lobster',file:'lobster',geo:[5.5,57.15],scale:1.08,label:false},
    {name:'A Hanseatic trader',file:'sailing-ship',geo:[-5.2,59.6],scale:1.16,label:false},
    {name:'A ship claimed by the sea',file:'sinking-ship',geo:[-7.8,61.5],scale:1.12,label:false},
    {name:'North Sea oil platform',file:'oil-rig',geo:[3.75,59],scale:1.13,label:false},
    {name:'A northern leviathan',file:'whale',geo:[-8.5,65],scale:1.18,label:false}
  ];
  const objects=items.map(item=>{
    const model=kit.batch(makeCreature(THREE,kit,item.file)),[lon,lat]=item.geo;
    model.position.set((lon-13)*2.2,.035,(60-lat)*4.4);model.scale.setScalar(item.scale*(mobile?.92:1));model.name=item.name;
    model.userData={...model.userData,title:item.name,coordinates:[...item.geo],kind:'sea-model',style:'sculpted-cartographic'};scene.add(model);return model;
  });
  return {count:objects.length,objects,ready:Promise.resolve(objects),decorations:items.map(({name,geo,label},index)=>({name,geo,label,model:objects[index]}))};
}
