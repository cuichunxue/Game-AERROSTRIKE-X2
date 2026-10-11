// Procedural art: glow sprites, clouds, and vector airframes for the player, enemies and bosses.
// drawMode lets one shape function render normally, as a ground shadow, or as a white hit flash.
let drawMode=0,shadowColor='rgba(0,8,16,.3)',vignette=null;
const sprites={};
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}
function glow(key,r,stops){if(sprites[key])return sprites[key];const c=makeCanvas(r*2,r*2),x=c.getContext('2d'),gr=x.createRadialGradient(r,r,0,r,r,r);for(const [o,col] of stops)gr.addColorStop(o,col);x.fillStyle=gr;x.fillRect(0,0,r*2,r*2);return sprites[key]=c}
const glowOf=(rgb)=>[[0,'rgba(255,255,255,1)'],[.22,`rgba(${rgb},.9)`],[.55,`rgba(${rgb},.28)`],[1,`rgba(${rgb},0)`]];
const SPR={
 cyan:()=>glow('cyan',32,glowOf('110,228,255')),gold:()=>glow('gold',32,glowOf('255,214,110')),green:()=>glow('green',32,glowOf('140,255,190')),
 orange:()=>glow('orange',32,glowOf('255,150,70')),blue:()=>glow('blue',32,glowOf('130,170,255')),white:()=>glow('white',32,glowOf('230,245,255')),
 red:()=>glow('red',32,glowOf('255,80,90')),violet:()=>glow('violet',32,glowOf('200,120,255')),
 fire:()=>glow('fire',64,[[0,'rgba(255,255,235,1)'],[.18,'rgba(255,226,130,.95)'],[.45,'rgba(255,128,44,.62)'],[.75,'rgba(190,50,20,.22)'],[1,'rgba(120,20,10,0)']]),
 smoke:()=>glow('smoke',64,[[0,'rgba(64,66,72,.6)'],[.55,'rgba(52,54,60,.3)'],[1,'rgba(40,42,48,0)']]),
 orb:()=>glow('orb',16,[[0,'#ffffff'],[.34,'#fff2f8'],[.48,'rgba(255,58,140,1)'],[.7,'rgba(255,30,110,.45)'],[1,'rgba(255,0,90,0)']]),
 big:()=>glow('big',24,[[0,'#ffffff'],[.3,'#fff3d6'],[.46,'rgba(255,140,30,1)'],[.7,'rgba(255,90,20,.4)'],[1,'rgba(255,60,0,0)']]),
 needle:()=>{if(sprites.needle)return sprites.needle;const c=makeCanvas(14,40),x=c.getContext('2d'),gr=x.createLinearGradient(0,0,14,0);gr.addColorStop(0,'rgba(190,80,255,0)');gr.addColorStop(.3,'rgba(210,110,255,.9)');gr.addColorStop(.5,'#ffffff');gr.addColorStop(.7,'rgba(210,110,255,.9)');gr.addColorStop(1,'rgba(190,80,255,0)');x.fillStyle=gr;x.beginPath();x.ellipse(7,20,6,19,0,0,TAU);x.fill();return sprites.needle=c}
};
function sprite(s,x,y,size,alpha=1){if(!s)return;ctx.globalAlpha=alpha;ctx.drawImage(s,x-size/2,y-size/2,size,size)}
function cloudSprite(theme,v){const key='cloud'+theme+'-'+v;if(sprites[key])return sprites[key];const T=THEMES[theme],c=makeCanvas(260,170),x=c.getContext('2d'),[r,gg,b]=T.cloud;let seed=v*97+theme*13+1;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<16;i++){const px=40+rnd()*180,py=50+rnd()*70,pr=26+rnd()*42,shade=py>90?.78:1,gr=x.createRadialGradient(px,py,0,px,py,pr);gr.addColorStop(0,`rgba(${r*shade|0},${gg*shade|0},${b*shade|0},.55)`);gr.addColorStop(1,`rgba(${r*shade|0},${gg*shade|0},${b*shade|0},0)`);x.fillStyle=gr;x.fillRect(0,0,260,170)}return sprites[key]=c}
function makeVignette(){const c=makeCanvas(W,H),x=c.getContext('2d'),gr=x.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.max(W,H)*.75);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');x.fillStyle=gr;x.fillRect(0,0,W,H);vignette=c}

function path(points,fill,stroke){ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.closePath();ctx.fillStyle=drawMode===1?shadowColor:drawMode===2?'#ffffff':fill;ctx.fill();if(stroke&&!drawMode){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
// Mirror a right-hand outline (nose → tail) into a symmetric polygon.
const sym=pts=>pts.concat(pts.slice().reverse().filter(p=>p[0]!==0).map(([x,y])=>[-x,y]));
const flip=pts=>pts.map(([x,y])=>[-x,y]);
function metal(stops,w=20){if(drawMode)return '#000';const gr=ctx.createLinearGradient(-w,0,w,0);gr.addColorStop(0,stops[0]);gr.addColorStop(.42,stops[1]);gr.addColorStop(.55,stops[2]);gr.addColorStop(1,stops[3]);return gr}
function circle(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=drawMode===1?shadowColor:drawMode===2?'#fff':fill;ctx.fill()}

const JET_STYLE={
 striker:{body:['#35546d','#dcebf4','#90afc2','#29465d'],edge:'#b0d1e4',engines:[[-7,19],[7,19]],flame:['#e2ffff','#69d9ff'],hot:['#fff3ba','#ffc66b'],glow:'cyan'},
 valkyrie:{body:['#59606c','#f6f7fa','#c9ced8','#474e5a'],edge:'#ffffff',engines:[[-3.2,25],[3.2,25]],flame:['#fff1f6','#ff6fa6'],hot:['#fff3ba','#ffc66b'],glow:'violet'},
 goliath:{body:['#26332c','#9fb3a6','#64786b','#1c2620'],edge:'#b2c8ba',engines:[[-15,23],[-5,29],[5,29],[15,23]],flame:['#fff6dc','#ffb34d'],hot:['#fffbe0','#ffd36b'],glow:'orange'}
};
// Player-side airframe. thrust 0..1 drives flame length; hot = overdrive; recoil = muzzle flash.
function drawJet(id,x,y,s,bank=0,thrust=.3,hot=false,recoil=0,weapon=0){const S=JET_STYLE[id]||JET_STYLE.striker,A=ctx.globalAlpha;ctx.save();ctx.translate(x,y);ctx.rotate(reduced?bank*.35:bank*.52);ctx.scale(s*(1-Math.abs(bank)*.22),s);
 if(!drawMode){const length=20+thrust*24+(reduced?0:Math.sin(ambient*43)*3);for(const [ex,ey] of S.engines){const fl=ctx.createLinearGradient(ex,ey,ex,ey+4+length);fl.addColorStop(0,(hot?S.hot:S.flame)[0]);fl.addColorStop(.25,(hot?S.hot:S.flame)[1]);fl.addColorStop(1,'rgba(0,0,0,0)');path([[ex-3.6,ey],[ex-4.6,ey+9],[ex,ey+5+length],[ex+4.6,ey+9],[ex+3.6,ey]],fl);for(let i=0;i<3;i++)path([[ex,ey+5+i*7],[ex-1.8,ey+8+i*7],[ex,ey+11+i*7],[ex+1.8,ey+8+i*7]],hot?'#ffe9bbaa':'#ffffff88')}
  ctx.globalCompositeOperation='lighter';for(const [ex,ey] of S.engines)sprite(SPR[hot?'gold':S.glow](),ex,ey+6+thrust*6,26+thrust*22,.75*A);ctx.globalAlpha=A;ctx.globalCompositeOperation='source-over'}
 const M=metal(S.body);
 if(id==='valkyrie'){
  path([[5,4],[24,-9],[30,-7],[28,0],[7,18]],M,S.edge);path(flip([[5,4],[24,-9],[30,-7],[28,0],[7,18]]),M,S.edge);
  path([[4,-18],[13,-15],[13,-11],[5,-11]],M,S.edge);path(flip([[4,-18],[13,-15],[13,-11],[5,-11]]),M,S.edge);
  path([[4,15],[12,23],[12,28],[3,25]],'#4d5562',S.edge);path(flip([[4,15],[12,23],[12,28],[3,25]]),'#3c434e',S.edge);
  path(sym([[0,-39],[3,-29],[5,-14],[6,4],[5,18],[3,27]]),M,S.edge);
  path([[22,-7],[28,-6],[27,-3],[21,-4]],'#e8434f');path(flip([[22,-7],[28,-6],[27,-3],[21,-4]]),'#e8434f');path([[-1,-6],[1,-6],[1.5,14],[-1.5,14]],'#e8434f');
 }else if(id==='goliath'){
  path([[9,-5],[38,11],[38,19],[10,17]],M,S.edge);path(flip([[9,-5],[38,11],[38,19],[10,17]]),M,S.edge);
  for(const sx of [-1,1]){path([[sx*12,0],[sx*18,0],[sx*18,23],[sx*12,23]],'#26342c','#8aa496');path([[sx*24,8],[sx*26,8],[sx*26,16],[sx*24,16]],'#f0f2ea');path([[sx*30,10],[sx*32,10],[sx*32,17],[sx*30,17]],'#f0f2ea')}
  path([[8,20],[21,27],[21,31],[7,29]],'#4b5d52',S.edge);path(flip([[8,20],[21,27],[21,31],[7,29]]),'#3a4a41',S.edge);
  path(sym([[0,-31],[6,-22],[9,-6],[10,20],[7,30]]),M,S.edge);path([[-9,2],[9,2],[9,5],[-9,5]],'#ff9a3c');
 }else{
  path([[0,-32],[7,-11],[13,-4],[30,15],[28,21],[11,13],[10,22],[-10,22],[-11,13],[-28,21],[-30,15],[-13,-4],[-7,-11]],M,S.edge);
  path([[-7,-5],[-12,4],[-10,18],[-5,19]],'#183649','#7093a8');path([[7,-5],[12,4],[10,18],[5,19]],'#102938','#7093a8');
  path([[0,-33],[5,-9],[4,21],[0,25],[-4,21],[-5,-9]],M,'#d5e8f4');
  path([[-7,9],[-15,21],[-15,26],[-7,20]],'#6086a0','#c2e0ee');path([[7,9],[15,21],[15,26],[7,20]],'#385c76','#97bbd1');
 }
 if(!drawMode){const gl=ctx.createLinearGradient(-3,-25,4,-5);gl.addColorStop(0,'#e0ffff');gl.addColorStop(.28,'#67cce9');gl.addColorStop(1,'#12354e');const top=id==='valkyrie'?-31:id==='goliath'?-25:-24;path([[0,top],[3,top+6],[3,top+16],[0,top+19],[-3,top+16],[-3,top+6]],gl,'#a4d8ec');
  const wx=id==='goliath'?37:id==='valkyrie'?29:26,wy=id==='goliath'?15:id==='valkyrie'?-6:16;ctx.fillStyle='#ff6b5e';ctx.fillRect(-wx-1,wy,3,2);ctx.fillStyle='#62ffb8';ctx.fillRect(wx-1,wy,3,2);
  if(Math.sin(ambient*6)>.6){ctx.globalCompositeOperation='lighter';sprite(SPR.red(),-wx,wy+1,10,.8*A);sprite(SPR.green(),wx,wy+1,10,.8*A);ctx.globalAlpha=A;ctx.globalCompositeOperation='source-over'}
  if(recoil>0){const color=['#c0f8ff','#91caff','#ffcc91','#b5ffca'][weapon];ctx.globalAlpha=recoil*A;for(const side of [-1,1]){const mx=side*8;path([[mx-2,-19],[mx,-29-recoil*7],[mx+2,-19]],color)}ctx.globalCompositeOperation='lighter';sprite(SPR[['cyan','blue','orange','green'][weapon]](),0,-28,30*recoil,recoil*A);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=A}}
 ctx.restore()}

// Enemy craft point down the screen. type: 0 dart, 1 weaver, 2 gunship, 3 diver, 4 swooper, 5 carrier.
const ENEMY_ART={
 0:{s:1,draw(){path([[0,-29],[8,-8],[31,17],[29,23],[9,15],[9,24],[-9,24],[-9,15],[-29,23],[-31,17],[-8,-8]],'#803d4b','#ed8b7b');path([[0,-29],[6,6],[4,24],[-4,24],[-6,6]],'#cd6d68');path([[0,-18],[4,-2],[0,6],[-4,-2]],'#ffce85')},engines:[[0,24]]},
 1:{s:1,draw(){path(sym([[0,-20],[8,-6],[27,8],[23,15],[8,9],[0,15]]),'#5b3570','#d48cf0');path(sym([[0,-14],[4,-2],[0,6]]),'#b26ad6');circle(0,0,4,'#ffb8f6')},engines:[[-6,12],[6,12]]},
 2:{s:1,draw(){path([[10,-6],[35,4],[35,14],[10,13]],'#5a3b38','#ff9474');path(flip([[10,-6],[35,4],[35,14],[10,13]]),'#4a302e','#ff9474');path(sym([[0,-32],[9,-20],[12,20],[7,29]]),'#6c4341','#ffa588');path([[-14,8],[-8,8],[-8,26],[-14,26]],'#3b2726');path([[14,8],[8,8],[8,26],[14,26]],'#3b2726');circle(0,-4,7,'#2a1b1b');circle(0,-4,3.5,'#ffcf7a')},engines:[[-11,27],[11,27]]},
 3:{s:1,draw(){path(sym([[0,-27],[15,14],[6,8],[0,18]]),'#3d3420','#ffd25a');path(sym([[0,-18],[5,4],[0,9]]),'#ffd25a');path([[-1.5,-24],[1.5,-24],[1.5,6],[-1.5,6]],'#23200f')},engines:[[0,16]]},
 4:{s:1,draw(){path(sym([[0,-18],[15,12],[0,6]]),'#2c4b57','#ff6a5a');path(sym([[0,-12],[4,4],[0,6]]),'#ff8c6e')},engines:[[0,8]]},
 5:{s:1,draw(){for(const [rx,ry] of [[-18,-12],[18,-12],[-18,12],[18,12]]){circle(rx,ry,9,'#1f3a2e');if(!drawMode){ctx.strokeStyle='#9dffc266';ctx.lineWidth=1.4;ctx.beginPath();const a=ambient*30;ctx.moveTo(rx+Math.cos(a)*9,ry+Math.sin(a)*9);ctx.lineTo(rx-Math.cos(a)*9,ry-Math.sin(a)*9);ctx.stroke()}}path([[-12,-16],[12,-16],[18,0],[12,16],[-12,16],[-18,0]],'#2c4a3c','#9dffc2');path([[-7,-6],[7,-6],[7,6],[-7,6]],'#163024','#9dffc2');if(!drawMode){ctx.fillStyle='#bfffd8';ctx.font='bold 11px system-ui,Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('P',0,1);ctx.textBaseline='alphabetic'}},engines:[]}
};
function drawEnemy(e,mode=0){const art=ENEMY_ART[e.type];ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.type===5?0:Math.PI+(e.tilt||0));const s=e.r/(e.type===2?26:e.type===5?22:e.type===3||e.type===4?16:17)*.95;ctx.scale(s,s);drawMode=mode;
 if(!mode&&art.engines.length){ctx.globalCompositeOperation='lighter';for(const [ex,ey] of art.engines)sprite(SPR[e.type===3&&e.dash?'gold':'orange'](),ex,ey+6,e.type===3&&e.dash?40:20+Math.sin(ambient*40+e.x)*3,.85);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
 art.draw();drawMode=0;ctx.restore()}

// Bosses: SENTINEL (fortress wing + pods), LEVIATHAN (heavy bomber + turrets), PHANTOM (stealth fighter).
function drawBoss(e,mode=0){const B=BOSSES[e.kind].id,s=e.r/(B==='leviathan'?80:B==='phantom'?52:55),rage=e.hp/e.max<.5;ctx.save();ctx.translate(e.x,e.y);ctx.scale(s,s);drawMode=mode;
 if(B==='sentinel'){path([[-65,12],[-44,-18],[-17,-12],[0,-35],[17,-12],[44,-18],[65,12],[45,38],[18,24],[0,37],[-18,24],[-45,38]],'#3c445b','#e58283');path([[-44,-10],[-20,-4],[-24,14],[-46,22]],'#2b3145');path([[44,-10],[20,-4],[24,14],[46,22]],'#2b3145');path([[-20,-10],[20,-10],[27,15],[0,28],[-27,15]],'#a95d62','#ffc19d');
  if(!mode){ctx.fillStyle=rage?'#fff0a6':'#ff766c';ctx.fillRect(-13,0,26,7);ctx.globalCompositeOperation='lighter';sprite(SPR[rage?'gold':'red'](),0,4,60+Math.sin(ambient*8)*8,.9);sprite(SPR.orange(),-30,-22,26,.7);sprite(SPR.orange(),30,-22,26,.7);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}}
 else if(B==='leviathan'){path([[-118,-6],[-30,-22],[0,-58],[30,-22],[118,-6],[112,10],[30,18],[16,52],[-16,52],[-30,18],[-112,10]],'#3a3f37','#c9a35a');path([[-110,-2],[-34,-12],[-34,8],[-108,8]],'#2d312a');path([[110,-2],[34,-12],[34,8],[108,8]],'#2d312a');path(sym([[0,-50],[14,-24],[16,30],[10,50]]),'#555a4c','#e6c27a');for(const x of [-82,-62,62,82])path([[x-5,-6],[x+5,-6],[x+5,12],[x-5,12]],'#1e211c','#8a7a4e');
  if(!mode){ctx.globalCompositeOperation='lighter';for(const x of [-82,-62,62,82])sprite(SPR.orange(),x,-12,24+Math.sin(ambient*30+x)*4,.8);sprite(SPR[rage?'red':'gold'](),0,4,70+Math.sin(ambient*6)*10,.85);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;circle(0,4,9,rage?'#ffdddd':'#fff3c4')}}
 else{const flick=mode?1:.75+Math.sin(ambient*20)*.1;ctx.globalAlpha=e.cloak?flick*.55:1;path([[-70,26],[-30,-4],[0,-48],[30,-4],[70,26],[40,20],[22,34],[0,22],[-22,34],[-40,20]],'#14121e','#a372ff');path(sym([[0,-40],[9,-8],[6,18],[0,22]]),'#221e33','#c49bff');if(!mode){ctx.globalCompositeOperation='lighter';for(const x of [-34,34])sprite(SPR.violet(),x,8,34,.8);sprite(SPR[rage?'red':'violet'](),0,-6,48+Math.sin(ambient*12)*6,.9);ctx.globalCompositeOperation='source-over'}ctx.globalAlpha=1}
 drawMode=0;ctx.restore();
 if(!mode)for(const p of e.parts){const px=e.x+p.ox*s,py=e.y+p.oy*s;if(p.dead){circle(px,py,p.r*.7,'#16130f');continue}ctx.save();ctx.translate(px,py);drawMode=p.flash>0?2:0;circle(0,0,p.r,'#2a2d33');circle(0,0,p.r*.62,'#4a4e57');const a=Math.atan2(g.p.y-py,g.p.x-px);ctx.rotate(a);path([[0,-3],[p.r+8,-3],[p.r+8,3],[0,3]],'#6a6f79','#d7dce6');drawMode=0;ctx.restore();ctx.fillStyle='#ff9c88';ctx.fillRect(px-p.r,py-p.r-7,p.r*2*clamp(p.hp/p.max,0,1),2)}}

function drawDrop(d){const col={heal:'#aaffb9',ammo:'#ffe498',power:'#ff8a5c',bomb:'#ffb35c'}[d.type],txt={heal:'+',ammo:'A',power:'P',bomb:'B'}[d.type],pulse=1+Math.sin(ambient*8+d.x)*.12;
 ctx.globalCompositeOperation='lighter';sprite(SPR[d.type==='heal'?'green':d.type==='ammo'?'gold':'orange'](),d.x,d.y,44*pulse,.55);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.type==='power'?0:ambient*1.4);ctx.strokeStyle=col;ctx.fillStyle='#0c1a24ee';ctx.lineWidth=2;if(d.type==='power'){ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU+ambient;ctx.lineTo(Math.cos(a)*12,Math.sin(a)*12)}ctx.closePath();ctx.fill();ctx.stroke()}else{ctx.fillRect(-9,-9,18,18);ctx.strokeRect(-10,-10,20,20)}ctx.restore();
 ctx.fillStyle=col;ctx.font='bold 14px system-ui,Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,d.x,d.y+1);ctx.textBaseline='alphabetic'}
