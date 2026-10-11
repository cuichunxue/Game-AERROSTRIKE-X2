// Screens, HUD, input, the main loop and rendering.
const pad2=n=>String(n).padStart(2,'0');
function resize(){const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;if(r.width===W&&r.height===H&&canvas.width===Math.round(W*Math.min(devicePixelRatio||1,2)))return;const ow=W,oh=H;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
 if(g?.p){g.p.x=clamp(g.p.x/ow*W,26,W-26);g.p.y=clamp(g.p.y/oh*H,Math.min(115,H*.25),H-26);for(const a of [shots,enemies,hostile,particles,rings,drops,labels,beams])for(const e of a){e.x=e.x/ow*W;if(e.y!==undefined)e.y=e.y/oh*H;if(e.base!==undefined)e.base=e.base/ow*W}for(const m of g.wing){m.x=g.p.x;m.y=g.p.y}if(g.flight){g.flight.x=g.p.x;g.flight.y=g.p.y;g.flight.vx=0;g.flight.vy=0;g.flight.trail=[]}pointer=null}
 ctx.setTransform(dpr,0,0,dpr,0,0);setTheme(world.theme);makeVignette()}
function fitViewport(){const v=window.visualViewport,root=document.documentElement;const width=v?.width||window.innerWidth,height=v?.height||window.innerHeight;if(!width||!height)return;root.style.setProperty('--view-width',width+'px');root.style.setProperty('--view-height',height+'px');root.style.setProperty('--view-left',(v?.offsetLeft||0)+'px');root.style.setProperty('--view-top',(v?.offsetTop||0)+'px');}
let viewportPending=false;function scheduleViewport(){if(viewportPending)return;viewportPending=true;requestAnimationFrame(()=>{viewportPending=false;fitViewport()})}
window.addEventListener('resize',scheduleViewport);window.addEventListener('orientationchange',scheduleViewport);window.visualViewport?.addEventListener('resize',scheduleViewport);window.visualViewport?.addEventListener('scroll',scheduleViewport);fitViewport();
new ResizeObserver(resize).observe($('arena'));

function show(html){audio?.silenceEngine();$('app').dataset.screen=state;$('flight-controls').hidden=true;$('panel').innerHTML=html;$('overlay').hidden=false;$('pause').disabled=state==='menu'||state==='over'||state==='upgrade';}
function craftCard(a){const locked=!hangar.unlocked.includes(a.id),sel=a.id===hangar.selected,fresh=!locked&&!hangar.seen.includes(a.id);
 return `<button class="craft${sel?' selected':''}" data-craft="${a.id}" role="radio" aria-checked="${sel}" ${locked?'disabled':''}><small>${a.role}</small><strong>${a.name}</strong><span class="bars">${['機動','火力','装甲'].map((n,i)=>`<i><em>${n}</em><b style="--v:${a.stats[i]}"></b></i>`).join('')}</span>${locked?`<span class="lock">LOCKED · ${a.unlock.text}</span>`:fresh?'<span class="new">NEW</span>':''}</button>`}
function menu(){state='menu';pointer=null;keys={};best=Number(records[mode])||0;g=null;shots=[];enemies=[];hostile=[];drops=[];beams=[];labels=[];setTheme(0);$('guide').hidden=true;$('objective').textContent='最初の目標：ボスを1機撃破';$('bossbar').hidden=true;const af=airframe();
 show(`<div class="eyebrow">ARCADE FLIGHT / AFTERBURN</div><h1>かわして、<span>撃ち抜け。</span></h1><p class="lede">移動するだけで自動攻撃。編隊を全滅させ、ボスを墜とし、強化を選んで次の空へ。</p>
 <div class="hangar" role="radiogroup" aria-label="機体を選択">${AIRFRAMES.map(craftCard).join('')}</div><p class="craft-desc">${af.desc}</p>
 <div class="difficulty"><button data-mode="easy" class="${mode==='easy'?'selected':''}">ゆったり · ライフ${5+af.hp}</button><button data-mode="normal" class="${mode==='normal'?'selected':''}">標準 · ライフ${Math.max(1,3+af.hp)}</button></div>
 <button class="primary" id="launch">出撃する <span>ENTER ↗</span></button><button class="secondary" id="practice">安全な操作練習 · いつでも終了</button>
 <p class="instructions">空いた場所をドラッグして移動。アイコンはタップで切替・ドラッグで移動。<br>PC：WASD / 矢印移動 · X 武器 · SPACE 爆弾 · C 火力2倍 · P 一時停止</p>
 <div class="record"><div>PERSONAL BEST<b>${best.toLocaleString()}</b></div><div>最高到達<b>SECTOR ${pad2(career.bestSector)}</b></div><div>総撃墜<b>${career.kills.toLocaleString()}</b></div></div>`);
 $('launch').onclick=()=>start(false);$('practice').onclick=()=>start(true);document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;fx('ui');menu()});
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{hangar.selected=b.dataset.craft;if(!hangar.seen.includes(hangar.selected))hangar.seen.push(hangar.selected);store.set('ax-hangar',hangar);fx('select');menu()})}
function hud(){if(!g)return;$('app').dataset.screen=state;$('flight-controls').hidden=state!=='playing';const ar=canvas.getBoundingClientRect();controlRects=['weapon0','weapon1','weapon2','weapon3','bomb','boost'].map(id=>{const b=$(id),r=b.getBoundingClientRect();return {b,left:r.left-ar.left,right:r.right-ar.left,top:r.top-ar.top,bottom:r.bottom-ar.top}});
 $('score').textContent=Math.floor(g.score).toString().padStart(6,'0');$('combo').textContent=`×${mult()} COMBO${g.combo>0?' / '+g.combo+' CHAIN':''}`;$('hp').textContent='◆ '.repeat(Math.max(0,g.hp))+'◇ '.repeat(Math.max(0,g.maxHp-g.hp));$('hp').classList.toggle('danger',g.hp===1&&!g.practice);
 $('power').textContent=`PWR ${'▮'.repeat(g.level)}${'▯'.repeat(4-g.level)}${g.level===4?' MAX':''}${g.wingmen?' · 僚機 '+g.wingmen:''}`;
 $('wave').textContent=`SECTOR ${pad2(g.sector)}`;$('time').textContent=`${pad2(Math.floor(g.time/60))}:${pad2(Math.floor(g.time%60))}`;$('bombs').textContent=g.bombs;$('bomb').disabled=g.bombs<=0||state!=='playing';$('boost').disabled=g.energy<100||state!=='playing';$('energy').textContent=g.over>0?`${g.over.toFixed(1)}秒`:g.energy>=100?'準備完了':`${Math.floor(g.energy)}%`;$('energyfill').style.width=g.energy+'%';
 weaponNames.forEach((n,i)=>{const b=$('weapon'+i);b.className=i===g.weapon?'active':'';b.disabled=(state!=='playing')||(i>0&&g.ammo[i]<=0);b.setAttribute('aria-pressed',String(i===g.weapon));$('ammo'+i).textContent=i===0?'∞':g.ammo[i]});
 $('objective').textContent=g.practice?'練習中 · 被弾なし / 出撃は下の案内から':g.warning>0?'WARNING · 大型機が接近中':g.boss?`ボス耐久 ${Math.ceil(clamp(g.boss.hp/g.boss.max,0,1)*100)}% · ${g.boss.parts.some(p=>!p.dead)?'砲台を壊すと大ダメージ':'倒すと強化'}`:g.bossDeath?'撃破！':`ボス登場まで ${Math.max(0,Math.ceil(bossTime()-g.phase))}秒 · ${THEMES[world.theme].jp}`;
 $('missionfill').style.width=(g.boss?clamp(1-g.boss.hp/g.boss.max,0,1)*100:Math.min(100,g.phase/Math.min(bossTime(),1e9)*100))+'%';$('combofill').style.width=clamp(g.comboTime/3.8*100,0,100)+'%';$('boost').className=g.energy>=100?'ready':'';$('app').dataset.boss=g.boss||g.warning>0?'1':'0';$('bossbar').hidden=!g.boss&&!(g.warning>0);if(g.boss)$('bossfill').style.width=clamp(g.boss.hp/g.boss.max*100,0,100)+'%';else if(g.warning>0)$('bossfill').style.width=clamp((2.8-g.warning)/2.8*100,0,100)+'%'}
$('weapons').onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled)changeWeapon(+b.dataset.weapon)};
$('bomb').onclick=nova;$('boost').onclick=boost;
function pause(){if(state==='playing'){state='paused';keys={};pointer=null;show('<div class="eyebrow">FLIGHT SUSPENDED</div><h2>ひと休み。</h2><p>準備ができたら、空へ戻ろう。</p><button class="primary" id="resume">戦闘に戻る <span>▶</span></button><button class="secondary" id="quit">基地に戻る</button>');$('resume').onclick=resume;$('quit').onclick=menu;$('pause').textContent='▶'}else if(state==='paused')resume()}
function resume(){sound();state='playing';$('overlay').hidden=true;$('pause').textContent='Ⅱ';g.p.inv=Math.max(g.p.inv,1.5);notify('再開 / 1.5秒シールド',1.5);last=performance.now();hud();}
$('pause').onclick=pause;
$('sound').onclick=()=>{sound();muted=!muted;if(audio?.master)audio.master.gain.value=muted?0:.85;$('sound').textContent=muted?'全音 OFF':'全音 ON';store.set('ax-muted',muted?1:0)};$('sound').textContent=muted?'全音 OFF':'全音 ON';
$('music').onclick=()=>{sound();music=!music;if(audio?.mbus)audio.mbus.gain.value=music?.5:0;$('music').textContent=music?'BGM ON':'BGM OFF';store.set('ax-music',music?1:0)};$('music').textContent=music?'BGM ON':'BGM OFF';

function setUpgrade(tally){state='upgrade';pointer=null;keys={};$('guide').hidden=true;const opts=offerUpgrades(),next=THEMES[(g.sector-1)%THEMES.length],nodmg=tally&&tally[2][1]>0;
 show(`<div class="eyebrow">SECTOR CLEAR / ${pad2(g.sector-1)}</div><h2>${nodmg?'完璧な飛行。':'見事な撃墜。'}次は、どんな強さで行く？</h2>
 ${tally?`<div class="tally">${tally.map(([k,v])=>`<div class="${v?'':'zero'}"><span>${k}</span><b>+${v.toLocaleString()}</b></div>`).join('')}<div class="total"><span>SCORE</span><b>${g.score.toLocaleString()}</b></div></div>`:''}
 <p>強化を1つ選択（1〜3キー）。爆弾 +1、ライフ +1 を補給。</p><div class="choices">${opts.map((u,i)=>`<button class="choice" data-up="${u.id}"><small>${i+1} / ${u.icon}</small><strong>${u.name}</strong><small>${u.text}</small></button>`).join('')}</div>
 <p class="next-sector">NEXT · SECTOR ${pad2(g.sector)} — ${next.name} / ${next.jp}</p>`);
 document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>chooseUpgrade(b.dataset.up))}
function chooseUpgrade(id){if(state!=='upgrade')return;const u=upgrades.find(x=>x.id===id);if(!u)return;u.apply();g.ammo=AMMO_FULL.slice();g.p.inv=3;state='playing';$('overlay').hidden=true;$('pause').disabled=false;setTheme(g.sector-1);const T=THEMES[world.theme];
 banner(`SECTOR ${pad2(g.sector)}`,`${T.name} · ${T.jp}`);notify(`${u.name} / 強化完了`,2);fx('select');hud()}
function rankOf(s){return s>=90000?'S':s>=45000?'A':s>=20000?'B':s>=7000?'C':'D'}
function over(){state='over';pointer=null;$('guide').hidden=true;const previous=lastRuns[mode],record=g.score>best&&g.score>0;best=Math.max(best,g.score);records[mode]=best;lastRuns[mode]={score:g.score,sector:g.sector,kills:g.kills};store.set('ax-records',records);store.set('ax-runs',lastRuns);
 if(!g.practice){career.flights++;career.kills+=g.kills;career.bestScore=Math.max(career.bestScore,g.score);career.bestSector=Math.max(career.bestSector,g.sector);store.set('ax-career',career)}const unlocked=g.unlocked.concat(checkUnlocks());
 const tip=g.novas===0?'爆弾を残して終了。次は弾に囲まれたら「爆弾」を使おう。':g.energy>=100?'必殺技が充電済み。次は「火力2倍」を発動して押し切ろう。':g.lastHit==='敵機'?'敵機との接触で終了。機体同士の距離も少し広く取ろう。':g.lastHit==='レーザー'?'赤い予告線が出たら、その列から横へ逃げよう。':g.boss?'ボスの砲台を先に壊すと弾幕が薄くなる。追尾弾も有効。':g.level<3?'Pアイテムで武器レベルを上げると殲滅が速くなる。補給機（緑の機体）を狙おう。':'大きく動きすぎず、敵弾の隙間へ少しずつ移動してみよう。';
 const comparison=previous?`前回比 ${g.score-previous.score>=0?'+':''}${(g.score-previous.score).toLocaleString()} 点 / この難易度のベスト ${best.toLocaleString()}`:`この難易度の初記録 / ベスト ${best.toLocaleString()}`,rank=rankOf(g.score);
 show(`<div class="eyebrow">${record?'自己ベスト更新':'フライト結果'} / ${mode==='easy'?'ゆったり':'標準'} / ${g.af.name}</div><div class="result-head"><div class="rank rank-${rank}" aria-label="ランク ${rank}">${rank}</div><div><h2>${record?'限界を、更新した。':'次の空は、もっと先へ。'}</h2><h1 id="finalScore">${g.score.toLocaleString()}</h1></div></div><p>${comparison}</p>
 <div class="stats"><div><b>${g.sector}</b><small>到達セクター</small></div><div><b>${g.kills}</b><small>撃破数</small></div><div><b>${g.maxCombo}</b><small>最大連続撃破</small></div><div><b>${g.graze}</b><small>かすり</small></div></div>
 ${unlocked.map(a=>`<p class="unlock">NEW AIRFRAME — ${a.name} が格納庫に配備された</p>`).join('')}
 <p class="hit-cause">終了の原因：${g.lastHit||"ライフがなくなりました"}${g.lastHit?"との接触":""}</p><p class="next-tip">次に試すこと：${tip}</p><button class="primary" id="retry">同じ難易度で再挑戦 <span>ENTER ↗</span></button><button class="secondary" id="home">基地に戻る / 機体・難易度を変更</button>`);
 $('retry').onclick=()=>start(false);$('home').onclick=menu;fx(record?'record':'over');
 if(!reduced&&g.score>0&&typeof performance!=='undefined'){const el=$('finalScore'),target=g.score,t0=performance.now();const step=()=>{if(state!=='over'||!el.isConnected)return;const k=Math.min(1,(performance.now()-t0)/1100);el.textContent=Math.floor(target*(1-Math.pow(1-k,3))).toLocaleString();if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}}

// ---- Input ------------------------------------------------------------------------------------------
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();sound();keys[e.code]=true;if(e.repeat)return;
 if(state==='menu'&&e.code==='Enter'&&!e.target?.closest?.('button'))start(false);
 if(state==='over'&&(e.code==='Enter'||e.code==='KeyR')&&!e.target?.closest?.('button'))start(false);
 if(state==='upgrade'&&/^Digit[1-3]$/.test(e.code)){const b=document.querySelectorAll('[data-up]')[+e.code.slice(5)-1];if(b)chooseUpgrade(b.dataset.up)}
 if(e.code==='Space')nova();if(e.code==='KeyC')boost();if(e.code==='KeyX')changeWeapon((g?.weapon||0)+1);if(e.code==='KeyP'||e.code==='Escape')pause()});
window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{keys={};pointer=null;if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
window.addEventListener('pointerdown',()=>sound());
function movePointer(e){if(!pointer||pointer.id!==e.pointerId||state!=='playing')return;if(pointer.control&&!pointer.dragging){if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)<8)return;pointer.dragging=true;}g.moved+=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);g.p.x=clamp(g.p.x+e.clientX-pointer.x,26,W-26);g.p.y=clamp(g.p.y+e.clientY-pointer.y,Math.min(115,H*.25),H-26);pointer.x=e.clientX;pointer.y=e.clientY;}
function endPointer(e){if(pointer?.id!==e.pointerId)return;if(pointer.control&&(pointer.dragging||e.type==='pointercancel')){suppressControlClickUntil=performance.now()+500;e.preventDefault?.()}pointer=null;}
canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||pointer)return;canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};sound()});canvas.addEventListener('pointermove',movePointer);for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,endPointer);
$('flight-controls').addEventListener('pointerdown',e=>{suppressControlClickUntil=0;if(state!=='playing'||pointer)return;const target=e.target.closest('button')||$('flight-controls');target.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,control:true,dragging:false};sound()});$('flight-controls').addEventListener('pointermove',movePointer);for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('flight-controls').addEventListener(ev,endPointer);
$('flight-controls').addEventListener('click',e=>{if(e.detail!==0&&performance.now()<suppressControlClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('pagehide',()=>{if(state==='playing')pause();else audio?.silenceEngine()});

// ---- Simulation step --------------------------------------------------------------------------------
function update(dt){if(state!=='playing')return;g.time+=dt;if(!g.practice)g.phase+=dt;g.p.inv=Math.max(0,g.p.inv-dt);g.over=Math.max(0,g.over-dt);g.shake=Math.max(0,g.shake-dt*30);g.flash=Math.max(0,g.flash-dt*1.8);g.comboTime-=dt;if(g.comboTime<=0){g.combo=0;g.lastMult=1}g.noticeTime-=dt;if(g.noticeTime<=0)$('notice').textContent='';
 world.speed=g.over>0?1.9:g.dying>0?.5:g.warning>0?1.4:1;updateWorld(dt);if(g.banner){g.banner.t+=dt;if(g.banner.t>g.banner.d)g.banner=null}
 if(g.dying>0){g.dying-=dt;if(g.dying<=0){updateFx(dt);over();return}}else updatePlayer(dt);
 updateDirector(dt);
 for(const e of enemies){if(e.dead)continue;if(e.boss){updateBoss(e,dt);continue}updateEnemy(e,dt);if(!e.dead&&e.type!==5&&g.dying<=0&&Math.hypot(e.x-g.p.x,e.y-g.p.y)<e.r+8)hurt('敵機')}
 if(state!=='playing')return;updateBeams(dt);updateShots(dt);updateHostile(dt);if(state!=='playing')return;updateDrops(dt);if(g.bossDeath)updateBossDeath(dt);if(state!=='playing')return;
 shots=shots.filter(b=>b.life>0&&b.y>-40&&b.y<H+30&&b.x>-30&&b.x<W+30);enemies=enemies.filter(e=>!e.dead);hostile=hostile.filter(b=>!b.dead&&b.y<H+20&&b.y>-30&&b.x>-20&&b.x<W+20);drops=drops.filter(d=>!d.dead&&d.y<H+20);updateFx(dt);
 if(g.moved>60&&!trained){trained=true;store.set('ax-trained',1);$('guide').textContent='移動OK！ 赤い弾を避けて、敵を撃破しよう';g.guideUntil=g.time+3}if(!g.practice&&g.time>(g.guideUntil||8)&&trained)$('guide').hidden=true;
 if(g.practice){$('guide').hidden=false;if(!$('guide').dataset.practice){$('guide').dataset.practice='1';$('guide').innerHTML='練習中：ドラッグで移動 <button id="practiceLaunch">本番に出撃</button>';$('practiceLaunch').onclick=()=>start(false)}}
 if(g.energy>=100&&!g.readyAnnounced){g.readyAnnounced=true;notify('必殺技 準備完了 / 右下の火力2倍で発動',2);fx('pick')}
 if(g.hp===1&&!g.practice&&g.dying<=0){g.lowBeep-=dt;if(g.lowBeep<=0){fx('lowhp');g.lowBeep=1.7}}
 g.ui-=dt;if(g.ui<=0){hud();g.ui=.12}}

// ---- Rendering --------------------------------------------------------------------------------------
function drawFlightTrail(){if(reduced||!g.flight)return;const trail=g.flight.trail,span=g.af.id==='goliath'?36:g.af.id==='valkyrie'?28:27;for(const side of [-1,1]){ctx.lineWidth=1.3;for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i];ctx.strokeStyle=`rgba(220,240,255,${b.life*.4})`;ctx.beginPath();ctx.moveTo(a.x+side*span*.8*Math.cos(a.bank),a.y+12+side*span*.8*Math.sin(a.bank));ctx.lineTo(b.x+side*span*.8*Math.cos(b.bank),b.y+12+side*span*.8*Math.sin(b.bank));ctx.stroke()}}}
function drawShadows(){const T=THEMES[world.theme];if(!T.shadow)return;shadowColor=`rgba(0,8,16,${T.shadow})`;const ox=18,oy=46;
 for(const e of enemies){if(e.dead)continue;if(e.boss)drawBoss({...e,x:e.x+ox*1.3,y:e.y+oy*1.3},1);else drawEnemy({...e,x:e.x+ox,y:e.y+oy},1)}
 if(g&&g.dying<=0&&state!=='over'){drawMode=1;drawJet(g.af.id,g.p.x+ox,g.p.y+oy,.62,g.flight.bank);for(const m of g.wing)drawJet('striker',m.x+ox*.8,m.y+oy*.8,.3,0);drawMode=0}}
function drawShots(){ctx.globalCompositeOperation='lighter';for(const b of shots){const hot=g.over>0;if(b.kind===1){ctx.strokeStyle=hot?'rgba(255,240,170,.9)':'rgba(150,200,255,.9)';ctx.lineWidth=b.pierce>1?5:3.5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x,b.y+60);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.stroke();sprite(SPR[hot?'gold':'blue'](),b.x,b.y,26,.9)}
 else if(b.kind===2){sprite(SPR[hot?'gold':'orange'](),b.x,b.y,24,1);ctx.fillStyle='#fff';ctx.fillRect(b.x-1.5,b.y-1.5,3,3)}
 else{const spr=SPR[hot?'gold':b.kind===3?'green':'cyan']();ctx.globalAlpha=.9;ctx.drawImage(spr,b.x-5,b.y-12,10,26);sprite(spr,b.x,b.y,b.wing?12:16,1)}}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
function drawBeams(){for(const b of beams){if(b.warn>0){const blink=reduced?.5:.35+Math.abs(Math.sin(ambient*14))*.4;ctx.fillStyle=`rgba(255,60,120,${blink*.18})`;ctx.fillRect(b.x-b.w/2,0,b.w,H);ctx.strokeStyle=`rgba(255,90,140,${blink})`;ctx.setLineDash([8,8]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(b.x-b.w/2,0);ctx.lineTo(b.x-b.w/2,H);ctx.moveTo(b.x+b.w/2,0);ctx.lineTo(b.x+b.w/2,H);ctx.stroke();ctx.setLineDash([])}
 else{const k=clamp(b.on/.55,0,1),w=b.w*(.6+k*.5);ctx.globalCompositeOperation='lighter';const gr=ctx.createLinearGradient(b.x-w,0,b.x+w,0);gr.addColorStop(0,'rgba(190,80,255,0)');gr.addColorStop(.35,'rgba(200,110,255,.7)');gr.addColorStop(.5,'rgba(255,255,255,1)');gr.addColorStop(.65,'rgba(200,110,255,.7)');gr.addColorStop(1,'rgba(190,80,255,0)');ctx.fillStyle=gr;ctx.globalAlpha=k;ctx.fillRect(b.x-w,0,w*2,H);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}}
function drawEnemies(){for(const e of enemies){if(e.dead)continue;if(e.boss){if(e.trail)for(const t of e.trail){ctx.globalCompositeOperation='lighter';sprite(SPR.violet(),t.x,t.y,e.r*2.4,t.life*1.2);ctx.globalCompositeOperation='source-over'}ctx.globalAlpha=1;drawBoss(e,e.flash>.05?2:0);continue}
 if(e.fire<.4&&e.fire>0&&e.y>0&&e.type!==3&&e.type!==5){ctx.strokeStyle='#ffce8a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+8-(.4-e.fire)*12,0,TAU);ctx.stroke()}
 if(e.type===3&&!e.dash&&e.lock!==undefined){ctx.strokeStyle=`rgba(255,210,90,${.3+Math.abs(Math.sin(ambient*20))*.4})`;ctx.setLineDash([6,6]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.lock)*H,e.y+Math.sin(e.lock)*H);ctx.stroke();ctx.setLineDash([])}
 drawEnemy(e,e.flash>0?2:0);if(e.hp<e.max){ctx.fillStyle='#ff9c88';ctx.fillRect(e.x-e.r,e.y-e.r-10,e.r*2*clamp(e.hp/e.max,0,1),2)}}}
function drawHostile(){for(const b of hostile){if(b.kind==='needle'){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);ctx.drawImage(SPR.needle(),-5,-14,10,28);ctx.restore()}else sprite(b.kind==='big'?SPR.big():SPR.orb(),b.x,b.y,b.r*4.4,1)}ctx.globalAlpha=1}
function drawPlayer(){if(!g||state==='over'||g.dying>0)return;drawFlightTrail();const f=g.flight;
 for(const m of g.wing){drawJet('striker',m.x,m.y,.42,f.bank*.6,.5,g.over>0);}
 ctx.globalAlpha=g.p.inv>0?(reduced?.7:.62+Math.sin(ambient*10)*.18):1;drawJet(g.af.id,g.p.x,g.p.y,.8,f.bank,f.thrust,g.over>0,state==='playing'?f.recoil:0,g.weapon);ctx.globalAlpha=1;
 if(g.over>0){ctx.globalCompositeOperation='lighter';sprite(SPR.gold(),g.p.x,g.p.y,90+Math.sin(ambient*20)*8,.35);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
 if(g.p.inv>0||g.over>0){ctx.strokeStyle=g.over>0?'#ffe19c88':'#94edff66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(g.p.x,g.p.y,30,0,TAU);ctx.stroke()}
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(g.p.x,g.p.y,3,0,TAU);ctx.fill();ctx.strokeStyle='#ff4d6d';ctx.lineWidth=1;ctx.beginPath();ctx.arc(g.p.x,g.p.y,g.af.hitbox,0,TAU);ctx.stroke()}
function drawOverlays(){drawWeather();if(vignette)ctx.drawImage(vignette,0,0,W,H);if(!g)return;
 if(g.hp===1&&!g.practice&&state==='playing'){const a=.16+Math.sin(ambient*4)*.08,gr=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);gr.addColorStop(0,'rgba(255,0,40,0)');gr.addColorStop(1,`rgba(255,20,50,${a})`);ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)}
 if(g.flash>0){ctx.fillStyle=`rgba(${g.flashColor},${Math.min(.42,g.flash*.6)*(reduced?.35:1)})`;ctx.fillRect(0,0,W,H)}
 if(g.warning>0){const k=Math.min(1,(2.8-g.warning)*3,g.warning*3),y=H*.45,pulse=reduced?.8:.6+Math.abs(Math.sin(ambient*5))*.4;ctx.globalAlpha=k;ctx.fillStyle='rgba(60,0,10,.55)';ctx.fillRect(0,y-46,W,92);ctx.save();ctx.beginPath();ctx.rect(0,y-46,W,10);ctx.rect(0,y+36,W,10);ctx.clip();ctx.fillStyle='#ff3d4d';for(let x=-40+(ambient*80)%40;x<W+40;x+=40){ctx.beginPath();ctx.moveTo(x,y-46);ctx.lineTo(x+20,y-46);ctx.lineTo(x+40,y+46);ctx.lineTo(x+20,y+46);ctx.fill()}ctx.restore();
  ctx.textAlign='center';ctx.fillStyle=`rgba(255,80,90,${pulse})`;ctx.font=`900 ${Math.min(54,W*.11)}px system-ui,Arial`;ctx.fillText('WARNING',W/2,y+12);ctx.font='700 12px system-ui,Arial';ctx.fillStyle='#ffd0d4';ctx.fillText(`HUGE ENEMY APPROACHING — ${BOSSES[(g.sector-1)%3].name}`,W/2,y+30);ctx.globalAlpha=1}
 if(g.banner){const b=g.banner,t=b.t,inK=Math.min(1,t/.35),outK=Math.min(1,(b.d-t)/.4),k=Math.min(inK,outK),ease=1-Math.pow(1-inK,3),x=W/2+(1-ease)*-W*.3;ctx.globalAlpha=clamp(k,0,1);ctx.textAlign='center';ctx.fillStyle='rgba(4,12,22,.45)';ctx.fillRect(0,H*.42-40,W,74);ctx.fillStyle='#8ef0ff';ctx.fillRect(W/2-60*ease,H*.42-40,120*ease,2);ctx.font=`900 ${Math.min(40,W*.085)}px system-ui,Arial`;ctx.fillStyle='#eafcff';ctx.fillText(b.title,x,H*.42);ctx.font='700 13px system-ui,Arial';ctx.fillStyle='#9fdcf0';ctx.fillText(b.sub,x,H*.42+22);ctx.globalAlpha=1}
 if(g.combo>=10&&state==='playing'){const a=clamp(g.comboTime/3.8,0,1);ctx.globalAlpha=.25+a*.55;ctx.textAlign='right';ctx.font=`900 ${Math.min(34,W*.07)}px system-ui,Arial`;ctx.fillStyle='#79f0d1';ctx.fillText(g.combo,W-16,H*.58);ctx.font='700 11px system-ui,Arial';ctx.fillText(`CHAIN ×${mult()}`,W-16,H*.58+16);ctx.globalAlpha=1}}
function drawMenuScene(){const af=airframe(),narrow=W<760,hx=narrow?W*.5:W*.76,hy=narrow?H*.9:H*.56+Math.sin(ambient*.9)*8,s=narrow?1.1:Math.min(3,W/320),bank=Math.sin(ambient*.6)*.16;
 shadowColor='rgba(0,8,16,.24)';drawMode=1;drawJet(af.id,hx+30*s,hy+60*s,s*.7,bank);drawJet('striker',hx-70*s,hy+80*s,s*.3,bank);drawJet('striker',hx+90*s,hy+90*s,s*.3,bank);drawMode=0;
 drawClouds(world.clouds,1);drawJet('striker',hx-62*s+Math.sin(ambient*.7)*4,hy+38*s,s*.42,bank,.5);drawJet('striker',hx+62*s+Math.cos(ambient*.8)*4,hy+46*s,s*.42,bank,.5);drawJet(af.id,hx,hy,s,bank,.55+Math.sin(ambient*2)*.1)}
function draw(){for(const r of controlRects)r.b.dataset.overlap=String(state==='playing'&&!!g&&g.p.x+24>r.left&&g.p.x-24<r.right&&g.p.y+24>r.top&&g.p.y-27<r.bottom);ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.save();if(g?.shake&&state==='playing')ctx.translate(rand(-g.shake,g.shake),rand(-g.shake,g.shake));drawGround();
 if(!g){drawMenuScene();drawClouds(world.high,.5);ctx.restore();if(vignette)ctx.drawImage(vignette,0,0,W,H);return}
 drawShadows();drawClouds(world.clouds,1);for(const d of drops)drawDrop(d);ctx.globalAlpha=1;drawShots();drawBeams();drawEnemies();drawParticles();drawClouds(world.high,.55);drawHostile();drawPlayer();drawLabels();ctx.restore();drawOverlays()}

let accumulator=0,frameAvg=1/60;
function loop(t){const real=Math.min((t-last)/1000||0,.1);last=t;ambient+=reduced?real*.3:real;frameAvg+=(real-frameAvg)*.05;if(frameAvg>.027&&quality>.55)quality=.55;
 if(state==='playing'){g.timeScale=Math.min(1,g.timeScale+real*.55);if(g.hitstop>0)g.hitstop-=real;else{accumulator+=real*g.timeScale;while(accumulator>=1/120){update(1/120);accumulator-=1/120;if(state!=='playing'){accumulator=0;break}}}}
 else{accumulator=0;if(state!=='paused'){world.speed=state==='menu'?.9:.6;updateWorld(real);updateFx(real)}}
 draw();audio?.engineTick();audio?.tick();requestAnimationFrame(loop)}

const weaponIcons=[
 '<path d="M8 19V8m8 11V8M6 5l2-3 2 3m4 0 2-3 2 3"/>',
 '<path d="M12 2v20M8 8v8m8-8v8M9 3h6M9 21h6"/>',
 '<circle cx="15" cy="8" r="5"/><path d="M15 1v3m0 8v3m-7-7h3m8 0h3M3 22v-7q0-7 9-7"/>',
 '<path d="M12 22V5M4 4l8 18 8-18M2 8l2-4 4 1m8 0 4-1 2 4M9 7l3-3 3 3"/>'
];
$('weapons').innerHTML=weaponNames.map((n,i)=>`<button id="weapon${i}" data-weapon="${i}" title="${weaponHelp[i]} / X キーで切替" aria-label="${weaponHelp[i]}に切り替え" disabled><svg viewBox="0 0 24 24" aria-hidden="true">${weaponIcons[i]}</svg><span class="ammo" id="ammo${i}">—</span><small>${['通常','光線','追尾','散弾'][i]}</small></button>`).join('');$('bomb').disabled=true;$('boost').disabled=true;resize();menu();requestAnimationFrame(loop);
