import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const host=resolve(root,'../csmodular-main');
const server=await preview({root:host,configFile:resolve(host,'vite.config.js'),preview:{port:0,host:'127.0.0.1'},logLevel:'error'});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),headless:true});
const patch=JSON.parse(await readFile(resolve(root,'examples/granular-demo.json'),'utf8'));
try {
 for(const [locale,title,load] of [['en-US','Grain Sample','Load WAV'],['zh-CN','颗粒采样','导入 WAV'],['ru-RU','Гранулярный сэмпл','Загрузить WAV']]){
  const page=await browser.newPage({locale,viewport:{width:1440,height:1000}});
  const errors=[],consoleErrors=[];
  page.on('response',r=>{if(r.status()>=400) console.error('HTTP '+r.status()+' '+r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') { consoleErrors.push(m.text()); console.error(m.text(), m.location()); }});
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(()=>window.system?.csoundGen);
  await page.locator('#splash-root input[type=checkbox]').uncheck();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#splash-root'));
  const result=await page.evaluate(async patch=>{
   const system=window.system;system.locked=false;
   const libs=await (await fetch('/libraries/_index.json')).json();
   let total=0;
   for(const lib of libs.libraries){
    const index=await (await fetch('/libraries/'+lib+'/_index.json')).json();
    for(const entry of index.modules){
     const name=typeof entry==='string'?entry:entry.name;
     if(!await system.moduleFactory.loadModule(lib,name))throw new Error('Cannot load '+lib+'/'+name);
     total++;
    }
   }
   await system.loadPatchFromJson(patch);
   const panel=Object.values(system.patchLoader.moduleMap.byId).find(p=>p.jsonName==='GrainSample');
   system.moduleContextMenu.show(panel,100,100);
   const ctx=document.createElement('canvas').getContext('2d');
   const widths=system.moduleFactory.moduleRegistry.GrainSample.components.filter(c=>c.componentType==='TextLabel' && Number(c.id)<500).map(c=>{ctx.font=c.fontSize+'px Arial';return {text:c.text,width:ctx.measureText(c.text).width};});
   return {total,title:panel.title,menu:document.querySelector('#module-context-menu').textContent,wide:widths.filter(c=>c.width>80)};
  },patch);
  assert.equal(result.total,19);
  assert.equal(result.title,title);
  assert(result.menu.includes(load));
  assert.deepEqual(result.wide,[],'Labels fit their columns');
  await page.screenshot({path:resolve(root,'test-results/locale-'+locale+'.png')});
  await page.evaluate(()=>window.system.moduleContextMenu.hide());
  await page.screenshot({path:resolve(root,'test-results/panels-'+locale+'.png')});
  assert.equal(await page.locator('#granular-guide-open, #granular-guide').count(), 0);
  const starter = await page.evaluate(()=>{
    const system=window.system;
    const osc=Object.values(system.patchLoader.moduleMap.byId).find(p=>p.jsonName==='GrainOsc');
    const selector=osc.components.find(c=>String(c.parameterId)==='7');
    selector.setValue(0.8);
    const saved=system.collectModuleParameters(osc);
    selector.setValue(saved[7]);
    return {count:system.csoundGen.modules.size,cables:system.csoundGen._activeCables.length,value:selector.getValue(),type:selector.constructor.name};
  });
  assert.equal(starter.count,4);assert.equal(starter.cables,3);
  assert.equal(starter.value,1);assert.equal(starter.type,'ButtonIncDec');
  await page.goto(server.resolvedUrls.local[0]+'editor/editor.html');
  await page.waitForLoadState('networkidle');
  assert(await page.locator('canvas').count()>0,'Editor canvas exists');
  assert.deepEqual(errors,[],'No uncaught main/editor exceptions');
  const unexpected=consoleErrors.filter(m=>!m.includes("ws://127.0.0.1:8765/ws"));
  assert.deepEqual(unexpected,[],'No unexpected console errors');
  console.log(locale+': main, 19 module definitions, localized panel/menu, editor passed. Optional OSC messages: '+(consoleErrors.length-unexpected.length));
  await page.close();
 }
} finally {await browser.close();await new Promise(r=>server.httpServer.close(r));}
