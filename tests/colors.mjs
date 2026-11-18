import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const host=resolve(root,'../csmodular-main');
const server=await createServer({root:host,configFile:resolve(host,'vite.config.js'),server:{port:0,host:'127.0.0.1'},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(server.resolvedUrls.local[0]);await page.waitForFunction(()=>window.system?.csoundGen);
 await page.locator('#splash-root input[type=checkbox]').uncheck();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('#splash-root'));
 const patch=JSON.parse(await readFile(resolve(root,'examples/granular-demo.json'),'utf8'));
 await page.evaluate(async p=>{window.system.locked=false;await window.system.loadPatchFromJson(p)},patch);
 const result=await page.evaluate(async()=>{
  const s=window.system,menu=s.moduleContextMenu;
  const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  // Observe the actual background fill requested by each panel renderer.
  const fills=()=>s.components.filter(p=>p.components).map(p=>{
   const c=document.createElement('canvas').getContext('2d');let fill;
   const original=c.fillRect.bind(c);c.fillRect=(...args)=>{if(fill===undefined)fill=c.fillStyle;original(...args)};
   p.setDirty(true);p.draw(c);return {name:p.jsonName,fill};
  });
  const output=[];
  for(const preset of ['lcd','classic']) {
   s.designSettings.setPath('preset',preset);s.designSettings.setPath('lcd.color','#ffb347');await tick();
   const base=fills();
   for(const panel of s.components.filter(p=>p.components)){
    menu.show(panel,100,100);menu.changePanelColor('#234567');await tick();
    const changed=fills().find(p=>p.name===panel.jsonName).fill;
    await new Promise(r=>setTimeout(r,110));menu.resetPanelColor();await tick();
    const reset=fills().find(p=>p.name===panel.jsonName).fill;
    await new Promise(r=>setTimeout(r,110));
    output.push({preset,name:panel.jsonName,changed,reset,base:base.find(p=>p.name===panel.jsonName).fill});
   }
  }
  s.designSettings.setPath('preset','lcd');s.designSettings.setPath('lcd.color','#4ec9c9');await tick();
  return {output,cyan:fills()};
 });
 assert.equal(result.output.length,8);
 for(const row of result.output){assert.equal(row.changed,'#234567',row.name+' '+row.preset);assert.equal(row.reset,row.base,row.name+' reset');}
 for(const p of result.cyan)assert.match(p.fill,/78, 201, 201/,p.name+' follows global theme');
 console.log('Global theme, per-panel color and reset pass for all three plugins and Outs2 in LCD/Classic modes.');
}finally{await browser.close();await server.close();}