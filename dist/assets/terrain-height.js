// Shared physical relief for rendering, journeys and geographic audits.
export const LAND_HEIGHT=.34;
export const RELIEF_SCALE=3.65;
export const SEA_HEIGHT=-.05;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(v,a,b)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function rawTerrainHeight(elevations,lon,lat){
 if(!elevations)return LAND_HEIGHT;
 const x=clamp((lon+12)/50*400,0,399.999),y=clamp((73-lat)/26*400,0,399.999),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
 const a=elevations[j*401+i]*(1-fx)+elevations[j*401+i+1]*fx,b=elevations[(j+1)*401+i]*(1-fx)+elevations[(j+1)*401+i+1]*fx;
 const feather=smooth(lon,-12,-9)*(1-smooth(lon,35,38))*smooth(lat,47,49)*(1-smooth(lat,71,73));
 return LAND_HEIGHT+Math.max(0,a*(1-fy)+b*fy)/1000*RELIEF_SCALE*feather;
}

// Surveyed buildings are exaggerated at atlas scale. Their immediate building
// ground is a shallow terrace in the same relief, rather than a tall display
// pedestal under an otherwise untouched, very coarse mountain DEM. Only these
// footprints and a narrow, continuously eased shoulder change the height field.
export const ARCHITECTURAL_TERRACES=Object.freeze([
 // The coarse DEM mixes Bergen's low wharf with its steep hillside. Keep
 // the waterfront at a low coastal bank instead of a tall masonry pedestal.
 {id:'bryggen',coordinates:[5.32309,60.39721],box:[-1.32,2.48,-.78,.91],blend:.55,height:.44},
 {id:'oslo',coordinates:[10.7526806,59.9075238],box:[1.15,4.11,-1.62,1.64],blend:.45},
 {id:'borgund',coordinates:[7.8122905,61.0472015],box:[-.93,.93,-1.03,1.17],blend:.50},
]);
export function sampleTerrainHeight(elevations,lon,lat){
 let height=rawTerrainHeight(elevations,lon,lat);
 if(!elevations)return height;
 for(const site of ARCHITECTURAL_TERRACES){
  const x=(lon-site.coordinates[0])*2.2,z=(site.coordinates[1]-lat)*4.4,b=site.box;
  const dx=Math.max(b[0]-x,0,x-b[1]),dz=Math.max(b[2]-z,0,z-b[3]),distance=Math.hypot(dx,dz);
  if(distance>=site.blend)continue;
  const target=site.height??rawTerrainHeight(elevations,...site.coordinates),weight=1-smooth(distance,0,site.blend);
  height=height*(1-weight)+target*weight;
 }
 return height;
}
