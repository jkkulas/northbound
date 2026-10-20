import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootURL = process.env.NORTHBOUND_TEST_URL || 'http://127.0.0.1:4173/';
const names = { en: 'English', pl: 'Polski', no: 'Norsk' };
const issues = [];
const contexts = [];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

// Reproduce Live Server opening dist/index.html inside the workspace directory.
const dist = fileURLToPath(new URL('./dist/', import.meta.url));
const prefix = '/northbound/dist/';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
const nestedServer = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { res.writeHead(404).end('Outside test site'); return; }
    let file = path.resolve(dist, pathname.slice(prefix.length));
    if (file !== path.resolve(dist) && !file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolve => nestedServer.listen(0, '127.0.0.1', resolve));
const nestedURL = `http://127.0.0.1:${nestedServer.address().port}${prefix}`;

async function newPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => issues.push(`Runtime: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') issues.push(`Console: ${message.text()} (${message.location().url || page.url()})`); });
  page.on('response', response => { if (response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`); });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') issues.push(`Request: ${request.url()} (${request.failure()?.errorText})`);
  });
  return page;
}

async function openMap(page, url = rootURL, settle = true) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#terrain-canvas')?.dataset.renderer === 'webgl', null, { timeout: 30000 });
  assert.equal(await page.locator('#terrain-canvas').isVisible(), true, 'WebGL canvas is visible');
  assert.equal(await page.locator('#map-loading').isVisible(), false, 'Loading indicator clears');
  assert.equal(await page.locator('.map-label[data-lang]').count(), 3, 'All three geographic language labels exist');
  await page.evaluate(() => document.fonts.ready);
  if (settle) await page.waitForTimeout(2300); // Finish the initial camera movement before geographic clicks.
}

async function destination(page, lang, base = rootURL) {
  await page.waitForURL(new URL(`${lang}/`, base).href, { timeout: 25000 });
  assert.equal(await page.locator('h1').textContent(), names[lang]);
}

async function clickLand(page, coordinates, lang) {
  const point = await page.evaluate(async coordinates => {
    const appURL = new URL('./assets/app.js', document.baseURI).href;
    return (await import(appURL)).projectToScreen(...coordinates);
  }, coordinates);
  assert.ok(point && Number.isFinite(point.x) && Number.isFinite(point.y), 'Geographic point projects onto the scene');
  assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, point), 'terrain-canvas', 'Geographic click reaches the canvas');
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction(lang => document.querySelector(`.language-option[data-lang="${lang}"]`)?.classList.contains('is-active'), lang);
  assert.match(await page.locator('#map-tooltip').textContent(), new RegExp(names[lang]));
  await page.evaluate(() => {
    const phases = [];
    sessionStorage.setItem('northbound-qa-phases', '[]');
    new MutationObserver(() => {
      const text = document.querySelector('#journey-text').textContent;
      if (phases.at(-1) !== text) phases.push(text);
      sessionStorage.setItem('northbound-qa-phases', JSON.stringify(phases));
    }).observe(document.querySelector('#journey-text'), { childList: true, characterData: true, subtree: true });
  });
  await page.mouse.click(point.x, point.y);
  await page.locator('#journey-status.is-visible').waitFor();
}

try {
  const page = await newPage();
  await openMap(page);
  assert.equal(await page.locator('#terrain-canvas').getAttribute('data-quality'), 'desktop');
  assert.equal(await page.locator('#view-toggle').getAttribute('aria-pressed'), 'false');
  await page.locator('#view-toggle').click();
  assert.equal(await page.locator('#view-toggle').getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(1200);
  await page.locator('#view-toggle').click();
  assert.equal(await page.locator('#view-toggle').getAttribute('aria-pressed'), 'false');
  await page.waitForTimeout(1200);
  console.log('PASS WebGL scene, geographic labels, and perspective toggle');

  // Complete journeys start on real terrain rather than UI language labels.
  for (const [lang, coordinates] of [['en', [9, 53]], ['pl', [20.8, 52]], ['no', [7.5, 61.5]]]) {
    await openMap(page);
    await clickLand(page, coordinates, lang);
    await destination(page, lang);
    const phases = await page.evaluate(() => JSON.parse(sessionStorage.getItem('northbound-qa-phases')));
    assert.match(phases[0], lang === 'no' ? /Driving to H\u00f8vik/ : /Flying to Sandefjord/);
    if (lang !== 'no') assert.ok(phases.includes('Landed. Next stop, Oslo.'), 'Flight transitions to the Oslo drive');
    assert.equal(phases.at(-1), `${names[lang]}. Welcome.`, 'The full journey reaches its arrival state');
    console.log(`PASS ${names[lang]} terrain selection, full journey, and destination`);
  }

  await openMap(page, rootURL, false);
  await page.locator('.language-option[data-lang="pl"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#journey-status.is-visible').waitFor();
  await page.locator('#skip').click();
  await destination(page, 'pl');
  console.log('PASS keyboard language selection and skip');

  // Mobile geometry quality is selected when the module first loads.
  const mobile = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await openMap(mobile);
  assert.equal(await mobile.locator('#terrain-canvas').getAttribute('data-quality'), 'mobile');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true, 'Mobile viewport has no page overflow');
  await mobile.locator('.language-option[data-lang="no"]').tap();
  await mobile.locator('#journey-status.is-visible').waitFor();
  await destination(mobile, 'no');
  console.log('PASS fresh mobile scene, viewport layout, touch selection, and journey');

  const reduced = await newPage({ reducedMotion: 'reduce' });
  await openMap(reduced, rootURL, false);
  for (const lang of ['en', 'pl', 'no']) {
    if (lang !== 'en') await openMap(reduced, rootURL, false);
    const started = Date.now();
    await reduced.locator(`.language-option[data-lang="${lang}"]`).click();
    await destination(reduced, lang);
    assert.ok(Date.now() - started < 2500, 'Reduced motion bypasses the animated journey');
  }
  console.log('PASS reduced-motion direct navigation for all languages');

  const nested = await newPage({ reducedMotion: 'reduce' });
  await openMap(nested, `${nestedURL}index.html`, false);
  const home = await nested.locator('.wordmark').getAttribute('href');
  assert.equal(new URL(home, nested.url()).href, nestedURL, 'Home remains inside the subdirectory');
  for (const lang of ['en', 'pl', 'no']) {
    if (lang !== 'en') await openMap(nested, nestedURL, false);
    await nested.locator(`.language-option[data-lang="${lang}"]`).click();
    await destination(nested, lang, nestedURL);
  }
  console.log('PASS Live Server nested index.html assets, directory URL, home link, and all destinations');

  assert.deepEqual(issues, [], 'No browser runtime errors, console errors, or failed resources');
  console.log('PASS no browser errors or failed resource requests');
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  await new Promise(resolve => nestedServer.close(resolve));
}
