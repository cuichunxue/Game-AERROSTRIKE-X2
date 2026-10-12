import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [outDir, start, end, fps='30'] = process.argv.slice(2);
const F=+fps; const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080}});
await p.route(u=>!u.href.startsWith('http://localhost'), r=>r.abort());
await p.goto('http://localhost:8765/film.html', {waitUntil:'load'});
await p.evaluate(async()=>{await window.ready; for(let t=0;t<78;t+=0.5) render(t); await document.fonts.ready; await new Promise(r=>setTimeout(r,800)); await document.fonts.ready;});
fs.mkdirSync(outDir,{recursive:true});
for(let f=+start; f<+end; f++){
  await p.evaluate(t=>render(t), f/F);
  await p.screenshot({path:`${outDir}/${String(f).padStart(5,'0')}.jpg`, type:'jpeg', quality:93});
}
await b.close();
