// Format conversion only: preserve the generated artwork and its alpha channel.
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const input = process.argv[2];
const output = new URL('../../dist/assets/maritime-engraving-atlas.webp', import.meta.url);
if (!input) throw new Error('Pass the generated PNG path as the first argument.');
const png = await fs.readFile(input);
const pixels = PNG.sync.read(png);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
try {
  const page = await browser.newPage();
  const encoded = await page.evaluate(async data => {
    const image = new Image();
    image.src = data;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', .92).split(',')[1];
  }, `data:image/png;base64,${png.toString('base64')}`);
  const webp = Buffer.from(encoded, 'base64');
  await fs.writeFile(output, webp);
  const regions = [
    [0, 0, 477, 468], [477, 0, 909, 468], [909, 0, 1337, 476], [1337, 0, 1774, 479],
    [0, 468, 478, 887], [478, 468, 911, 887], [911, 479, 1480, 887],
  ];
  const bounds = regions.map(([left, top, right, bottom]) => {
    let x0 = right, y0 = bottom, x1 = left, y1 = top;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (pixels.data[(y * pixels.width + x) * 4 + 3] > 30) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    return [x0, y0, x1 + 1, y1 + 1];
  });
  console.log(JSON.stringify({width:pixels.width,height:pixels.height,sourceBytes:png.length,webpBytes:webp.length,bounds}));
} finally {
  await browser.close();
}
