import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const host=resolve('E:/paper/csmodular-main');
const server=await preview({root:host,configFile:resolve(host,'vite.config.js'),preview:{host:'127.0.0.1',port:0},logLevel:'error'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
const page=await browser.newPage();page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,400))});page.on('pageerror',e=>console.log('PAGE',e.message));
await page.route('**/@csound/browser@*/dist/csound.js',async route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:await readFile('node_modules/@csound/browser/dist/csound.js')}));
await page.goto(server.resolvedUrls.local[0]);await page.waitForFunction(()=>window.system?.csoundGen);
await page.locator('#splash-root input[type=checkbox]').uncheck();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#splash-root'));
const patch=JSON.parse(await readFile(resolve(host,'dist/patches/granular-demo.json'),'utf8'));
patch.modules=patch.modules.filter(m=>['GrainOsc','Outs2'].includes(m.name));patch.cables=[0,1].map(jack=>({from:{id:1,jack,pin:'out'},to:{id:3,jack,pin:'in'},type:'out-in',area:'VOICE'}));
patch.modules[0].parameters=JSON.stringify([0,110,30,0,0,0,0,0,64,0,0,127,127,19,0]);
const meta=await page.evaluate(async patch=>{const s=window.system;s.locked=false;const result=await s.loadPatchFromJson(patch);if(result?.success===false)throw Error(JSON.stringify(result));const p=Object.values(s.patchLoader.moduleMap.byId).find(p=>p.jsonName==='GrainOsc');window.knobs=Object.fromEntries(p.components.filter(c=>c.csoundChannel).map(c=>[c.parameterId,c]));
window.tbl=s.csoundGen.addScopeTable(s.csoundGen._activeCables[0]);if(!await s.csoundEngine.init())throw Error('engine start failed');return {channels:Object.entries(window.knobs).map(([id,c])=>[id,c.csoundChannel]),rate:await s.csoundEngine.instance.getSr(),tbl:window.tbl};},patch);
console.log(meta);
const readings={};
for(const [name,wave,warp,jitter] of [['sine',0,0,0],['triangle',1,0,0],['saw',2,0,0],['square',3,0,0],['warp',3,127,0],['jitter',3,0,127],['both',3,127,127],['reset',3,0,0]]){
await page.evaluate(([wave,warp,jitter])=>{for(const [id,v] of [[14,wave],[3,warp],[4,jitter]])window.knobs[id].setValue(v);},[wave,warp,jitter]);
await page.waitForTimeout(650);
const v=await page.evaluate(async rate=>{const cs=window.system.csoundEngine.instance;const values=await Promise.all([14,3,4].map(i=>cs.getControlChannel(window.knobs[i].csoundChannel)));
let readings=[];for(let n=0;n<6;n++){const data=await cs.tableCopyOut(window.tbl);let sum=0;for(const x of data)sum+=x*x;
const hs=[1,2,3].map(h=>{let mag=0;for(let j=0;j<4;j++){let re=0,im=0;for(let i=0;i<1024;i++){const t=i*2*Math.PI*h*220/(rate/4),x=data[i+j*1024]*(0.5-0.5*Math.cos(2*Math.PI*i/1023));re+=x*Math.cos(t);im+=x*Math.sin(t);}mag+=Math.hypot(re,im)/256;}return mag/4;});
readings.push([Math.sqrt(sum/data.length),...hs]);await new Promise(r=>setTimeout(r,105));}return {values,means:readings[0].map((_,i)=>readings.reduce((s,r)=>s+r[i],0)/readings.length)};},meta.rate);
console.log(name,JSON.stringify(v));assert.deepEqual(v.values,[wave,warp,jitter]);readings[name]=v;
}
await writeFile(resolve('test-results/osc-installed-host-controls.json'),JSON.stringify({host,build:'dist',meta,readings},null,2));
const ratio=(name,h)=>readings[name].means[h]/readings[name].means[1];
assert(readings.sine.means[1]>0.05);assert(ratio('sine',2)<0.05);assert(ratio('saw',2)>0.25);assert(ratio('square',3)>ratio('triangle',3)*1.5);
assert(ratio('warp',2)>ratio('square',2)+0.05);assert(readings.jitter.means[1]<readings.square.means[1]*0.9);
assert(Math.abs(readings.reset.means[1]/readings.square.means[1]-1)<0.1);
console.log('PASS host panel controls and scope');await page.evaluate(()=>window.system.csoundEngine.stop());
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
