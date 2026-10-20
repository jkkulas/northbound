import { modelKit } from './cartographic-models.js';

// Footprint in map-world units relative to the city anchor. The west forecourt
// remains empty for the journey car; all solid Opera geometry lies to the east.
export const OPERA_FOOTPRINT=Object.freeze({coordinates:[10.75,59.91],minX:.1,maxX:4.9,minZ:-1.55,maxZ:1.65});
const landmarks=[
  {title:'Bergen · Bryggen',coordinates:[5.32,60.39],asset:'bryggen',scale:1.08},
  {title:'Oslo · Opera House',coordinates:[10.75,59.91],asset:'oslo',scale:1},
  {title:'Stockholm · City Hall',coordinates:[18.07,59.33],asset:'stockholm',scale:1.1},
  {title:'Copenhagen · Nyhavn',coordinates:[12.57,55.68],asset:'nyhavn',scale:1.12},
  {title:'Warsaw · Royal Castle',coordinates:[21.01,52.25],asset:'warsaw',scale:1.1},
  {title:'Holland · Windmill',coordinates:[4.5,52.1],asset:'windmill',scale:1.12},
  {title:'Gdańsk · Żuraw',coordinates:[18.66,54.35],asset:'gdansk',scale:1.1},
  {title:'London · Tower Bridge',coordinates:[-.075,51.505],asset:'london',scale:1.12}
];

function makeLandmark(THREE,kit,kind){
  const group=new THREE.Group(),{box,cylinder,beam,ball,polygon,house,roof,flag,shadow,line}=kit;
  if(kind==='bryggen'||kind==='nyhavn'){
    const colors=kind==='bryggen'?['rust','ochre','cream','red','ochre']:['ochre','red','sage','cream','rust'];
    box(group,[5.45,.17,1.5],[0,.08,0],'stone',true);
    colors.forEach((color,i)=>house(group,(i-2)*1.02,.91,1.7+[0,.3,-.1,.4,.15][i],1.05,color));
    for(let i=0;i<7;i++)cylinder(group,.055,.065,.44,[-2.7+i*.9,.04,1],'wood',6);
    shadow(group,7,3);
  }else if(kind==='oslo'){
    // Solid sloping marble roofs and a recessed glass foyer facing the water.
    const wedge=polygon(group,[[.25,.08],[4.85,.08],[4.85,1.38],[3.15,1.38]],2.85,'white',[0,0,-1.425]);
    box(group,[1.6,.83,1.83],[3.5,.54,-.16],'teal',true);box(group,[1.78,.18,2.02],[3.5,1.05,-.16],'cream',true);
    box(group,[1.2,.7,.72],[3.42,1.55,-.25],'white',true);
    for(let i=0;i<5;i++)beam(group,[2.78+i*.3,.15,.78],[2.78+i*.3,.98,.78],.022,'cream');
    for(let i=1;i<5;i++)line(group,[[.25+i*.63,.09,-1.43],[3.15+i*.26,1.39,-1.43]]);
    box(group,[4.8,.1,.13],[2.5,.06,1.49],'stone');
    for(let x=1;x<4.8;x+=1.1)cylinder(group,.045,.05,.3,[x,.15,1.6],'wood',6);
    const contact=shadow(group,6.6,4);contact.position.x=2.6;wedge.userData.walkableRoof=true;
  }else if(kind==='stockholm'){
    box(group,[4.6,1.55,1.6],[0,.8,0],'rust',true);roof(group,4.85,.5,1.85,[0,1.57,0],'red');
    box(group,[1.15,3.5,1.15],[-1.75,1.77,0],'rust',true);box(group,[1.28,.25,1.28],[-1.75,3.45,0],'cream',true);
    cylinder(group,.34,.46,.55,[-1.75,3.85,0],'dark',8,true);cylinder(group,0,.42,.75,[-1.75,4.45,0],'dark',8,true);
    beam(group,[-1.75,4.8,0],[-1.75,5.05,0],.035,'gold');
    for(let i=0;i<3;i++)ball(group,.12,[-1.93+i*.18,5.08,0],[1,1,1],'gold',0);
    for(let x=-.8;x<2.2;x+=.5){box(group,[.2,.58,.03],[x,.95,.82],'cream');box(group,[.12,.45,.04],[x,.95,.84],'dark')}
    box(group,[5,.12,2.15],[0,.05,0],'stone');shadow(group,7,3.5);
  }else if(kind==='warsaw'){
    box(group,[5.1,1.55,1.65],[0,.8,0],'rust',true);roof(group,5.3,.68,1.85,[0,1.57,0]);
    box(group,[1.03,2.9,1.3],[0,1.48,.1],'rust',true);box(group,[1.16,.25,1.43],[0,2.88,.1],'cream',true);
    cylinder(group,.3,.47,.62,[0,3.25,.1],'dark',8);cylinder(group,0,.34,.76,[0,3.93,.1],'dark',8,true);flag(group,[0,4.3,.1],.6);
    for(let x=-2.1;x<=2.1;x+=.6)box(group,[.17,.4,.03],[x,1.02,.84],'cream');
    const clock=cylinder(group,.19,.19,.04,[0,2.5,.78],'cream',20);clock.rotation.x=Math.PI/2;
    beam(group,[0,2.5,.82],[0,2.62,.82],.018,'ink');beam(group,[0,2.5,.82],[.09,2.46,.82],.018,'ink');
    box(group,[5.4,.14,2.1],[0,.05,0],'stone');shadow(group,7,3.6);
  }else if(kind==='windmill'){
    cylinder(group,.6,1.03,2.4,[0,1.25,0],'cream',8,true);cylinder(group,.72,.85,.85,[0,2.83,0],'wood',8,true);cylinder(group,0,.9,.9,[0,3.68,0],'red',8,true);
    const sails=new THREE.Group();sails.position.set(0,2.9,.96);sails.rotation.z=.22;group.add(sails);
    for(let i=0;i<4;i++){
      const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2;sails.add(arm);box(arm,[.09,2.5,.09],[0,1,0],'wood',true);box(arm,[.47,1.45,.055],[.2,1.2,.04],'cream',true);
      for(let j=0;j<5;j++)box(arm,[.49,.035,.04],[.2,.62+j*.28,.08],'wood');
    }
    ball(group,.19,[0,2.9,1.04],[1,1,.5],'gold',1);box(group,[.38,.7,.05],[0,.4,1.01],'wood');shadow(group,5,4);
    for(let i=0;i<3;i++)ball(group,.3,[-1.1-i*.35,.2,.3-i*.4],[1,.65,1],'sage',0);
  }else if(kind==='gdansk'){
    cylinder(group,.55,.67,2.7,[-.94,1.4,0],'rust',10,true);cylinder(group,.55,.67,2.7,[.94,1.4,0],'rust',10,true);
    cylinder(group,0,.72,.95,[-.94,3.19,0],'red',10,true);cylinder(group,0,.72,.95,[.94,3.19,0],'red',10,true);
    box(group,[1.9,1.7,1.5],[0,2.5,.13],'wood',true);roof(group,2.15,.77,1.7,[0,3.36,.13],'dark');box(group,[1.3,.6,1.7],[0,1.29,.3],'wood',true);
    for(let x=-.6;x<=.6;x+=.4)beam(group,[x,1.03,1.16],[x,3.17,1.16],.04,'ink');
    beam(group,[-.6,1.55,1.17],[.6,3.13,1.17],.04,'ink');beam(group,[.6,1.55,1.17],[-.6,3.13,1.17],.04,'ink');
    beam(group,[0,2.1,1.14],[0,1.1,1.85],.045,'wood');box(group,[.48,.45,.45],[0,.72,1.85],'ochre',true);
    box(group,[3.8,.15,2.4],[0,.04,.12],'stone');shadow(group,5.5,4);
  }else if(kind==='london'){
    for(const x of [-1.85,1.85]){
      box(group,[1.05,2.8,1.2],[x,1.55,0],'stone',true);box(group,[1.32,.27,1.45],[x,2.85,0],'cream',true);
      for(const dx of [-.4,.4])for(const z of [-.43,.43]){box(group,[.28,.8,.3],[x+dx,3.17,z],'cream',true);cylinder(group,0,.28,.62,[x+dx,3.86,z],'dark',4,true)}
      box(group,[.25,1.25,.035],[x,1.92,.62],'dark');
    }
    box(group,[7.3,.22,1.16],[0,.49,0],'cream',true);box(group,[3.8,.22,.73],[0,2.85,0],'teal',true);
    for(const z of [-.52,.52])for(const side of [-1,1]){
      const points=[];for(let i=0;i<=14;i++){const t=i/14;points.push([side*(1.85+t*1.8),2.9-2.2*t+.38*Math.sin(t*Math.PI),z])}line(group,points);
      for(let i=1;i<6;i++){const t=i/6,x=side*(1.85+t*1.8),h=2.9-2.2*t+.38*Math.sin(t*Math.PI);beam(group,[x,.63,z],[x,h,z],.025,'teal')}
    }
    for(let i=-3;i<=3;i++)box(group,[.055,.27,.055],[i,.76,.55],'teal');flag(group,[-1.85,4.13,0],.65);shadow(group,9,3.8);
  }
  return group;
}

export function addLandmarks({THREE,scene,worldPoint,mobile=false}){
  const kit=modelKit(THREE),objects=landmarks.map(({title,coordinates,asset,scale})=>{
    const model=kit.batch(makeLandmark(THREE,kit,asset));model.name=`landmark-${asset}`;model.position.copy(worldPoint(coordinates,.035));
    model.scale.setScalar(scale*(mobile&&asset!=='oslo'?.94:1));
    model.userData={...model.userData,title,coordinates:[...coordinates],kind:'landmark',style:'sculpted-cartographic',...(asset==='oslo'?{footprint:OPERA_FOOTPRINT}:{})};scene.add(model);return model;
  });
  return {count:objects.length,objects,ready:Promise.resolve(objects)};
}
