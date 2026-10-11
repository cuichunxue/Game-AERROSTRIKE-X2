'use strict';
// AERROSTRIKE X — AFTERBURN
// Shared helpers, persistent data, airframes, sector themes and boss roster.
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const store={
 get(k,f){try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v)}catch{return f}},
 set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
};
function buzz(p){if(reduced)return;try{if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(p)}catch{}}

let music=store.get('ax-music',1)!==0,muted=store.get('ax-muted',0)===1,trained=store.get('ax-trained',0)===1;
let records=store.get('ax-records',null)||{easy:0,normal:0},lastRuns=store.get('ax-runs',null)||{};
let hangar=Object.assign({selected:'striker',unlocked:['striker'],seen:['striker']},store.get('ax-hangar',null)||{});
let career=Object.assign({flights:0,kills:0,bestSector:1,bestScore:0},store.get('ax-career',null)||{});
let W=900,H=650,dpr=1,state='menu',mode='normal',last=0,ambient=0,keys={},pointer=null,quality=1;
let controlRects=[],suppressControlClickUntil=0;
let g,shots=[],enemies=[],hostile=[],particles=[],rings=[],drops=[],labels=[],beams=[],best=0,audio;

const weaponNames=['PULSE','LASER','SEEKER','SPREAD'],weaponLabels=['通常','レーザー','追尾弾','散弾'];
const weaponHelp=['通常：弾数無制限','レーザー：直線に集中攻撃','追尾弾：照準を合わせず攻撃','散弾：広い範囲を攻撃'];
const AMMO_FULL=[Infinity,80,28,60];

// Three airframes with distinct silhouettes and handling. Stats: [機動, 火力, 装甲] on a 1–5 scale.
const AIRFRAMES=[
 {id:'striker',name:'XF-2 STRIKER',role:'万能型',desc:'双発・可変後退翼の制空機。素直な操縦性で、どんな空でも戦える。',speed:1,hp:0,rate:1,damage:1,hitbox:5,graze:1,stats:[3,3,3],unlock:null},
 {id:'valkyrie',name:'VF-9 VALKYRIE',role:'高機動・かすり特化',desc:'前進翼とカナードの迎撃機。当たり判定が最小で、敵弾をかすめるほど必殺技が溜まる。火力は控えめ。',speed:1.22,hp:0,rate:1.15,damage:.84,hitbox:3.5,graze:1.8,stats:[5,2,2],unlock:{sector:3,text:'セクター3到達で解放'}},
 {id:'goliath',name:'AX-7 GOLIATH',role:'重装甲・高火力',desc:'四発の重攻撃機。一撃が重くライフ+1。ただし機体が大きく被弾しやすい。',speed:.84,hp:1,rate:.85,damage:1.32,hitbox:7.5,graze:.7,stats:[1,5,4],unlock:{score:25000,text:'1回で25,000点到達で解放'}}
];
const airframe=id=>AIRFRAMES.find(a=>a.id===(id||hangar.selected))||AIRFRAMES[0];
function checkUnlocks(){const fresh=[];for(const a of AIRFRAMES){if(hangar.unlocked.includes(a.id)||!a.unlock)continue;if((a.unlock.sector&&career.bestSector>=a.unlock.sector)||(a.unlock.score&&career.bestScore>=a.unlock.score)){hangar.unlocked.push(a.id);fresh.push(a)}}if(fresh.length)store.set('ax-hangar',hangar);return fresh}

// Sector environments cycle every five sectors. Every palette stays dark enough that bullets read clearly.
const THEMES=[
 {name:'OCEAN DAWN',jp:'夜明けの洋上',ground:'ocean',sky:['#0d3552','#0f4a6c','#082a42'],cloud:[226,240,255],cloudAlpha:.5,shadow:.26,glare:'#ffb47a'},
 {name:'DESERT CANYON',jp:'灼熱の峡谷',ground:'desert',sky:['#3b2416','#56331d','#2c1a10'],cloud:[255,232,205],cloudAlpha:.28,shadow:.32,glare:'#ffcf86'},
 {name:'NIGHT CITY',jp:'眠らない街',ground:'city',sky:['#060a18','#0b1228','#04060f'],cloud:[120,130,170],cloudAlpha:.32,shadow:.18,glare:'#7a8cff'},
 {name:'STORM FRONT',jp:'雷雲突破',ground:'storm',sky:['#161d29','#202a39','#0e131b'],cloud:[150,165,185],cloudAlpha:.62,shadow:.2,glare:'#c4d8ff'},
 {name:'STRATOSPHERE',jp:'成層圏',ground:'space',sky:['#02040c','#061430','#010208'],cloud:[180,210,255],cloudAlpha:.12,shadow:0,glare:'#6ec8ff'}
];
const BOSSES=[
 {id:'sentinel',name:'SENTINEL',jp:'哨戒要塞'},
 {id:'leviathan',name:'LEVIATHAN',jp:'重爆撃艦'},
 {id:'phantom',name:'PHANTOM',jp:'亡霊戦闘機'}
];
