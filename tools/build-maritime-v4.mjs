// Delivery packing and format conversion; original generated subjects stay intact.
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const keys=['serpent_attack','kraken_attack','merchant_ship','schooner_ship','offshore_rig','northern_whale','great_lobster'];
const sources=await Promise.all(keys.map(async key=>({key,url:'data:image/png;base64,'+(await fs.readFile(`outputs/maritime-v4/${key}.png`)).toString('base64')})));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();
 const result=await page.evaluate(async sources=>{
  const cellW=768,cellH=576,gutter=10,atlas=document.createElement('canvas');atlas.width=cellW*4;atlas.height=cellH*2;
  const ctx=atlas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';const art={};
  for(const[index,{key,url}]of sources.entries()){
   const img=new Image();img.src=url;await img.decode();
   const scale=Math.min((cellW-gutter*2)/img.width,(cellH-gutter*2)/img.height),w=Math.round(img.width*scale),h=Math.round(img.height*scale);
   const x=index%4*cellW+Math.round((cellW-w)/2),y=Math.floor(index/4)*cellH+Math.round((cellH-h)/2);ctx.drawImage(img,x,y,w,h);
   const data=ctx.getImageData(x,y,w,h).data;let l=w,t=h,r=0,b=0;
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(data[(yy*w+xx)*4+3]>=64){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}
   art[key]={rect:[Math.max(x,x+l-2),Math.max(y,y+t-2),Math.min(x+w,x+r+3),Math.min(y+h,y+b+3)],sourceSize:[img.width,img.height]};
  }
  const mobile=document.createElement('canvas');mobile.width=atlas.width/2;mobile.height=atlas.height/2;const small=mobile.getContext('2d');small.imageSmoothingQuality='high';small.drawImage(atlas,0,0,mobile.width,mobile.height);
  return {art,width:atlas.width,height:atlas.height,desktop:atlas.toDataURL('image/webp',.93).split(',')[1],mobile:mobile.toDataURL('image/webp',.87).split(',')[1]};
 },sources);
 await fs.writeFile('dist/assets/maritime-illustrated-v4.webp',Buffer.from(result.desktop,'base64'));
 await fs.writeFile('dist/assets/maritime-illustrated-v4-mobile.webp',Buffer.from(result.mobile,'base64'));
 await fs.writeFile('dist/assets/maritime-illustrated-v4.json',JSON.stringify({width:result.width,height:result.height,art:result.art},null,2));
 console.log(JSON.stringify({width:result.width,height:result.height,desktopBytes:Buffer.from(result.desktop,'base64').length,mobileBytes:Buffer.from(result.mobile,'base64').length,art:result.art},null,2));
}finally{await browser.close();}
