/**
 * The architectural drawings share their ground with the atlas. These are
 * manuscript marks, not a second road network: a few worn approaches, orchard
 * furrows and quays taken from the very same shoreline as the terrain.
 * All ink is assembled once into three draw calls; there is no frame work.
 */
const settlements = [
  {id:'bergen',geo:[5.32,60.39],shore:2.45,paths:[
    [[-.8,.25],[.7,.68],[1.85,.38],[3.3,-.55]],
    [[.65,.55],[1.2,-.45],[1.13,-1.6],[2.05,-2.65]],
    [[1.8,.4],[2.4,1.25],[3.4,1.6],[4.15,1.4]],
  ],fields:[[2.75,-1.55,.75,-.32],[3.3,1.88,.7,.16]]},
  {id:'oslo',geo:[10.75,59.91],shore:2.6,paths:[
    [[1.1,-1.9],[2.1,-2.38],[3.45,-2.08],[4.85,-2.65]],
    [[3.45,-2.08],[4.7,-1.5],[5.4,-.4],[6.2,.25]],
  ],fields:[[3.2,-3.03,.7,.18],[5.6,-1.65,.55,.45]]},
  {id:'stockholm',geo:[18.07,59.33],shore:2.5,paths:[
    [[-3.7,-1.3],[-2.75,-.45],[-1.2,.18],[.45,.15]],
    [[-2.4,-.35],[-2.05,-1.3],[-2.5,-2.2],[-2.1,-3.1]],
    [[-1.2,.18],[-1.75,1.15],[-2.6,1.8],[-3.4,1.9]],
  ],fields:[[-3.2,-1.9,.67,-.4],[-2.9,2.1,.7,.25]]},
  {id:'copenhagen',geo:[12.57,55.68],shore:2.7,paths:[
    [[-3.7,-.75],[-2.4,-.2],[-.9,.45],[.6,.25]],
    [[-1.9,.05],[-2.25,1.1],[-2,2.3],[-2.65,3.15]],
    [[-2.25,1.1],[-3.2,1.25],[-4.3,.9],[-4.9,1.15]],
  ],fields:[[-3.75,1.9,.7,.18],[-3.1,-1.5,.7,-.2]]},
  {id:'warsaw',geo:[21.01,52.25],shore:0,paths:[
    [[-4.25,.2],[-2.75,-.3],[-1.2,.3],[.25,.28],[2.45,.85]],
    [[-2.15,-.15],[-1.95,-1.4],[-2.6,-2.25],[-2.5,-3.2]],
    [[1.6,.6],[2.2,1.5],[3.15,2.1],[4.3,2.25]],
    [[-.75,.35],[-.5,1.3],[-1.2,2.05],[-2.5,2.5]],
  ],fields:[[-3.45,-1.25,.87,-.25],[3.3,1.5,.88,.38],[-1.4,2.85,.72,-.26]]},
  {id:'windmill',geo:[4.5,52.1],shore:1.9,paths:[
    [[-3.5,.9],[-2.1,.5],[-.65,.25],[.8,.55],[2.65,.3]],
    [[.6,.5],[1.2,1.5],[1,2.7],[1.65,3.6]],
    [[-1.5,.35],[-1.8,-.65],[-2.5,-1.35],[-3.1,-2.1]],
  ],fields:[[2.1,1.65,1.03,-.3],[-2.8,-.5,.8,.2],[-1.7,2.5,.9,.15]]},
  {id:'gdansk',geo:[18.66,54.35],shore:2.3,paths:[
    [[-3.5,.5],[-2.2,.85],[-.9,.4],[.7,.3],[2.6,1.1]],
    [[-1.85,.78],[-1.35,1.7],[-1.7,2.85],[-1.05,3.5]],
    [[1.2,.6],[2.5,1.5],[3.35,1.3],[4.2,1.6]],
  ],fields:[[-2.65,2,.75,-.28],[2.8,2.2,.8,.12]]},
  {id:'london',geo:[-.075,51.505],shore:0,paths:[
    [[-4.25,-.45],[-2.8,-.1],[-1.25,.45],[.2,.25],[2.1,.7],[3.7,.4]],
    [[-2.55,.02],[-2.8,-1.3],[-2.15,-2.2],[-2.5,-3.15]],
    [[1.6,.55],[2.45,1.5],[3.65,1.7],[4.4,2.35]],
    [[-.75,.4],[-1.15,1.5],[-2.1,2.05],[-3.4,2.35]],
  ],fields:[[-3.2,-1.8,.65,-.35],[3.2,2.45,.72,.22]]},
];

export function addSettlementContext({THREE,scene,worldPoint,heightAt,regionAt,mobile=false,landmarks=[]}) {
  const group=new THREE.Group();
  group.name='manuscript-settlement-grounds';
  const approaches=[],quays=[],hatching=[];
  let acceptedSegments=0,rejectedWaterSegments=0,contextCount=0;
  const toGeo=(x,z)=>[x/2.2+13,60-z/4.4];
  const land=(x,z)=>!!regionAt(toGeo(x,z));
  const batches=[approaches,quays,hatching];

  for(const settlement of settlements) {
    const asset={bergen:'bryggen',copenhagen:'nyhavn'}[settlement.id]||settlement.id;
    const model=landmarks.find(object=>object.name===`landmark-${asset}`);
    const anchor=worldPoint(model?.userData.drawingCoordinates||settlement.geo),before=batches.reduce((n,b)=>n+b.length,0);
    // The Opera arrival crosses the forecourt to the west. Keep all new ink on
    // its eastern/northern grounds, even when tracing a real coastline.
    const allowed=(x,z)=>settlement.id!=='oslo'||x-anchor.x>.1||z-anchor.z<-1.85;
    const lift=(x,z,amount=.068)=>{
      const geo=toGeo(x,z);
      return [x,heightAt(...geo)+amount,z];
    };
    const append=(target,a,b,allowBoundary=false)=>{
      const ax=anchor.x+a[0],az=anchor.z+a[1],bx=anchor.x+b[0],bz=anchor.z+b[1];
      if(!allowed(ax,az)||!allowed(bx,bz))return;
      // Test inside each segment, not only the control points. This prevents
      // curves from bridging narrow inlets or winding across a bay.
      for(const t of[0,.25,.5,.75,1]) {
        const x=ax+(bx-ax)*t,z=az+(bz-az)*t;
        if(!allowBoundary&&!land(x,z)){rejectedWaterSegments++;return;}
      }
      target.push(...lift(ax,az),...lift(bx,bz));acceptedSegments++;
    };
    const trace=(points,target,echo=0)=>{
      const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
      const steps=Math.ceil(curve.getLength()*(mobile?7:11));
      let prev=null;
      for(let i=0;i<=steps;i++){
        const t=i/steps,p=curve.getPoint(t),d=curve.getTangent(t);
        // Echoes drift very slightly, like a second pass of a worn quill.
        const offset=echo+Math.sin(t*9.3+points[0][0])*.013;
        const next=[p.x-d.z*offset,p.z+d.x*offset];
        if(prev)append(target,prev,next);
        prev=next;
      }
    };

    settlement.paths.forEach((path,index)=>{
      trace(path,approaches);
      // Short, broken edge strokes imply the path's verge rather than a wide
      // modern road. Only the two inner bends receive a companion stroke.
      if(index<2) {
        const inner=path.slice(1,-1);
        if(inner.length>1)trace(inner,hatching,.11);
      }
    });

    // Rolling, unequal meadow lines let the town's ground marks dissolve into
    // the same landscape hatching used elsewhere on the atlas.
    for(const [cx,cz,width,angle] of settlement.fields) {
      const c=Math.cos(angle),s=Math.sin(angle);
      for(let row=0;row<(mobile?3:4);row++) {
        const length=width*(1-row*.11),points=[];
        for(let i=0;i<=8;i++) {
          const t=i/8-.5,x=t*length*2,z=Math.sin((t+.5)*Math.PI)*.12+row*.11;
          points.push([cx+x*c-z*s,cz+x*s+z*c]);
        }
        trace(points,hatching);
      }
    }

    if(settlement.shore) {
      // March only the small waterfront next to each drawing. Crossing points
      // are bisected against the real mask, so quay ink cannot invent a pier
      // through land or place a waterfront in the middle of the sea.
      const radius=settlement.shore,step=mobile?.3:.23;
      let boundaryIndex=0;
      const crossing=(a,b)=>{
        const aLand=land(anchor.x+a[0],anchor.z+a[1]);
        let lo=0,hi=1;
        for(let i=0;i<6;i++) {
          const t=(lo+hi)*.5,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
          if(land(anchor.x+x,anchor.z+z)===aLand)lo=t;else hi=t;
        }
        const t=(lo+hi)*.5;
        return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      };
      for(let x=-radius;x<radius;x+=step)for(let z=-radius;z<radius;z+=step) {
        if(Math.hypot(x,z)>radius)continue;
        const corners=[[x,z],[x+step,z],[x+step,z+step],[x,z+step]],hits=[];
        for(let e=0;e<4;e++) {
          const a=corners[e],b=corners[(e+1)%4];
          if(land(anchor.x+a[0],anchor.z+a[1])!==land(anchor.x+b[0],anchor.z+b[1]))hits.push(crossing(a,b));
        }
        if(hits.length!==2)continue;
        const [a,b]=hits,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
        if(length<.035)continue;
        let nx=-dz/length,nz=dx/length;
        const mx=(a[0]+b[0])*.5,mz=(a[1]+b[1])*.5;
        if(!land(anchor.x+mx+nx*.09,anchor.z+mz+nz*.09)){nx=-nx;nz=-nz;}
        // Inset the quay on land and let the original coast remain visible.
        const inset=.075;
        const aa=[a[0]+nx*inset,a[1]+nz*inset],bb=[b[0]+nx*inset,b[1]+nz*inset];
        append(quays,aa,bb);
        if(++boundaryIndex%3===0) {
          append(hatching,[mx+nx*.08,mz+nz*.08],[mx+nx*.23,mz+nz*.23]);
        }
      }
    }
    if(batches.reduce((n,b)=>n+b.length,0)>before)contextCount++;
  }

  const makeBatch=(points,color,opacity,name)=>{
    if(!points.length)return;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});
    const ink=new THREE.LineSegments(geometry,material);
    ink.name=name;ink.renderOrder=1;ink.frustumCulled=false;group.add(ink);
  };
  makeBatch(approaches,0x84745a,.24,'worn-manuscript-approaches');
  makeBatch(quays,0x74654c,.34,'quay-penwork');
  makeBatch(hatching,0x84745a,.20,'settlement-ground-hatching');
  scene.add(group);
  const stats={contexts:contextCount,drawCalls:group.children.length,segments:acceptedSegments,rejectedWaterSegments};
  group.userData=stats;
  return{group,...stats};
}
