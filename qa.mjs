import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const rootURL = process.env.NORTHBOUND_TEST_URL || 'http://127.0.0.1:4173/';
const focus = process.env.NORTHBOUND_QA_FOCUS || 'all';
const names = { en: 'English', pl: 'Polski', no: 'Norsk' };
const outputDirectory = fileURLToPath(new URL('./outputs/', import.meta.url));
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
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf' };
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

async function newPage(options = {}, expectedConsoleErrors = []) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  page.on('pageerror', error => issues.push(`Runtime: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !expectedConsoleErrors.some(pattern => pattern.test(message.text()))) {
      issues.push(`Console: ${message.text()} (${message.location().url || page.url()})`);
    }
  });
  page.on('response', response => { if (response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`); });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') issues.push(`Request: ${request.url()} (${request.failure()?.errorText})`);
  });
  return page;
}

async function openMap(page, url = rootURL, settle = true) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#terrain-canvas')?.dataset.renderer === 'webgl', null, { timeout: 30000 });
  await page.evaluate(async () => { window.__qaInspectScene = (await import(new URL('./assets/app.js', document.baseURI).href)).inspectScene; });
  assert.equal(await page.locator('#terrain-canvas').isVisible(), true, 'WebGL canvas is visible');
  assert.equal(await page.locator('#map-loading').isVisible(), false, 'Loading indicator clears');
  assert.equal(await page.locator('.map-label[data-lang]').count(), 3, 'All three geographic language labels exist');
  assert.equal(await page.locator('#terrain-canvas').getAttribute('data-landmarks'), '9', 'All nine dimensional landmarks, including Borgund, are ready');
  assert.equal(await page.locator('#terrain-canvas').getAttribute('data-creatures'), '17', 'All seventeen new maritime illustrations are ready');
  assert.equal(await page.locator('#terrain-canvas').getAttribute('data-artwork'), 'illuminated-atlas', 'The map uses ink-and-watercolor artwork');
  assert.ok(await page.locator('.creature-label').count() >= 2, 'The folklore illustrations have names');
  for (const name of ['J\u00f6rmungandr', 'Kraken']) {
    assert.equal(await page.locator('.creature-label').filter({ hasText: name }).count(), 1, `${name} has a label`);
  }
  assert.equal(await page.locator('.city-label').count(), 0, 'City names and dot markers are removed');
  assert.equal(await page.locator('#map-tooltip').count(), 0, 'The hover tooltip is removed');
  assert.equal(await page.locator('#view-toggle').count(), 0, 'The perspective control is removed');
  await page.evaluate(() => document.fonts.ready);
  if (settle) await page.waitForTimeout(2300); // Finish the initial camera movement before geographic clicks.
}

async function destination(page, lang, base = rootURL) {
  await page.waitForURL(new URL(`${lang}/`, base).href, { timeout: 25000 });
  assert.equal(await page.locator('h1').textContent(), names[lang]);
}

async function inspect(page) {
  return page.evaluate(() => window.__qaInspectScene());
}

const cameraDistance = state => Math.hypot(...state.camera.position.map((value, index) => value - state.camera.target[index]));

async function hoverLand(page, coordinates, lang) {
  const point = await page.evaluate(async coordinates => {
    const appURL = new URL('./assets/app.js', document.baseURI).href;
    return (await import(appURL)).projectToScreen(...coordinates);
  }, coordinates);
  assert.ok(point && Number.isFinite(point.x) && Number.isFinite(point.y), 'Geographic point projects onto the scene');
  const target = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return { id: el?.id, tag: el?.tagName, className: el?.className };
  }, point);
  assert.equal(target.id, 'terrain-canvas', `Geographic click ${coordinates} reaches the canvas (${JSON.stringify(target)})`);
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction(lang => document.querySelector(`.language-option[data-lang="${lang}"]`)?.classList.contains('is-active'), lang);
  assert.equal(await page.locator('#map-tooltip').count(), 0, 'Hover highlights the country without creating a tooltip');
  return point;
}

async function clickLand(page, coordinates, lang) {
  const point = await hoverLand(page, coordinates, lang);
  await page.evaluate(() => {
    const phases = [];
    sessionStorage.setItem('northbound-qa-phases', '[]');
    sessionStorage.setItem('northbound-qa-motion', '[]');
    sessionStorage.setItem('northbound-qa-vehicles', '{}');
    new MutationObserver(() => {
      const text = document.querySelector('#journey-text').textContent;
      if (phases.at(-1) !== text) phases.push(text);
      sessionStorage.setItem('northbound-qa-phases', JSON.stringify(phases));
    }).observe(document.querySelector('#journey-text'), { childList: true, characterData: true, subtree: true });
  });
  await page.evaluate(async () => {
    const { inspectScene } = await import(new URL('./assets/app.js', document.baseURI).href);
    const samples = [];
    const vehicles = {};
    let started;
    function capture(now) {
      if (document.body.classList.contains('is-traveling')) {
        started ??= now;
        const state = inspectScene();
        const vehicle = state.journey.vehicle;
        if (vehicle.visible && !vehicles[vehicle.type]) {
          vehicles[vehicle.type] = state;
          sessionStorage.setItem('northbound-qa-vehicles', JSON.stringify(vehicles));
        }
        samples.push({ elapsed: now - started, phase: state.journey.phase, fade: state.fadeOpacity, distance: Math.hypot(...state.camera.position.map((value, index) => value - state.camera.target[index])) });
        sessionStorage.setItem('northbound-qa-motion', JSON.stringify(samples));
      }
      if (!started || now - started < 15000) requestAnimationFrame(capture);
    }
    requestAnimationFrame(capture);
  });
  await page.mouse.click(point.x, point.y);
}

function assertGoldenHighlight(beforeBuffer, afterBuffer) {
  const before = PNG.sync.read(beforeBuffer), after = PNG.sync.read(afterBuffer);
  assert.equal(before.width, after.width);
  assert.equal(before.height, after.height);
  let warmed = 0;
  for (let i = 0; i < after.data.length; i += 4) {
    const [r, g, b] = after.data.subarray(i, i + 3);
    const redIncrease = r - before.data[i], greenIncrease = g - before.data[i + 1];
    if (r > b + 22 && g > b + 12 && redIncrease > 10 && greenIncrease > 5) warmed++;
  }
  assert.ok(warmed > 1000, `Hover produces a visible golden highlight (${warmed} warmed pixels)`);
}

function assertCarRoute(state) {
  const journey = state.journey;
  assert.ok(journey.routeSamples.length > 20, 'The road has enough samples to assess terrain clearance');
  for (const sample of journey.routeSamples) {
    assert.ok(sample.position.every(Number.isFinite) && Number.isFinite(sample.terrainHeight), 'Road samples contain finite coordinates and terrain heights');
    assert.ok(sample.position[1] >= sample.terrainHeight, 'The road stays above the terrain');
  }
  assert.ok(journey.carClearance >= 0, `The whole car clears the terrain (${journey.carClearance})`);
  assert.ok(journey.operaClearance > .15, `The road and parked car clear the opera (${journey.operaClearance})`);
  const steepest = journey.routeSamples.slice(1).reduce((maximum, sample, index) => {
    const previous = journey.routeSamples[index];
    const distance = Math.hypot(sample.position[0] - previous.position[0], sample.position[2] - previous.position[2]);
    return Math.max(maximum, distance > .001 ? Math.abs(sample.terrainHeight - previous.terrainHeight) / distance : 0);
  }, 0);
  const waterFraction = journey.routeSamples.filter(sample => sample.region === 0).length / journey.routeSamples.length;
  console.log(`ROUTE clearance=${journey.carClearance.toFixed(3)}, opera=${journey.operaClearance.toFixed(3)}, steepest=${steepest.toFixed(2)}, water=${(waterFraction * 100).toFixed(1)}%`);
}

try {
  await fs.mkdir(outputDirectory, { recursive: true });
  if (focus !== 'early') {
  const page = await newPage({ viewport: { width: 1896, height: 942 } });
  if (focus !== 'remaining') {
  await openMap(page);
  assert.equal(await page.locator('#terrain-canvas').getAttribute('data-quality'), 'desktop');
  const overview = await inspect(page);
  const architecture = await page.evaluate(() => window.__qaInspectScene({ artwork: true }).landmarkArtwork);
  assert.equal(architecture.length, 9, 'The inspect contract reports nine dimensional landmark models');
  assert.ok(architecture.some(model => model.name === 'landmark-borgund'), 'Borgund Stave Church is modeled');
  for (const model of architecture) {
    assert.equal(model.userData.dimensional, true, `${model.name} is a dimensional model`);
    assert.equal(model.userData.geolocationVerified, true, `${model.name} has a verified real building anchor`);
    assert.ok(model.meshes.length > 0 && model.meshes.every(mesh => mesh.opaque && mesh.depthWrite), `${model.name} uses opaque solid geometry`);
    assert.ok(model.bounds.max[1] > model.bounds.min[1] + .5, `${model.name} has visible vertical relief`);
  }
  const offset = overview.camera.position.map((value, index) => value - overview.camera.target[index]);
  assert.ok(Math.hypot(offset[0], offset[2]) > Math.abs(offset[1]), 'The overview is an aerial oblique view, tilted beyond 45 degrees from vertical');
  assert.ok(overview.terrainMaxHeight > 3, 'The landscape retains substantial three-dimensional mountain relief');
  for (const [name, coordinates] of [['England', [-1, 53]], ['Ireland', [-8, 53.5]]]) {
    const point = await page.evaluate(async coordinates => (await import(new URL('./assets/app.js', document.baseURI).href)).projectToScreen(...coordinates), coordinates);
    assert.ok(point.x > 0 && point.x < 1896 && point.y > 0 && point.y < 942, `${name} remains inside the overview (${JSON.stringify(point)}, camera=${JSON.stringify(overview.camera)})`);
  }
  const desktopImage = await page.screenshot({ path: path.join(outputDirectory, 'sculpted-desktop.png') });
  console.log('PASS sculpted WebGL scene, oblique view, mountain relief, UK/Ireland coverage, landmarks, and sea decorations');

  await hoverLand(page, [9, 61], 'no');
  await page.waitForFunction(() => {
    const { hover } = window.__qaInspectScene();
    return hover[2] > .85 && hover[0] < .15 && hover[1] < .15;
  });
  const hover = await inspect(page);
  assert.ok(hover.hover[2] > .85 && hover.hover[0] < .15 && hover.hover[1] < .15, `Norway highlights independently from other regions (${JSON.stringify(hover.hover)})`);
  const hoverImage = await page.screenshot({ path: path.join(outputDirectory, 'sculpted-hover-norway.png') });
  assertGoldenHighlight(desktopImage, hoverImage);
  console.log('PASS Norway hover with visible golden highlight');

  const laptop = await newPage({ viewport: { width: 1366, height: 768 } });
  await openMap(laptop);
  assert.equal(await laptop.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true, 'Laptop viewport has no page overflow');
  await laptop.screenshot({ path: path.join(outputDirectory, 'sculpted-laptop.png') });
  console.log('PASS laptop layout and screenshot');

  await page.setViewportSize({ width: 1280, height: 800 });

  // Complete journeys start on real terrain rather than UI language labels.
  // The larger Norge label now covers the old 7.5/61.5 screen position at
  // laptop width. This inland point exercises the exposed terrain itself.
  for (const [lang, coordinates] of [['en', [9, 53]], ['pl', [20.8, 52]], ['no', [9, 61]]]) {
    await openMap(page);
    const initialCameraDistance = cameraDistance(await inspect(page));
    await clickLand(page, coordinates, lang);
    if (lang === 'no') {
      await page.waitForTimeout(160);
      await page.screenshot({ path: path.join(outputDirectory, 'sculpted-norway-zoom.png') });
      await page.waitForFunction(() => {
        const { vehicle, phase } = window.__qaInspectScene().journey;
        return phase === 'driving' && vehicle.type === 'car' && vehicle.visible;
      });
      await page.waitForTimeout(300);
      const image = await page.screenshot({ path: path.join(outputDirectory, 'sculpted-norway-drive.png') });
      await fs.writeFile(path.join(outputDirectory, 'journey-passat-v4.png'), image);
    }
    await destination(page, lang);
    const vehicles = await page.evaluate(() => JSON.parse(sessionStorage.getItem('northbound-qa-vehicles')));
    const vehicleType = lang === 'no' ? 'car' : 'plane';
    const traveling = vehicles[vehicleType];
    assert.ok(traveling, `The ${vehicleType} was visible during the journey`);
    const { width, height } = traveling.journey.vehicle.screenSize;
    const legibilityScale = 800 / 942;
    assert.ok(Math.max(width, height) >= (vehicleType === 'car' ? 32 : 65) * legibilityScale, `The ${vehicleType} is large enough to read during the journey (${width.toFixed(1)}×${height.toFixed(1)}px)`);
    assert.ok(vehicles.car, 'The arrival includes a visible car');
    assertCarRoute(vehicles.car);
    const phases = await page.evaluate(() => JSON.parse(sessionStorage.getItem('northbound-qa-phases')));
    assert.match(phases[0], lang === 'no' ? /Driving to H\u00f8vik/ : /Flying to Sandefjord/);
    if (lang !== 'no') assert.ok(phases.includes('Landed. Next stop, Oslo.'), 'Flight transitions to the Oslo drive');
    if (lang === 'no') {
      assert.ok(cameraDistance(traveling) < initialCameraDistance * .8, 'Norway zooms in before the drive');
      const motion = await page.evaluate(() => JSON.parse(sessionStorage.getItem('northbound-qa-motion')));
      assert.ok(motion.some(sample => sample.phase === 'zooming' && sample.elapsed < 1500 && sample.distance < initialCameraDistance * .98), 'Norway begins zooming immediately after the click');
      assert.ok(motion.some(sample => sample.elapsed < 1500 && sample.fade > .05), 'Norway zoom includes a visible fade');
    }
    assert.equal(phases.at(-1), `${names[lang]}. Welcome.`, 'The full journey reaches its arrival state');
    console.log(`PASS ${names[lang]} terrain selection, full journey, and destination`);
  }
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
  await mobile.screenshot({ path: path.join(outputDirectory, 'sculpted-mobile.png') });
  await mobile.locator('.language-option[data-lang="no"]').tap();
  await mobile.locator('#journey-status.is-visible').waitFor();
  await destination(mobile, 'no');
  console.log('PASS fresh mobile scene, viewport layout, touch selection, and journey');

  const reduced = await newPage({ reducedMotion: 'reduce' });
  await openMap(reduced, rootURL, false);
  for (const lang of ['en', 'pl', 'no']) {
    if (lang !== 'en') await openMap(reduced, rootURL, false);
    await reduced.evaluate(() => {
      sessionStorage.setItem('northbound-qa-animated', 'false');
      const status = document.querySelector('#journey-status');
      new MutationObserver(() => {
        if (status.classList.contains('is-visible')) sessionStorage.setItem('northbound-qa-animated', 'true');
      }).observe(status, { attributes: true, attributeFilter: ['class'] });
    });
    await reduced.locator(`.language-option[data-lang="${lang}"]`).click();
    await destination(reduced, lang);
    assert.equal(await reduced.evaluate(() => sessionStorage.getItem('northbound-qa-animated')), 'false', 'Reduced motion never starts an animated journey');
  }
  console.log('PASS reduced-motion direct navigation for all languages');

  // Only the intentionally unavailable renderer error is expected in this context.
  const fallback = await newPage({ reducedMotion: 'reduce' }, [/^THREE\.WebGLRenderer: Error creating WebGL context\.$/]);
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return getContext.call(this, type, ...args);
    };
  });
  async function openFallback() {
    await fallback.goto(rootURL, { waitUntil: 'load' });
    await fallback.waitForFunction(() => document.body.classList.contains('no-webgl'));
    assert.equal(await fallback.locator('#terrain-fallback').isVisible(), true, 'The static map is visible without WebGL');
    assert.equal(await fallback.locator('#map-loading').isVisible(), false, 'Fallback clears the loading indicator');
    assert.equal(await fallback.locator('#view-toggle').count(), 0, 'Fallback has no perspective control');
  }
  await openFallback();
  await fallback.locator('#land-no').focus();
  await fallback.keyboard.press('Enter');
  await destination(fallback, 'no');
  await openFallback();
  await fallback.locator('.language-option[data-lang="pl"]').click();
  await destination(fallback, 'pl');
  console.log('PASS WebGL-unavailable fallback map, geographic keyboard selection, and language buttons');

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
  }

  // A paused browser clock keeps the short travel phases available for visual review.
  const clocked = await newPage({ viewport: { width: 1280, height: 800 } });
  await clocked.clock.install();
  await openMap(clocked, rootURL, false);
  await clocked.clock.pauseAt(await clocked.evaluate(() => Date.now() + 100));
  const beforeClick = await inspect(clocked);
  await clocked.locator('.language-option[data-lang="no"]').click({ force: true });
  await clocked.clock.runFor(180);
  const zoom = await inspect(clocked);
  assert.equal(zoom.journey.phase, 'zooming', 'An early Norway click starts its own zoom during the introductory camera movement');
  assert.ok(cameraDistance(zoom) < cameraDistance(beforeClick), 'The early click zooms toward Norway');
  assert.ok(zoom.fadeOpacity > .05, 'The early click has a visible parchment fade');
  await clocked.screenshot({ path: path.join(outputDirectory, 'sculpted-norway-zoom.png') });
  await clocked.clock.fastForward(1100);
  await clocked.clock.runFor(120);
  const drive = await inspect(clocked);
  assert.equal(drive.journey.vehicle.type, 'car');
  assert.equal(drive.journey.vehicle.visible, true);
  assertCarRoute(drive);
  assert.ok(cameraDistance(drive) < cameraDistance(beforeClick) * .8, 'The Norway journey keeps the close camera after overriding the introductory animation');
  const carImage = await clocked.screenshot({ path: path.join(outputDirectory, 'sculpted-norway-drive.png') });
  await fs.writeFile(path.join(outputDirectory, 'journey-passat-v4.png'), carImage);
  await clocked.clock.resume();
  console.log('PASS early Norway click, visible fade, close drive, physical clearance, and controlled travel screenshots');

  // A software-rendered screenshot can take longer than the whole flight.
  // Freeze animation time to inspect the actual jet rather than its next phase.
  const jetReview = await newPage({ viewport: { width: 1280, height: 800 } });
  await jetReview.clock.install();
  await openMap(jetReview, rootURL, false);
  await jetReview.clock.pauseAt(await jetReview.evaluate(() => Date.now() + 100));
  await jetReview.locator('.language-option[data-lang="en"]').click({ force: true });
  await jetReview.clock.fastForward(1400);
  await jetReview.clock.runFor(100);
  const flight = await inspect(jetReview);
  assert.equal(flight.journey.phase, 'flying', 'The controlled flight is still in its flying phase');
  assert.equal(flight.journey.vehicle.type, 'plane');
  assert.equal(flight.journey.vehicle.visible, true);
  assert.ok(Math.max(...Object.values(flight.journey.vehicle.screenSize)) >= 55, 'The jet is readable in its controlled journey view');
  const jetImage = await jetReview.screenshot({ path: path.join(outputDirectory, 'sculpted-flight.png') });
  await fs.writeFile(path.join(outputDirectory, 'journey-jet-v4.png'), jetImage);
  console.log('PASS controlled Wizz-inspired jet journey screenshot and legibility');

  assert.deepEqual(issues, [], 'No browser runtime errors, console errors, or failed resources');
  console.log('PASS no browser errors or failed resource requests');
} catch (error) {
  console.error(error);
  throw error;
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  await new Promise(resolve => nestedServer.close(resolve));
}
