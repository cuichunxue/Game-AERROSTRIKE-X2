// Game rules: run setup, wave director, enemies, bosses, weapons, damage, scoring and sector flow.
const bossTime=()=>g.practice?Infinity:g.sector===1?30:40;
const loopMul=()=>1+Math.floor((g.sector-1)/THEMES.length)*.45;
const bulletSpeed=()=>(mode==='easy'?.72:1)*Math.min(1.4,1+(g.sector-1)*.05);
function start(practice=false){sound();best=Number(records[mode])||0;const af=airframe(),baseHp=Math.max(1,(mode==='easy'?5:3)+af.hp);
 g={practice:practice===true,af,moved:0,maxCombo:0,novas:0,boosts:0,lastHit:'',bossDamage:0,readyAnnounced:false,pauseGrace:0,
  p:{x:W/2,y:H*.78,inv:2},flight:{x:W/2,y:H*.78,vx:0,vy:0,bank:0,thrust:0,recoil:0,trail:[],trailTime:0},
  hp:baseHp,maxHp:baseHp,score:0,combo:0,comboTime:0,kills:0,sector:1,time:0,phase:0,bombs:3,maxBombs:5,energy:0,over:0,weapon:0,ammo:AMMO_FULL.slice(),level:1,
  fire:0,spawn:.6,director:1.4,queue:[],forms:{},formId:0,nextCarrier:16,boss:null,bossSent:false,warning:0,bossDeath:null,bossTimer:0,dying:0,
  damage:af.damage,rate:af.rate,magnet:1,grazeMul:af.graze,wingmen:0,wing:[],shake:0,flash:0,flashColor:'255,255,255',hitstop:0,timeScale:1,
  noticeTime:0,graze:0,nextDrop:8,ui:0,sectorHits:0,nextExtend:50000,banner:null,lowBeep:0,lastMult:1,unlocked:[]};
 shots=[];enemies=[];hostile=[];particles=[];rings=[];drops=[];labels=[];beams=[];keys={};pointer=null;state='playing';setTheme(0);
 $('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Ⅱ';delete $('guide').dataset.practice;$('guide').hidden=trained&&!g.practice;$('guide').textContent='空いた場所をドラッグして移動 · 機体の中心の白い点を守ろう';
 banner(g.practice?'TRAINING':'SECTOR 01',g.practice?'操作練習 / ダメージなし':THEMES[0].jp+' / '+af.name);notify(g.practice?'操作練習 / ダメージなし':'SECTOR 01 / 出撃',2);fx('select');hud()}
function notify(t,d=2){$('notice').textContent=t;if(g)g.noticeTime=d}
function banner(title,sub,d=2.6){if(g)g.banner={title,sub,t:0,d}}
function mult(){return 1+Math.min(7,Math.floor(g.combo/5))}
function addScore(n){g.score+=Math.round(n);if(!g.practice&&g.score>=g.nextExtend){g.nextExtend+=g.nextExtend<100000?50000:100000;if(g.hp<g.maxHp){g.hp++;label(g.p.x,g.p.y-40,'EXTEND  LIFE +1','#aaffb9',18)}else{g.bombs=Math.min(g.maxBombs,g.bombs+1);label(g.p.x,g.p.y-40,'EXTEND  BOMB +1','#ffcf8a',18)}fx('extend');notify('EXTEND / スコアボーナス',1.6)}}
function changeWeapon(i){if(state!=='playing')return;g.weapon=(i+4)%4;const empty=g.ammo[g.weapon]<=0;if(empty)g.weapon=0;notify(empty?'弾切れ / 通常へ切替':weaponHelp[g.weapon],1.8);g.fire=0;fx('pick');hud()}
function nova(){if(state!=='playing'||g.bombs<=0||g.dying>0)return;g.bombs--;g.novas++;fx('nova');buzz([30,40,90]);g.p.inv=Math.max(g.p.inv,1.5);g.shake=reduced?0:12;g.flash=.5;g.flashColor='200,245,255';
 for(const b of hostile){addP({k:'spark',x:b.x,y:b.y,vx:0,vy:-60,life:.4,max:.4,c:'#b9f7ff'})}addScore(hostile.length*10);hostile=[];beams=[];
 for(const e of enemies){if(e.boss){e.hp-=Math.min(e.max*.06,100);e.flash=.15}else{e.hp-=999}if(e.hp<=0)kill(e)}
 rings.push({x:g.p.x,y:g.p.y,r:20,grow:1400,life:1,max:1,c:'#b9f7ff',w:5});rings.push({x:g.p.x,y:g.p.y,r:10,grow:900,life:.8,max:.8,c:'#ffffff',w:2});explode(g.p.x,g.p.y-30,.6,'#b9f7ff');notify('NOVA / 弾幕クリア',1);hud()}
function boost(){if(state!=='playing'||g.energy<100||g.dying>0)return;g.energy=0;g.readyAnnounced=false;g.boosts++;g.over=6;g.p.inv=Math.max(g.p.inv,1);fx('boost');buzz(40);g.flash=.25;g.flashColor='255,225,150';rings.push({x:g.p.x,y:g.p.y,r:10,grow:700,life:.6,max:.6,c:'#ffe19c',w:3});notify('OVERDRIVE / 火力 ×2',1.6);hud()}

// ---- Enemies & waves --------------------------------------------------------------------------------
const ENEMY_STATS={0:{hp:2,r:17,pts:50},1:{hp:3,r:17,pts:80},2:{hp:12,r:26,pts:300},3:{hp:3,r:16,pts:120},4:{hp:2,r:15,pts:60},5:{hp:9,r:22,pts:200}};
function enemy(type,x,y,extra){const S=ENEMY_STATS[type],hp=S.hp*(1+(g.sector-1)*.2)*loopMul();return Object.assign({x,y,base:x,type,hp,max:hp,r:S.r,pts:S.pts,age:0,fire:rand(1.4,2.8),vy:(type===1?100:type===2?42:type===5?0:60)+g.sector*5,vx:0,flash:0,dead:false},extra||{})}
function addEnemy(e){if(enemies.length<30)enemies.push(e);return e}
function later(t,fn){g.queue.push({t,fn})}
function formation(n){const id=++g.formId;g.forms[id]={left:n,killed:0,n};return id}
const WAVES={
 intro(){addEnemy(enemy(0,clamp(g.p.x,25,W-25),-20));return 1.3},
 singles(){const n=2+Math.min(3,g.sector);for(let i=0;i<n;i++)later(i*.35,()=>addEnemy(enemy(0,rand(30,W-30),-30)));return 2.2},
 weavers(){const x=rand(70,W-70);for(let i=0;i<3;i++)later(i*.32,()=>addEnemy(enemy(1,x,-30)));return 2.4},
 vform(){const f=formation(5),x=rand(W*.25,W*.75);[[0,0],[-1,1],[1,1],[-2,2],[2,2]].forEach(([dx,dy])=>addEnemy(enemy(0,clamp(x+dx*42,20,W-20),-30-dy*36,{form:f,vy:85+g.sector*4,fire:rand(1.8,3.2)})));return 3},
 sweep(){const f=formation(5),side=Math.random()<.5?-1:1,y0=rand(H*.08,H*.25);for(let i=0;i<5;i++)later(i*.22,()=>addEnemy(enemy(4,side<0?-30:W+30,y0,{form:f,side,y0,fire:rand(.9,1.6)})));return 3.2},
 divers(){const n=g.sector>2?3:2;for(let i=0;i<n;i++)later(i*.6,()=>addEnemy(enemy(3,rand(40,W-40),-30,{vy:200})));return 3},
 gunship(){addEnemy(enemy(2,rand(W*.25,W*.75),-40,{hold:H*rand(.16,.3),stay:rand(4.5,6.5)}));later(.5,()=>{addEnemy(enemy(0,rand(30,W/2),-30));addEnemy(enemy(0,rand(W/2,W-30),-30))});return 4.2}
};
function chooseWave(){if(g.time<6)return 'intro';const s=g.sector,w=[['singles',3],['weavers',2],['vform',2.4],['sweep',2.2],['gunship',g.time>10||s>1?1.4+s*.2:0],['divers',s>1?1.6+s*.2:g.time>16?.8:0]];let tot=0;for(const [,v] of w)tot+=v;let r=Math.random()*tot;for(const [k,v] of w){r-=v;if(r<=0)return k}return 'singles'}
function updateDirector(dt){for(const q of g.queue)q.t-=dt;const due=g.queue.filter(q=>q.t<=0);g.queue=g.queue.filter(q=>q.t>0);for(const q of due)q.fn();
 if(g.practice){g.spawn-=dt;if(g.spawn<=0){const e=enemy(0,clamp(W/2+Math.sin(g.time)*W*.23,25,W-25),-20);e.fire=999;enemies.push(e);g.spawn=1.1}return}
 if(g.bossDeath||g.dying>0)return;
 if(!g.bossSent&&g.phase>bossTime())startWarning();
 if(g.warning>0){g.warning-=dt;if(g.warning<=0)spawnBoss();return}
 if(g.boss)return;
 g.nextCarrier-=dt;if(g.nextCarrier<=0){g.nextCarrier=rand(18,26);const side=Math.random()<.5?-1:1;addEnemy(enemy(5,side<0?-30:W+30,H*rand(.12,.22),{vx:-side*70,side,fire:999}))}
 g.director-=dt;if(g.director<=0){const gap=WAVES[chooseWave()]();g.director=gap*Math.max(.55,1-(g.sector-1)*.08)}}
function enemyShot(e,a,s=160,kind='orb'){if(hostile.length>=220)return;const sp=s*bulletSpeed();hostile.push({x:e.x,y:e.y+(e.r||10)*.5,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:kind==='big'?8:kind==='needle'?4:5,kind,grazed:false})}
const aim=e=>Math.atan2(g.p.y-e.y,g.p.x-e.x);
function updateEnemy(e,dt){e.age+=dt;e.fire-=dt;e.flash=Math.max(0,e.flash-dt);const canShoot=g.dying<=0&&!g.bossDeath&&e.y>20&&e.y<g.p.y-80;
 if(e.type===0){e.y+=e.vy*dt;if(e.fire<=0&&canShoot){enemyShot(e,aim(e),150);e.fire=2.4}}
 else if(e.type===1){e.y+=e.vy*dt;e.x=clamp(e.base+Math.sin(e.age*2.5)*45,18,W-18);e.tilt=Math.cos(e.age*2.5)*.35;if(e.fire<=0&&canShoot){enemyShot(e,aim(e),140);e.fire=2.2}}
 else if(e.type===2){if(e.stay>0&&e.y<e.hold){e.y+=e.vy*dt}else if(e.stay>0){e.stay-=dt;e.x+=Math.sin(e.age*.8)*30*dt}else e.y+=e.vy*1.4*dt;
  if(e.fire<=0&&canShoot){const a=aim(e),n=g.sector>2?5:3;for(let i=0;i<n;i++)enemyShot(e,a+(i-(n-1)/2)*.2,130);e.fire=1.9}}
 else if(e.type===3){if(!e.dash){const ty=H*.16;e.y+=(ty-e.y)*Math.min(1,dt*3);e.wait=(e.wait||0)+dt;if(e.wait>.5&&e.lock===undefined)e.lock=aim(e);if(e.lock!==undefined)e.tilt=e.lock-Math.PI/2;if(e.wait>1.05){e.dash=true;fx('dive');e.vx=Math.cos(e.lock)*520;e.vy=Math.sin(e.lock)*520}}else{e.x+=e.vx*dt;e.y+=e.vy*dt}
  if(e.x<-60||e.x>W+60)e.dead=true}
 else if(e.type===4){const dir=-e.side,sp=230+g.sector*8;e.x+=dir*sp*dt;e.y=e.y0+Math.sin(e.age*2.4)*H*.08+e.age*38;const vx=dir*sp,vy=Math.cos(e.age*2.4)*2.4*H*.08+38;e.tilt=Math.atan2(vy,vx)-Math.PI/2;if(e.fire<=0&&canShoot&&e.x>20&&e.x<W-20){enemyShot(e,aim(e),150);e.fire=9}if(e.x<-60||e.x>W+60)e.dead=true}
 else if(e.type===5){e.x+=e.vx*dt;e.y+=Math.sin(e.age*1.5)*12*dt;if(e.x<-70||e.x>W+70)e.dead=true}
 if(e.type!==3&&e.type!==4&&e.type!==5&&e.y>H+40)e.dead=true;if(e.y>H+60)e.dead=true}

// ---- Bosses -----------------------------------------------------------------------------------------
function startWarning(){g.bossSent=true;g.warning=2.8;fx('warning');buzz([60,80,60]);const B=BOSSES[(g.sector-1)%3];$('bossname').textContent=`WARNING / ${B.name}`;$('notice').textContent=''}
function spawnBoss(){const kind=(g.sector-1)%3,B=BOSSES[kind],hp=(200+g.sector*100)*(mode==='easy'?.8:1)*loopMul(),r=kind===1?Math.min(84,W*.19):kind===2?Math.min(54,W*.13):Math.min(65,W*.15);
 const b={x:W/2,y:-110,r,hp,max:hp,boss:true,kind,age:0,fire:2,fire2:2.5,fire3:4,spin:0,dead:false,flash:0,parts:[],tx:W/2,dashT:0,trail:[]};
 if(kind===0)b.parts=[{ox:-52,oy:12,r:12,hp:hp*.1,max:hp*.1,fire:1.6,dead:false,flash:0},{ox:52,oy:12,r:12,hp:hp*.1,max:hp*.1,fire:2.2,dead:false,flash:0}];
 if(kind===1)b.parts=[{ox:-50,oy:6,r:14,hp:hp*.12,max:hp*.12,fire:1.4,dead:false,flash:0},{ox:50,oy:6,r:14,hp:hp*.12,max:hp*.12,fire:2.1,dead:false,flash:0}];
 g.boss=b;g.bossTimer=0;enemies.push(b);$('bossname').textContent=`${B.name} / ${B.jp}`;banner(B.name,B.jp+' 接近',2)}
function partPos(b,p){const s=b.r/(b.kind===1?80:b.kind===2?52:55);return [b.x+p.ox*s,b.y+p.oy*s]}
function updateBoss(e,dt){e.age+=dt;e.flash=Math.max(0,e.flash-dt);g.bossTimer+=dt;const rage=e.hp/e.max<.5,lp=Math.floor((g.sector-1)/3),hard=lp>0;
 for(const p of e.parts){p.flash=Math.max(0,p.flash-dt);if(p.dead)continue;p.fire-=dt;if(p.fire<=0&&e.age>2.5){const [px,py]=partPos(e,p),a=Math.atan2(g.p.y-py,g.p.x-px);for(let i=0;i<(e.kind===1?3:1);i++)later(i*.12,()=>{if(!p.dead&&g.boss===e)enemyShot({x:px,y:py,r:4},a,175,'needle')});p.fire=e.kind===1?2:1.7}}
 const settle=Math.min(1,dt*1.6);
 if(e.kind===0){e.y+=(clamp(H*.27,80,200)-e.y)*settle;e.x=W/2+Math.sin(e.age*.65)*W*.28;e.fire-=dt;if(e.fire<=0&&e.age>2){const n=(rage?8:7)+(hard?4:0)+(g.sector>1?1:0);for(let i=0;i<n;i++)enemyShot(e,Math.PI/2+(i-(n-1)/2)*.17+Math.sin(e.age)*.16,145);if(rage&&g.sector>1)enemyShot(e,aim(e),190,'big');e.fire=rage?1.1:1.25}
  if(rage){e.fire2-=dt;if(e.fire2<=0){const n=14+(hard?8:0),off=rand(0,TAU);for(let i=0;i<n;i++)enemyShot(e,off+i/n*TAU,100);e.fire2=3.4;e.fire=Math.max(e.fire,.6)}}}
 else if(e.kind===1){e.y+=(clamp(H*.28,85,205)-e.y)*settle;e.x=W/2+Math.sin(e.age*.35)*W*.16;e.spin+=dt*(rage?2.3:1.7);e.fire-=dt;const cyc=e.age%4;if(e.age>2.5&&cyc<2.6&&e.fire<=0){const arms=(rage?3:2)+(hard?1:0);for(let i=0;i<arms;i++)enemyShot(e,e.spin+i/arms*TAU,120);e.fire=rage?.09:.12}
  e.fire2-=dt;if(rage&&e.fire2<=0){enemyShot(e,aim(e),95,'big');enemyShot(e,aim(e)-.4,95,'big');enemyShot(e,aim(e)+.4,95,'big');e.fire2=2.4}}
 else{e.y+=(clamp(H*.26,78,190)-e.y)*settle;e.dashT-=dt;if(e.dashT<=0){e.tx=rand(W*.15,W*.85);e.dashT=rage?1.5:2.2}const px=e.x;e.x+=(e.tx-e.x)*Math.min(1,dt*4);e.bank=clamp((e.x-px)/dt/900,-.5,.5);
  if(!reduced&&Math.abs(e.x-px)>1.2){e.trail.push({x:e.x,y:e.y,life:.3});}for(const t of e.trail)t.life-=dt;e.trail=e.trail.filter(t=>t.life>0).slice(-8);
  e.fire-=dt;if(e.fire<=0&&e.age>2){const a=aim(e);for(let i=0;i<5+(hard?2:0);i++)later(i*.08,()=>{if(g.boss===e)enemyShot(e,a+rand(-.05,.05),230,'needle')});e.fire=rage?1.1:1.6}
  e.fire3-=dt;if(e.fire3<=0&&e.age>3){const xs=[g.p.x];const extra=rage?2:1;for(let i=0;i<extra;i++)xs.push(rand(40,W-40));for(const x of xs)beams.push({x,w:24,warn:1.05,on:.55});fx('charge');e.fire3=rage?4.6:6}
  if(rage){e.fire2-=dt;if(e.fire2<=0){for(const side of [-1,1])for(let i=0;i<7;i++)enemyShot({x:e.x+side*e.r*1.1,y:e.y+10,r:4},Math.PI/2+side*.1+(i-3)*.14,135);e.fire2=2.2}}}
 if(g.dying<=0&&g.p.inv<=0&&Math.hypot(e.x-g.p.x,e.y-g.p.y)<e.r*.62)hurt('ボス機体')}
function updateBeams(dt){for(const b of beams){if(b.warn>0){b.warn-=dt;if(b.warn<=0)fx('beam')}else{b.on-=dt;if(g.dying<=0&&Math.abs(g.p.x-b.x)<b.w/2+g.af.hitbox&&g.p.y>0)hurt('レーザー')}}beams=beams.filter(b=>b.warn>0||b.on>0)}
function bossDefeated(e){e.dead=true;g.boss=null;g.bossDeath={t:0,x:e.x,y:e.y,r:e.r,kind:e.kind,next:0};g.timeScale=.28;g.flash=.6;g.flashColor='255,255,255';g.shake=reduced?0:14;g.hitstop=.12;
 const conv=hostile.length;for(const b of hostile)addP({k:'spark',x:b.x,y:b.y,vx:0,vy:-90,life:.5,max:.5,c:'#fff3b0'});hostile=[];beams=[];addScore(conv*20);
 const pts=3000*mult();addScore(pts);label(e.x,e.y,'+'+pts.toLocaleString(),'#fff1a0',22);explode(e.x,e.y,2.4,'#fff3c0');fx('boss');buzz([80,60,160]);notify(`${BOSSES[e.kind].name} 撃破`,2.4);
 for(const o of enemies)if(!o.dead&&!o.boss){o.hp=0;kill(o,true)}}
function updateBossDeath(dt){const d=g.bossDeath;d.t+=dt;d.next-=dt;if(d.t<2&&d.next<=0){d.next=.16;explode(d.x+rand(-d.r,d.r),d.y+rand(-d.r*.6,d.r*.6),rand(.7,1.4));if(Math.random()<.5)fx('big');g.shake=reduced?0:6}
 if(d.t>=2&&!d.final){d.final=true;explode(d.x,d.y,3.6,'#ffffff');fx('boss');g.flash=.7;g.shake=reduced?0:16;for(let i=0;i<4;i++)drops.push({x:d.x+rand(-40,40),y:d.y+rand(-20,20),type:i===0?'power':i===1&&g.hp<g.maxHp?'heal':'ammo',r:12})}
 if(d.t>=3.4)sectorClear()}
function sectorClear(){const fight=g.bossTimer,noDamage=g.sectorHits===0,tally=[['ボス撃破',0],['速攻ボーナス',Math.max(0,Math.round((45-fight)*150))],['ノーダメージ',noDamage?4000*g.sector:0]];for(const [,v] of tally)addScore(v);tally[0][1]=3000;
 g.bossDeath=null;g.timeScale=1;g.phase=0;g.bossSent=false;g.sector++;g.bombs=Math.min(g.maxBombs,g.bombs+1);g.hp=Math.min(g.maxHp,g.hp+1);g.sectorHits=0;
 career.bestSector=Math.max(career.bestSector,g.sector);career.bestScore=Math.max(career.bestScore,g.score);store.set('ax-career',career);g.unlocked.push(...checkUnlocks());fx('clear');setUpgrade(tally)}

// ---- Player weapons ---------------------------------------------------------------------------------
function fire(){let w=g.weapon;if(g.ammo[w]<=0){g.weapon=0;w=0;notify('PULSE / 自動切替',1)}const p=g.p,L=g.level,power=g.damage*(g.over>0?2:1);
 const add=(vx,vy,off=0,kind=w,extra)=>shots.push(Object.assign({x:p.x+off,y:p.y-20,vx,vy,r:kind===1?5:3,d:power*(kind===2?5:kind===1?2+L*.4:1),kind,life:2},extra));
 if(w===0){const sets=[[[-8,0],[8,0]],[[-12,0],[0,0],[12,0]],[[-15,-50],[-5,0],[5,0],[15,50]],[[-20,-90],[-9,-30],[0,0],[9,30],[20,90]]][L-1];for(const [o,vx] of sets)add(vx,-720,o)}
 if(w===1){add(0,-1200,0,1,{pierce:L>=3?3:1,hits:[]});if(L>=2){add(0,-1200,-14,1,{pierce:1,hits:[],d:power*1.2});add(0,-1200,14,1,{pierce:1,hits:[],d:power*1.2})}}
 if(w===2){const n=[2,3,4,4][L-1];for(let i=0;i<n;i++){const s=i-(n-1)/2;add(s*70,-360,s*10)}}
 if(w===3){const n=[5,7,7,9][L-1],step=L>=3?100:120;for(let i=0;i<n;i++)add((i-(n-1)/2)*step,-580)}
 g.wing.forEach((m,i)=>{shots.push({x:m.x,y:m.y-10,vx:0,vy:-700,r:3,d:power*.7,kind:0,life:2,wing:1})});
 if(w)g.ammo[w]--;g.flight.recoil=1;fx(['shot','laser','missile','spread'][w]);g.fire=([.18,.13,.48,.2][w]*(L===4&&w===2?.8:1))/g.rate/(g.over>0?1.4:1)}
function kill(e,silent=false){if(e.dead&&!e.boss)return;if(e.boss){if(!e.dead)bossDefeated(e);return}e.dead=true;g.kills++;g.combo++;g.maxCombo=Math.max(g.maxCombo,g.combo);g.comboTime=3.8;
 const points=e.pts*mult();addScore(points);g.energy=clamp(g.energy+(e.type===2?12:6),0,100);explode(e.x,e.y,e.type===2?1.6:e.type===5?1.3:.9);if(!silent){label(e.x,e.y,'+'+points);fx(e.type===2?'big':'kill')}g.shake=reduced?0:Math.max(g.shake,e.type===2?6:2);
 if(e.type===2)g.hitstop=Math.max(g.hitstop,.04);
 const m=mult();if(m>g.lastMult&&!silent){label(g.p.x,g.p.y-46,`×${m} COMBO`,'#79f0d1',17);fx('combo')}g.lastMult=m;
 if(e.type===5)drops.push({x:e.x,y:e.y,type:g.level<4?'power':g.hp<g.maxHp?'heal':'bomb',r:12});
 else if(e.type===2&&Math.random()<.4)drops.push({x:e.x,y:e.y,type:'power',r:12});
 else if(g.kills%6===0)drops.push({x:e.x,y:e.y,type:'ammo',r:10});
 if(e.form&&g.forms[e.form]){const f=g.forms[e.form];f.killed++;if(f.killed===f.n&&!silent){const b=1000*m;addScore(b);label(e.x,e.y-26,`FORMATION +${b.toLocaleString()}`,'#ffe498',16);fx('power');if(g.level<4&&Math.random()<.6)drops.push({x:e.x,y:e.y,type:'power',r:12})}}}
function hurt(cause='敵弾'){if(g.p.inv>0||state!=='playing'||g.practice||g.dying>0||g.bossDeath)return;g.lastHit=cause;notify(cause+'に接触 / 2秒シールド',1.8);g.hp--;g.sectorHits++;g.p.inv=2;g.combo=0;g.comboTime=0;g.lastMult=1;
 if(g.level>1){g.level--;label(g.p.x,g.p.y-38,'POWER DOWN','#ff9c88',14)}g.shake=reduced?0:10;g.flash=.4;g.flashColor='255,70,70';g.hitstop=.07;explode(g.p.x,g.p.y,.8,'#ff9c8c');fx('hurt');buzz(90);
 if(g.hp<=0){g.dying=2.2;g.timeScale=.35;explode(g.p.x,g.p.y,2.2,'#ffd0a0');fx('down');buzz([100,60,200]);$('guide').hidden=true}hud()}
function updatePlayer(dt){const speed=Math.min(W,H)*.68*g.af.speed;let dx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),dy=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const norm=Math.hypot(dx,dy)||1;if(dx||dy)g.moved+=speed*dt;
 g.p.x=clamp(g.p.x+dx/norm*speed*dt,26,W-26);g.p.y=clamp(g.p.y+dy/norm*speed*dt,Math.min(115,H*.25),H-26);updateFlight(dt);
 while(g.wing.length<g.wingmen)g.wing.push({x:g.p.x,y:g.p.y+30});g.wing.forEach((m,i)=>{const side=i%2?1:-1,tx=g.p.x+side*46,ty=g.p.y+22;m.x+=(tx-m.x)*Math.min(1,dt*7);m.y+=(ty-m.y)*Math.min(1,dt*7)});
 g.fire-=dt;if(g.fire<=0)fire()}
// Position follows input immediately; only the aircraft attitude has inertia.
function updateFlight(dt){const f=g.flight,p=g.p,a=1-Math.exp(-dt*12);f.vx+=(clamp((p.x-f.x)/dt,-950,950)-f.vx)*a;f.vy+=(clamp((p.y-f.y)/dt,-950,950)-f.vy)*a;f.x=p.x;f.y=p.y;f.bank+=(clamp(f.vx/650,-.5,.5)-f.bank)*(1-Math.exp(-dt*14));f.thrust+=(clamp(-f.vy/320+Math.abs(f.vx)/650,0,1)+(g.over>0?.7:0)-f.thrust)*a;f.recoil=Math.max(0,f.recoil-dt*9);f.trailTime+=dt;for(const t of f.trail)t.life-=dt;f.trail=f.trail.filter(t=>t.life>0);if(!reduced&&f.trailTime>.035){f.trailTime=0;f.trail.push({x:p.x,y:p.y,bank:f.bank,life:.65});if(f.trail.length>20)f.trail.shift()}}

function hitEnemy(e,b,dmg){e.hp-=dmg;if(!e.boss)e.flash=.07;if(e.boss)g.bossDamage+=dmg;if(e.hp<=0)kill(e);else{burst(b.x,b.y,b.kind===2?'#ffbe78':'#9fe9ff',3);fx('hit')}}
function updateShots(dt){for(const b of shots){b.life-=dt;if(b.kind===2){let target=null,d=Infinity;for(const e of enemies){if(e.dead||e.y<-10)continue;const dis=Math.hypot(e.x-b.x,e.y-b.y);if(dis<d){d=dis;target=e}}if(target){const a=Math.atan2(target.y-b.y,target.x-b.x),sp=440+g.level*30;b.vx+=(Math.cos(a)*sp-b.vx)*Math.min(1,dt*6);b.vy+=(Math.sin(a)*sp-b.vy)*Math.min(1,dt*6)}if(Math.random()<.5)addP({k:'smoke',x:b.x,y:b.y,vx:0,vy:20,r:3,grow:14,life:.35,max:.6})}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  for(const e of enemies){if(e.dead||b.life<=0)continue;if(b.hits&&b.hits.includes(e))continue;
   if(e.boss){let hitPart=false;for(const p of e.parts){if(p.dead)continue;const [px,py]=partPos(e,p);if(Math.hypot(b.x-px,b.y-py)<p.r+b.r){p.hp-=b.d;p.flash=.07;hitPart=true;if(p.hp<=0){p.dead=true;explode(px,py,1.3);fx('part');addScore(800*mult());label(px,py,'PART BREAK','#ffe498',15);e.hp-=p.max*.5;e.flash=.12;g.hitstop=.05;if(e.hp<=0)kill(e)}else{burst(b.x,b.y,'#9fe9ff',2);fx('hit')}break}}if(hitPart){b.life=0;break}if(e.y<-20)continue}
   if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){hitEnemy(e,b,b.d);if(b.pierce>1){b.pierce--;b.hits.push(e)}else b.life=0;break}}}}
function updateHostile(dt){const hr=g.af.hitbox;for(const b of hostile){b.x+=b.vx*dt;b.y+=b.vy*dt;if(g.dying>0)continue;const d=Math.hypot(b.x-g.p.x,b.y-g.p.y);
 if(d<b.r+hr){b.dead=true;hurt()}else if(d<b.r+26&&!b.grazed&&g.p.inv<=0){b.grazed=true;g.energy=clamp(g.energy+3*g.grazeMul,0,100);g.graze++;addScore(20);addP({k:'spark',x:(b.x+g.p.x)/2,y:(b.y+g.p.y)/2,vx:rand(-60,60),vy:rand(-60,60),life:.25,max:.25,c:'#ffffff'});fx('graze');if(g.graze%4===0)label(g.p.x,g.p.y-25,'GRAZE','#ffffff',12)}}}
function updateDrops(dt){g.nextDrop-=dt;if(g.nextDrop<=0&&!g.practice){drops.push({x:rand(25,W-25),y:-12,type:g.hp<g.maxHp&&Math.random()<.5?'heal':'ammo',r:10});g.nextDrop=10}
 const reach=95*g.magnet;for(const d of drops){d.y+=65*dt;const dis=Math.hypot(d.x-g.p.x,d.y-g.p.y);if(dis<reach&&g.dying<=0){d.x+=(g.p.x-d.x)*dt*6;d.y+=(g.p.y-d.y)*dt*6}if(dis<25&&g.dying<=0){d.dead=true;collect(d)}}}
function collect(d){const cap=[0,120,50,90].map(v=>Math.round(v*(g.magnet>1?1.3:1)));
 if(d.type==='heal'){g.hp=Math.min(g.maxHp,g.hp+1);label(d.x,d.y,'LIFE +1','#aaffb9');fx('pick')}
 else if(d.type==='power'){if(g.level<4){g.level++;label(d.x,d.y-10,g.level===4?'MAX POWER!':`POWER Lv${g.level}`,'#ffb27a',17);notify(`兵装レベル ${g.level}`,1.2)}else{addScore(2000);label(d.x,d.y,'+2000','#ffb27a',15)}fx('power');g.flash=.12;g.flashColor='255,170,110'}
 else if(d.type==='bomb'){g.bombs=Math.min(g.maxBombs,g.bombs+1);label(d.x,d.y,'BOMB +1','#ffcf8a');fx('pick')}
 else{g.ammo[1]=Math.min(cap[1],g.ammo[1]+30);g.ammo[2]=Math.min(cap[2],g.ammo[2]+10);g.ammo[3]=Math.min(cap[3],g.ammo[3]+25);label(d.x,d.y,'AMMO +','#ffe498');fx('pick')}
 addScore(100)}

const upgrades=[
 {id:'rate',name:'加速装填',text:'連射速度 +18%（上限2.5倍）',icon:'RATE',ok:()=>g.rate<2.5,apply:()=>g.rate=Math.min(2.5,g.rate*1.18)},
 {id:'power',name:'高出力コア',text:'すべての武器の威力 +22%',icon:'POWER',ok:()=>true,apply:()=>g.damage*=1.22},
 {id:'armor',name:'シールド増設',text:'最大ライフ +1（上限8）＆ 全回復',icon:'ARMOR',ok:()=>g.maxHp<8,apply:()=>{g.maxHp=Math.min(8,g.maxHp+1);g.hp=g.maxHp}},
 {id:'wing',name:'ウイングマン',text:'僚機ドローンが編隊を組み、援護射撃',icon:'WINGMAN',ok:()=>g.wingmen<2,apply:()=>g.wingmen++},
 {id:'level',name:'兵装チューン',text:'武器レベル +1（最大4）弾が増える',icon:'WEAPON',ok:()=>g.level<4,apply:()=>g.level=Math.min(4,g.level+1)},
 {id:'magnet',name:'トラクター',text:'アイテム吸引範囲 ×1.6・弾薬上限 +30%',icon:'MAGNET',ok:()=>g.magnet<2,apply:()=>g.magnet=Math.min(2.56,g.magnet*1.6)},
 {id:'reactor',name:'グレイズ炉',text:'敵弾をかすめた時のエネルギー ×1.6',icon:'REACTOR',ok:()=>g.grazeMul<3.5,apply:()=>g.grazeMul*=1.6},
 {id:'bomb',name:'爆弾庫拡張',text:'爆弾 +2・最大所持数 +1',icon:'BOMB',ok:()=>g.maxBombs<8,apply:()=>{g.maxBombs++;g.bombs=Math.min(g.maxBombs,g.bombs+2)}}
];
function offerUpgrades(){const pool=upgrades.filter(u=>u.ok()).sort(()=>Math.random()-.5);if(g.sector===2){const w=pool.find(u=>u.id==='wing');if(w){pool.splice(pool.indexOf(w),1);pool.unshift(w)}}return pool.slice(0,3)}
