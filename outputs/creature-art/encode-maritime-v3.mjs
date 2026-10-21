// Format-only delivery encoding of the builtin image_gen background extraction.
// Preserve source alpha and composition; no color or content processing.
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';

const source = await fs.readFile('outputs/creature-art/maritime-engraving-atlas-v3.png');
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1774,height:950},deviceScaleFactor:1});
  const results=await page.evaluate(async data=>{
    const picture=new Image();picture.src=data;await picture.decode();
    const outputs=[];
    for(const [width,height,quality,suffix] of [[1774,887,.92,''],[887,444,.84,'-mobile']]){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(picture,0,0,width,height);
      outputs.push({suffix,width,height,base64:canvas.toDataURL('image/webp',quality).split(',')[1]});
    }
    document.body.style.cssText='margin:0;background:#d8ddcc;';
    picture.style.cssText='width:1774px;height:887px;display:block';document.body.append(picture);
    return outputs;
  },`data:image/png;base64,${source.toString('base64')}`);
  for(const item of results){
    const target=`dist/assets/maritime-engraving-atlas-v3${item.suffix}.webp`;
    const bytes=Buffer.from(item.base64,'base64');await fs.writeFile(target,bytes);
    console.log(`${target}: ${item.width}x${item.height}, ${bytes.length} bytes`);
  }
  await page.screenshot({path:'outputs/creature-art/maritime-v3-ground-preview.png',clip:{x:0,y:0,width:1774,height:887}});
  await page.screenshot({path:'outputs/creature-art/maritime-v3-serpent-closeup.png',clip:{x:0,y:0,width:477,height:467}});
  await page.screenshot({path:'outputs/creature-art/maritime-v3-whale-closeup.png',clip:{x:932,y:492,width:519,height:376}});
}finally{await browser.close();}
