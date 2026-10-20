import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:4173');await page.waitForTimeout(1100);await page.evaluate(()=>document.fonts.ready);
assert.equal(await page.locator('.land').count(),3);await page.locator('.language-option[data-lang="pl"]').hover();assert.equal(await page.locator('#land-pl').getAttribute('class'),'land land-pl is-active');await page.screenshot({path:'desktop.png'});
for(const lang of ['en','pl','no']){
await page.goto('http://127.0.0.1:4173');await page.locator('.language-option[data-lang="'+lang+'"]').click();await page.waitForURL('**/'+lang+'/',{timeout:12000});assert.equal(await page.locator('h1').textContent(),{en:'English',pl:'Polski',no:'Norsk'}[lang]);console.log('PASS full '+lang+' animation and destination');
}
await page.goto('http://127.0.0.1:4173');await page.locator('#land-pl').focus();await page.keyboard.press('Enter');await page.locator('#skip').click();await page.waitForURL('**/pl/');console.log('PASS keyboard selection and skip');
await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173');await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'mobile.png',fullPage:true});await page.locator('.language-option[data-lang="no"]').click();await page.waitForURL('**/no/',{timeout:8000});console.log('PASS mobile layout and journey');
await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4173');await page.locator('.language-option[data-lang="en"]').click();await page.waitForURL('**/en/',{timeout:1500});console.log('PASS reduced motion');assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
}finally{await browser.close()}
