// Delivery-only crop, resize and atlas packing of the original painted PNGs.
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const original=['bryggen','oslo','stockholm','nyhavn','warsaw','windmill','gdansk','london','borgund','brandenburg','cologne','edinburgh','fir','oak','village','lighthouse','sea_rocks','plane','car'];
const files=[...original.map(key=>({key,path:`outputs/paper-v5/${key}.png`})),...['iceland_volcano','cottage'].map(key=>({key,path:`outputs/paper-v6/${key}.png`}))];
const sources=await Promise.all(files.map(async item=>({...item,url:'data:image/png;base64,'+(await fs.readFile(item.path)).toString('base64')})));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();
 const result=await page.evaluate(async sources=>{
  const cell=640,gutter=20,atlas=document.createElement('canvas');atlas.width=cell*4;atlas.height=cell*Math.ceil(sources.length/4);
  const ctx=atlas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';const art={};
  for(const[index,{key,url,path}]of sources.entries()){
   const img=new Image();img.src=url;await img.decode();
   const source=document.createElement('canvas');source.width=img.width;source.height=img.height;
   const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0);
   const pixels=sc.getImageData(0,0,img.width,img.height).data;let l=img.width,t=img.height,r=0,b=0;
   for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(pixels[(y*img.width+x)*4+3]>=6){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   if(r<=l||b<=t)throw new Error('Empty transparent artwork: '+key);
   l=Math.max(0,l-6);t=Math.max(0,t-6);r=Math.min(img.width,r+7);b=Math.min(img.height,b+7);
   const scale=Math.min((cell-gutter*2)/(r-l),(cell-gutter*2)/(b-t)),w=Math.round((r-l)*scale),h=Math.round((b-t)*scale);
   const x=index%4*cell+Math.round((cell-w)/2),y=Math.floor(index/4)*cell+Math.round((cell-h)/2);
   ctx.drawImage(img,l,t,r-l,b-t,x,y,w,h);
   art[key]={rect:[x,y,x+w,y+h],sourceSize:[img.width,img.height],sourceBounds:[l,t,r,b],source:path};
  }
  const mobile=document.createElement('canvas');mobile.width=atlas.width/2;mobile.height=atlas.height/2;
  const small=mobile.getContext('2d');small.imageSmoothingQuality='high';small.drawImage(atlas,0,0,mobile.width,mobile.height);
  return {art,width:atlas.width,height:atlas.height,desktop:atlas.toDataURL('image/webp',.95).split(',')[1],mobile:mobile.toDataURL('image/webp',.90).split(',')[1]};
 },sources);
 await fs.writeFile('dist/assets/paper-atlas-v6.webp',Buffer.from(result.desktop,'base64'));
 await fs.writeFile('dist/assets/paper-atlas-v6-mobile.webp',Buffer.from(result.mobile,'base64'));
 await fs.writeFile('dist/assets/paper-atlas-v6.json',JSON.stringify({width:result.width,height:result.height,art:result.art},null,2));
 console.log(JSON.stringify({width:result.width,height:result.height,assets:Object.keys(result.art).length,desktopBytes:Buffer.from(result.desktop,'base64').length,mobileBytes:Buffer.from(result.mobile,'base64').length},null,2));
}finally{await browser.close();}
