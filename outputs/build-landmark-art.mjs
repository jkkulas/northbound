// Encode the approved generated PNG, preserving its dimensions and alpha.
// This is file-format conversion only; no visual content is redrawn or resized.
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const source = new URL('./landmark-art-v2.png',import.meta.url);
const target = new URL('../dist/assets/illustrations/landmarks-ink-v2.webp',import.meta.url);
const pngBytes = await fs.readFile(source);
const png = PNG.sync.read(pngBytes);
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page = await browser.newPage();
  const encoded = await page.evaluate(async sourceData => {
    const image = new Image();
    image.src = sourceData;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image,0,0);
    return canvas.toDataURL('image/webp',.93);
  },`data:image/png;base64,${pngBytes.toString('base64')}`);
  if(!encoded.startsWith('data:image/webp;base64,')) throw new Error('WebP encoding unavailable');
  const bytes = Buffer.from(encoded.split(',')[1],'base64');
  await fs.writeFile(target,bytes);
  console.log(JSON.stringify({width:png.width,height:png.height,pngBytes:pngBytes.length,webpBytes:bytes.length,alpha:png.alpha,target:target.pathname}));
} finally {
  await browser.close();
}
