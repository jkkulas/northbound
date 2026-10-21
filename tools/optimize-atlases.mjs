// Build smaller delivery variants of the approved artwork; composition/alpha
// remain unchanged. Run only when the full-resolution atlas assets change.
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const atlases=['dist/assets/maritime-engraving-atlas-v3.webp','dist/assets/illustrations/landmarks-ink-v2.webp'];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page=await browser.newPage();
  for(const path of atlases) {
    const source=await fs.readFile(path);
    const encoded=await page.evaluate(async data=>{
      const image=new Image();image.src=data;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=887;canvas.height=444;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/webp',.84).split(',')[1];
    },`data:image/webp;base64,${source.toString('base64')}`);
    const target=path.replace('.webp','-mobile.webp'),bytes=Buffer.from(encoded,'base64');
    await fs.writeFile(target,bytes);console.log(`${target}: ${bytes.length} bytes`);
  }
} finally {await browser.close()}
