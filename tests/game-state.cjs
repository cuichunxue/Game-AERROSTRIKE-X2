// Headless rules test: runs the real game source in a VM with a stubbed DOM/canvas.
// Usage: node tests/game-state.cjs
const vm=require('vm'),assert=require('assert'),{bundleJs}=require('../tools/build.cjs');
const els={};
function el(){return {style:{},dataset:{},hidden:false,disabled:false,textContent:'',innerHTML:'',isConnected:true,listeners:{},classList:{toggle(){},add(){},remove(){}},addEventListener(n,f){this.listeners[n]=f},setAttribute(k,v){this[k]=v},focus(){},getBoundingClientRect(){return {width:390,height:580,left:0,top:0,right:390,bottom:580}},setPointerCapture(){},getContext:()=>context}}
const gradient=()=>({addColorStop(){}});
const context=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get:(o,k)=>o[k]||(()=>{})});
const sandbox={document:{getElementById:id=>els[id]||(els[id]=el()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>el()},window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame(){},performance:{now:()=>1000},devicePixelRatio:2,Math,console};
vm.createContext(sandbox);vm.runInContext(bundleJs(),sandbox);
const run=s=>vm.runInContext(s,sandbox);
const step=(n,pre='')=>run(`for(let i=0;i<${n};i++){${pre};update(1/120)}`);
const until=(cond,max=6000,pre='')=>{run(`for(let i=0;i<${max}&&!(${cond});i++){${pre};update(1/120)}`);return run(cond)};

run('start()');assert.equal(run('state'),'playing');run('g.p.inv=0;hurt();hurt()');assert.equal(run('g.hp'),2);
run('g.weapon=1;g.ammo[1]=0;fire()');assert.equal(run('g.weapon'),0);
run('pause()');const time=run('g.time');run('update(1)');assert.equal(run('g.time'),time);
run('resume();g.energy=100;boost()');assert.equal(run('g.over'),6);run('nova()');assert.equal(run('g.bombs'),2);
run('start()');assert(until('g.warning>0',4000,'g.p.inv=100'),'warning before boss');assert(until('!!g.boss',600,'g.p.inv=100'),'boss after warning');
run('g.boss.hp=1;kill(g.boss)');assert(run('!!g.bossDeath'));assert.equal(run('state'),'playing');assert.equal(run('hostile.length'),0);
assert(until('state==="upgrade"',600),'sector clear after boss explosion sequence');assert.equal(run('g.sector'),2);assert(run('$("panel").innerHTML').includes('SECTOR CLEAR'));assert(run('$("panel").innerHTML').includes('ウイングマン'),'first clear offers the wingman');
run('chooseUpgrade("wing")');assert.equal(run('state'),'playing');assert.equal(run('g.wingmen'),1);assert.equal(run('world.theme'),1);step(10);assert.equal(run('g.wing.length'),1);
run('start();g.hp=1;g.p.inv=0;hurt()');assert.equal(run('state'),'playing');assert(run('g.dying')>0);assert(until('state==="over"',600),'game over after the crash sequence');
run('start()');assert.equal(run('g.hp'),3);assert.equal(run('g.time'),0);
run('for(let i=0;i<36000;i++){if(state==="upgrade")chooseUpgrade("power");if(state==="over")start();g.p.inv=100;update(1/120);if(i%120===0)draw()}');assert(run('hostile.length')<=220);assert(run('particles.length')<=440);assert(run('g.sector')>=1);
console.log('PASS: startup, invulnerability, ammo fallback, pause, overdrive, nova, warning → boss, boss explosion → sector clear, wingman upgrade, crash sequence → game over, restart, 5-minute simulation and entity limits.');

run('start(true);g.p.inv=0;hurt()');step(4200);assert.equal(run('g.hp'),3);assert.equal(run('g.phase'),0);assert.equal(run('!!g.boss'),false);assert.equal(run('hostile.length'),0);
run('start(false);g.p.inv=0;pause();resume()');assert(run('g.p.inv')>=1.5);
run('records={easy:0,normal:0};mode="easy";start();g.score=1234;over();mode="normal";start()');assert.equal(run('best'),0);assert.equal(run('records.easy'),1234);run('g.score=432;g.lastHit="敵機";g.novas=1;over()');assert(run('$("panel").innerHTML').includes('敵機との接触'));assert.equal(run('records.normal'),432);
run('start();g.energy=100;hud()');assert.equal(run('$("boost").disabled'),false);assert(run('$("energy").textContent').includes('準備完了'));run('boost();update(1);hud()');assert(run('$("energy").textContent').includes('5.0'));
run('g.rate=2.49;upgrades[0].apply();setUpgrade()');assert.equal(run('g.rate'),2.5);assert(!run('$("panel").innerHTML').includes('加速装填'),'maxed upgrades are not offered');
console.log('PASS: no-damage practice, no practice boss/bullets, protected resume, difficulty-isolated records, contextual result advice, charged ability display, maxed upgrade hidden.');

run('start();g.p.inv=0;pointer={id:7,x:20,y:20};keys.KeyD=true');
for(let i=0;i<4;i++){run(`$('weapons').onclick({target:{closest:()=>({disabled:false,dataset:{weapon:'${i}'}})}})`);assert.equal(run('g.weapon'),i);assert.equal(run('state'),'playing');assert.equal(run('pointer.id'),7);assert.equal(run('g.p.inv'),0);}
run('g.ammo[1]=0;hud()');assert.equal(run('$("weapon1").disabled'),true);run('pause()');assert.equal(run('$("flight-controls").hidden'),true);run('resume()');assert.equal(run('$("flight-controls").hidden'),false);run('g.p.y=H;update(1/120)');assert.equal(run('g.p.y'),run('H-26'));
console.log('PASS: all four weapon keys select directly without pausing, interrupting drag, or granting invulnerability; empty ammo disabled; controls hidden on pause.');

run('start();g.p.y=H-48;update(1/120);draw()');assert.equal(run('g.p.y'),run('H-48'));
const viewportValues={};sandbox.document.documentElement={style:{setProperty(k,v){viewportValues[k]=v}}};sandbox.window.visualViewport={width:390,height:664,offsetTop:0,offsetLeft:0};run('fitViewport()');assert.equal(viewportValues['--view-height'],'664px');sandbox.window.visualViewport={width:844,height:342,offsetTop:4,offsetLeft:0};run('fitViewport()');assert.equal(viewportValues['--view-width'],'844px');assert.equal(viewportValues['--view-height'],'342px');assert.equal(viewportValues['--view-top'],'4px');
run('start(true);for(let i=0;i<30;i++){g.p.x+=2;updateFlight(1/120)}');assert(run('g.flight.bank')>0);const stopX=run('g.p.x');run('for(let i=0;i<180;i++)updateFlight(1/120)');assert.equal(run('g.p.x'),stopX);assert(Math.abs(run('g.flight.bank'))<.001);run('for(let i=0;i<30;i++){g.p.x-=2;updateFlight(1/120)}');assert(run('g.flight.bank')<0);assert(run('g.flight.trail.length')<=20);run('for(let i=0;i<4;i++){g.weapon=i;fire();draw()}');assert.equal(run('g.flight.recoil'),1);run('g.over=6;for(let i=0;i<120;i++)updateFlight(1/120)');assert(run('g.flight.thrust')>.6);
console.log('PASS: aircraft stays within canvas, viewport follows visible area, bank follows movement and settles, all muzzle effects render, overdrive raises thrust.');

run('start(true)');const controls=els['flight-controls'];const begin=(x,y)=>controls.listeners.pointerdown({pointerId:8,clientX:x,clientY:y,target:{closest:()=>els.weapon0}});let blocked=false;const click=()=>controls.listeners.click({detail:1,preventDefault(){blocked=true},stopImmediatePropagation(){}});
const initialX=run('g.p.x');begin(80,500);controls.listeners.pointermove({pointerId:8,clientX:84,clientY:500});assert.equal(run('g.p.x'),initialX);controls.listeners.pointerup({pointerId:8,type:'pointerup'});click();assert(!blocked);begin(80,500);controls.listeners.pointermove({pointerId:8,clientX:105,clientY:500});assert.equal(run('g.p.x'),initialX+25);controls.listeners.pointerup({pointerId:8,type:'pointerup',preventDefault(){}});click();assert(blocked);assert.equal(run('g.weapon'),0);assert.equal(run('g.bombs'),3);blocked=false;begin(80,500);controls.listeners.pointerup({pointerId:8,type:'pointerup'});click();assert(!blocked);
run('start();g.hp=1;g.p.inv=0;hurt("敵機")');until('state==="over"',600);assert(run('$("panel").innerHTML').includes('終了の原因：敵機との接触'));assert(run('$("panel").innerHTML').includes('次に試すこと：爆弾'));
run('start();controlRects=[{b:$("weapon0"),left:g.p.x-10,right:g.p.x+10,top:g.p.y-10,bottom:g.p.y+10},{b:$("weapon1"),left:0,right:20,top:0,bottom:20}];draw()');assert.equal(els.weapon0.dataset.overlap,'true');assert.equal(els.weapon1.dataset.overlap,'false');
run('audio={silenceEngine(){this.stopped=true},tick(){},engineTick(){}};pause()');assert.equal(run('audio.stopped'),true);run('audio=undefined');
console.log('PASS: icon tap/drag threshold, drag suppresses click, death cause/advice after crash, per-button overlap, engine silenced on pause.');

// Weapon levels, power items, formations, extends.
run('start();g.weapon=0;g.level=4;shots=[];fire()');assert.equal(run('shots.length'),5);run('g.level=1;shots=[];fire()');assert.equal(run('shots.length'),2);
run('g.level=3;g.weapon=1;shots=[];fire()');assert(run('shots.some(s=>s.pierce===3)'),'laser pierces at Lv3');
run('g.level=1;collect({type:"power",x:0,y:0})');assert.equal(run('g.level'),2);run('g.p.inv=0;hurt()');assert.equal(run('g.level'),1);
run('g.wingmen=2;update(1/120);shots=[];g.weapon=0;fire()');assert.equal(run('shots.filter(s=>s.wing).length'),2);
run('start();const f=formation(2);const a=addEnemy(enemy(0,100,100,{form:f})),b=addEnemy(enemy(0,200,100,{form:f}));kill(a);var before=g.score;kill(b)');assert(run('g.score-before')>=1000,'formation bonus');
run('start();g.hp=2;addScore(50000)');assert.equal(run('g.hp'),3);assert.equal(run('g.nextExtend'),100000);
run('start();const c=addEnemy(enemy(5,100,100));kill(c)');assert(run('drops.some(d=>d.type==="power")'),'supply carrier drops power');
console.log('PASS: weapon levels 1–4, laser pierce, power-up / power-down, wingman fire, formation bonus, score extend, carrier drop.');

// Bosses, beams, airframes, themes, unlocks, music data.
for(const k of [0,1,2]){run(`start();g.sector=${k+1};g.phase=99;g.p.inv=1e9`);assert(until('!!g.boss',800,'g.p.inv=1e9'));assert.equal(run('g.boss.kind'),k);run('for(let i=0;i<2400;i++){g.p.inv=1e9;update(1/120);if(i%60===0)draw()}');assert(run('!!g.boss'),`boss ${k} survives 20 s of chip damage`);run('g.boss.hp=g.boss.max*.4;for(let i=0;i<1200;i++){g.p.inv=1e9;update(1/120)}');}
run('start();g.sector=3;g.phase=99');until('!!g.boss',800,'g.p.inv=1e9');until('beams.length>0',1500,'g.p.inv=1e9');assert(run('beams.length')>0,'phantom fires beams');until('beams.some(b=>b.warn<=0)',300,'g.p.inv=1e9');run('g.p.inv=0;g.p.x=beams.find(b=>b.warn<=0).x;updateBeams(1/120)');assert.equal(run('g.lastHit'),'レーザー');
run('start();g.sector=1;g.phase=99');until('!!g.boss',800,'g.p.inv=1e9');run('const p=g.boss.parts[0],[px,py]=partPos(g.boss,p),hp=g.boss.hp;shots=[{x:px,y:py,vx:0,vy:0,r:3,d:1e6,kind:0,life:1}];updateShots(1/120);var lost=hp-g.boss.hp');assert(run('g.boss.parts[0].dead'));assert(run('lost')>0,'breaking a part damages the boss');
run('hangar.unlocked=["striker"];career.bestSector=3;career.bestScore=0');assert.deepEqual(run('checkUnlocks().map(a=>a.id)'),['valkyrie']);run('career.bestScore=30000');assert.deepEqual(run('checkUnlocks().map(a=>a.id)'),['goliath']);
run('hangar.selected="goliath";mode="normal";start()');assert.equal(run('g.hp'),4);assert(run('g.damage')>1.3);assert(run('g.af.hitbox')>5);run('hangar.selected="valkyrie";start()');assert.equal(run('g.hp'),3);assert(run('g.af.hitbox')<5);run('hangar.selected="striker"');
for(let t=0;t<5;t++){run(`start();setTheme(${t});for(let i=0;i<240;i++){g.p.inv=99;update(1/120)}draw()`)}run('menu();draw()');
for(const k of ['menu','stage','boss'])assert.equal(run(`TRACKS.${k}.lead.length`),64);
console.log('PASS: three boss patterns run, phantom beam hits, part break damages boss, airframe unlocks and stats, all five sector themes and the hangar render, music sequences are 4 bars.');
