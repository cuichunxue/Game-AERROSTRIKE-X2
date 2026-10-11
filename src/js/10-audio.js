// Fully synthesized audio: a lookahead music sequencer (menu / stage / boss), layered SFX, reverb and echo.
// Nothing is downloaded; every sound is built from oscillators and a shared noise buffer.
const NOTE_IDX={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const midiOf=n=>{const m=/^([A-G])([#b]?)(\d)$/.exec(n);return 12*(+m[3]+1)+NOTE_IDX[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)};
const hz=m=>440*Math.pow(2,(m-69)/12);
// "A4 . . C5 - ..." → one entry per 16th step; '.' sustains the previous note, '-' is a rest.
function seq(s){const t=s.trim().split(/\s+/),out=new Array(t.length).fill(null);for(let i=0;i<t.length;i++){if(t[i]==='.'||t[i]==='-')continue;let len=1;while(i+len<t.length&&t[i+len]==='.')len++;out[i]={m:midiOf(t[i]),len}}return out}
const TRACKS={
 menu:{bpm:92,style:'menu',
  chords:[[57,60,64,67],[53,57,60,64],[55,59,60,64],[55,59,62,64]],roots:[45,41,48,40],
  lead:seq(`E5 . . . . . . . D5 . . . C5 . . .  C5 . . . . . . . A4 . . . . . . .  G4 . . . . . C5 . . . D5 . . . E5 .  B4 . . . . . . . - . . . . . . .`)},
 stage:{bpm:138,style:'stage',
  chords:[[57,60,64],[53,57,60],[60,64,67],[55,59,62]],roots:[45,41,48,43],
  lead:seq(`A4 . . . E5 . . . D5 . C5 . B4 . C5 .  A4 . . . . . . . - . F4 . A4 . C5 .  G5 . . . E5 . . . C5 . D5 . E5 . G5 .  D5 . . . B4 . . . G4 . A4 . B4 . D5 .`)},
 boss:{bpm:152,style:'boss',
  chords:[[50,53,57],[50,53,58],[48,52,55],[49,52,57]],roots:[38,34,36,33],
  lead:seq(`D5 . . D5 . . F5 . . E5 . . D5 . C5 .  D5 . . . . . A4 . . . Bb4 . . . A4 .  G4 . . C5 . . E5 . . G5 . . F5 . E5 .  E5 . . . C#5 . . . A4 . . . E5 . A5 .`)}
};
const FX_GAP={shot:.055,laser:.06,spread:.06,missile:.12,wing:.09,hit:.04,kill:.045,graze:.05,big:.09,pick:.05,dive:.2};
class Synth{
 constructor(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.c=new AC();
  const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.25;comp.connect(c.destination);
  this.master=c.createGain();this.master.gain.value=muted?0:.85;this.master.connect(comp);
  this.mbus=c.createGain();this.mbus.gain.value=music?.5:0;this.mbus.connect(this.master);
  this.sfx=c.createGain();this.sfx.gain.value=.9;this.sfx.connect(this.master);
  // Shared hall reverb (generated impulse) and a tempo-free echo for arpeggios.
  this.verb=c.createConvolver();this.verb.buffer=this.impulse(2.4,2.8);this.verbIn=c.createGain();this.verbIn.gain.value=.32;this.verbIn.connect(this.verb);this.verb.connect(this.master);
  this.delayIn=c.createGain();this.delayIn.gain.value=.3;const d=c.createDelay(1),fb=c.createGain();d.delayTime.value=.33;fb.gain.value=.34;this.delayIn.connect(d);d.connect(fb);fb.connect(d);d.connect(this.mbus);d.connect(this.verbIn);
  const len=c.sampleRate*2;this.noiseBuf=c.createBuffer(1,len,c.sampleRate);const data=this.noiseBuf.getChannelData(0);for(let i=0;i<len;i++)data[i]=Math.random()*2-1;
  // Jet engine: low triangle plus filtered rumble, both following thrust.
  this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engineGain.connect(this.sfx);
  this.engine=c.createOscillator();this.engine.type='triangle';this.engine.frequency.value=55;this.engine.connect(this.engineGain);this.engine.start();
  this.roar=c.createBufferSource();this.roar.buffer=this.noiseBuf;this.roar.loop=true;this.roarFilter=c.createBiquadFilter();this.roarFilter.type='lowpass';this.roarFilter.frequency.value=380;this.roarGain=c.createGain();this.roarGain.gain.value=.55;this.roar.connect(this.roarFilter);this.roarFilter.connect(this.roarGain);this.roarGain.connect(this.engineGain);this.roar.start();
  this.engineNext=0;this.track=null;this.step=0;this.nextNote=0;this.last={};}
 impulse(sec,decay){const c=this.c,n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)}return b}
 resume(){if(this.c?.state==='suspended')this.c.resume().catch(()=>{});}
 ok(){return this.c&&this.c.state==='running'}
 // Envelope + optional filter chain shared by oscillators and noise.
 shape(src,o,t){const c=this.c;let node=src;if(o.filter){const f=c.createBiquadFilter();f.type=o.filter;f.frequency.setValueAtTime(o.ff,t);if(o.fend)f.frequency.exponentialRampToValueAtTime(o.fend,t+o.d);f.Q.value=o.q||.8;node.connect(f);node=f}
  const a=c.createGain(),att=Math.min(o.a||.004,o.d*.5);a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(Math.max(.0002,o.v),t+att);if(o.hold&&o.hold<o.d)a.gain.setValueAtTime(o.v,t+o.hold);a.gain.exponentialRampToValueAtTime(.0001,t+o.d);
  node.connect(a);a.connect(o.dest||this.sfx);if(o.verb)a.connect(this.verbIn);if(o.echo)a.connect(this.delayIn);}
 voice(o){const c=this.c,t=o.t??c.currentTime,s=c.createOscillator();s.type=o.type||'sine';s.frequency.setValueAtTime(o.f,t);if(o.end)s.frequency.exponentialRampToValueAtTime(Math.max(20,o.end),t+o.d);if(o.detune)s.detune.value=o.detune;this.shape(s,o,t);s.start(t);s.stop(t+o.d+.05)}
 noise(o){const c=this.c,t=o.t??c.currentTime,s=c.createBufferSource();s.buffer=this.noiseBuf;this.shape(s,o,t);s.start(t,Math.random()*1.4);s.stop(t+o.d+.05)}
 tone(f,d=.1,type='sine',v=.1,end=f){if(!this.ok()||muted)return;this.voice({f,d,type,v,end})}
 fx(n){if(!this.ok()||muted)return;const t=this.c.currentTime,gap=FX_GAP[n];if(gap){if(t-(this.last[n]||0)<gap)return;this.last[n]=t}const V=this.voice.bind(this),N=this.noise.bind(this);
  switch(n){
  case 'shot':V({type:'square',f:1150,end:520,d:.045,v:.022,filter:'lowpass',ff:3200});break;
  case 'laser':V({type:'sawtooth',f:2100,end:700,d:.09,v:.026,filter:'lowpass',ff:4200});V({f:1400,end:900,d:.06,v:.03});break;
  case 'missile':N({filter:'bandpass',ff:800,fend:3200,q:1.4,d:.24,v:.09});V({type:'triangle',f:220,end:90,d:.16,v:.03});break;
  case 'spread':V({type:'square',f:520,end:180,d:.07,v:.022,filter:'lowpass',ff:2400});N({filter:'highpass',ff:3000,d:.04,v:.03});break;
  case 'wing':V({type:'square',f:1500,end:800,d:.03,v:.01});break;
  case 'hit':N({filter:'highpass',ff:2600,d:.035,v:.06});V({type:'square',f:260,end:140,d:.04,v:.02});break;
  case 'kill':N({filter:'lowpass',ff:2000,fend:180,d:.4,v:.34,verb:1});V({f:140,end:38,d:.3,v:.34});break;
  case 'big':N({filter:'lowpass',ff:1200,fend:70,d:1.1,v:.5,verb:1});V({f:95,end:28,d:.85,v:.5});N({filter:'highpass',ff:4200,d:.14,v:.1});break;
  case 'part':N({filter:'lowpass',ff:1600,fend:120,d:.7,v:.45,verb:1});V({type:'square',f:320,end:60,d:.32,v:.07,filter:'lowpass',ff:1800});V({f:110,end:30,d:.5,v:.4});break;
  case 'boss':N({filter:'lowpass',ff:900,fend:40,d:2.8,v:.62,verb:1,a:.01});V({f:72,end:20,d:2.2,v:.6});N({filter:'highpass',ff:3800,d:.3,v:.14});for(let i=0;i<5;i++)N({t:t+.25+i*.32,filter:'lowpass',ff:1500,fend:100,d:.5,v:.3,verb:1});break;
  case 'hurt':V({type:'sawtooth',f:440,end:70,d:.42,v:.15,filter:'lowpass',ff:2200});N({filter:'bandpass',ff:900,d:.28,v:.32});V({f:90,end:40,d:.3,v:.3});break;
  case 'down':N({filter:'lowpass',ff:1400,fend:50,d:2,v:.6,verb:1});V({type:'sawtooth',f:300,end:30,d:1.4,v:.12,filter:'lowpass',ff:1200});V({f:80,end:22,d:1.6,v:.5});break;
  case 'nova':N({filter:'bandpass',ff:300,fend:4000,q:1.2,d:.45,v:.28});N({t:t+.32,filter:'lowpass',ff:1500,fend:55,d:1.7,v:.6,verb:1});V({t:t+.32,f:62,end:22,d:1.3,v:.6});break;
  case 'pick':V({f:880,d:.08,v:.09});V({t:t+.06,f:1320,d:.13,v:.08});break;
  case 'power':['C6','E6','G6','C7'].forEach((k,i)=>V({t:t+i*.055,type:'triangle',f:hz(midiOf(k)),d:.16,v:.08,verb:1}));break;
  case 'boost':V({type:'sawtooth',f:160,end:1300,d:.7,v:.08,filter:'lowpass',ff:600,fend:6000});N({filter:'highpass',ff:900,fend:7000,d:.7,v:.1,a:.3});break;
  case 'graze':V({f:2600,end:3200,d:.03,v:.022});break;
  case 'warning':for(let i=0;i<4;i++){V({t:t+i*.6,type:'square',f:880,d:.26,v:.06,filter:'lowpass',ff:2600,hold:.2});V({t:t+i*.6+.3,type:'square',f:660,d:.26,v:.06,filter:'lowpass',ff:2600,hold:.2})}V({type:'sawtooth',f:55,d:2.6,v:.12,a:.4,hold:2,filter:'lowpass',ff:400});break;
  case 'combo':V({type:'triangle',f:1046,d:.12,v:.06});V({t:t+.05,type:'triangle',f:1568,d:.2,v:.06,verb:1});break;
  case 'extend':['G5','C6','E6','G6','C7'].forEach((k,i)=>V({t:t+i*.07,type:'square',f:hz(midiOf(k)),d:.2,v:.04,filter:'lowpass',ff:3000,echo:1}));break;
  case 'ui':V({f:1200,d:.04,v:.035});break;
  case 'select':['C5','E5','G5','C6'].forEach(k=>V({type:'triangle',f:hz(midiOf(k)),d:.6,v:.045,verb:1,a:.01}));break;
  case 'dive':V({type:'square',f:600,end:1250,d:.15,v:.035,filter:'lowpass',ff:2500});break;
  case 'charge':V({f:300,end:1500,d:.9,v:.05,a:.3});break;
  case 'beam':N({filter:'bandpass',ff:1400,q:2.5,d:.7,v:.22,hold:.5});V({type:'sawtooth',f:110,d:.7,v:.07,hold:.5,filter:'lowpass',ff:900});break;
  case 'thunder':N({filter:'lowpass',ff:500,fend:50,d:2.4,v:.4,verb:1,a:.06});break;
  case 'lowhp':V({f:220,d:.12,v:.05});V({t:t+.16,f:196,d:.14,v:.045});break;
  case 'clear':['C5','E5','G5'].forEach((k,i)=>V({t:t+i*.1,type:'square',f:hz(midiOf(k)),d:.12,v:.05,filter:'lowpass',ff:3000}));['C5','E5','G5','C6'].forEach(k=>{V({t:t+.32,type:'square',f:hz(midiOf(k)),d:1.4,v:.035,filter:'lowpass',ff:2800,verb:1,hold:.8});V({t:t+.32,type:'triangle',f:hz(midiOf(k)),d:1.4,v:.04,verb:1,hold:.8})});break;
  case 'record':['C5','E5','G5','C6','E6','G6','C7'].forEach((k,i)=>V({t:t+i*.08,type:'square',f:hz(midiOf(k)),d:.25,v:.04,filter:'lowpass',ff:3200,echo:1}));break;
  case 'over':[['A4',0,.5],['F4',.38,.5],['D4',.76,1.6]].forEach(([k,o,d])=>{V({t:t+o,type:'triangle',f:hz(midiOf(k)),d,v:.08,verb:1,hold:d*.5});V({t:t+o,type:'sine',f:hz(midiOf(k))/2,d,v:.06,hold:d*.5})});break;
  }}
 // Percussion and instruments used by the sequencer. All go to the music bus.
 kick(t,v){this.voice({t,f:155,end:42,d:.3,v,dest:this.mbus});this.noise({t,filter:'highpass',ff:3000,d:.012,v:v*.25,dest:this.mbus})}
 snare(t,v){this.noise({t,filter:'bandpass',ff:1900,q:.7,d:.17,v,dest:this.mbus,verb:1});this.voice({t,type:'triangle',f:200,end:120,d:.1,v:v*.5,dest:this.mbus})}
 hat(t,v,open){this.noise({t,filter:'highpass',ff:7600,d:open?.16:.035,v,dest:this.mbus})}
 bass(t,m,d,v,bright=900){this.voice({t,type:'sawtooth',f:hz(m),d,v,filter:'lowpass',ff:bright,fend:200,q:5,dest:this.mbus})}
 lead(t,m,d,v){for(const det of [-7,7])this.voice({t,type:'square',f:hz(m),d,v,detune:det,a:.015,hold:d*.65,filter:'lowpass',ff:2600,dest:this.mbus,echo:1,verb:1})}
 arp(t,m,v){this.voice({t,type:'triangle',f:hz(m),d:.13,v,dest:this.mbus,echo:1})}
 pad(t,ch,d,v){for(const m of ch)for(const det of [-9,9])this.voice({t,type:'sawtooth',f:hz(m),d,v,detune:det,a:d*.3,hold:d*.6,filter:'lowpass',ff:1100,dest:this.mbus,verb:1})}
 stab(t,ch,v){for(const m of ch)this.voice({t,type:'sawtooth',f:hz(m),d:.2,v,filter:'lowpass',ff:2400,fend:500,dest:this.mbus,verb:1})}
 wantTrack(){if(state==='menu'||state==='upgrade')return 'menu';if(state!=='playing'||!g||g.dying>0||g.bossDeath)return null;return g.boss||g.warning>0?'boss':'stage'}
 tick(){if(!this.ok())return;const want=this.wantTrack(),now=this.c.currentTime;if(want!==this.track){this.track=want;this.step=0;this.nextNote=now+.1}if(!this.track||muted||!music)return;if(this.nextNote<now-.25)this.nextNote=now+.02;const T=TRACKS[this.track],sd=60/T.bpm/4;while(this.nextNote<now+.14){this.playStep(T,this.step,this.nextNote,sd);this.nextNote+=sd;this.step++}}
 playStep(T,step,t,sd){const bars=T.chords.length,bar=Math.floor(step/16)%bars,s=step%16,ch=T.chords[bar],root=T.roots[bar],cycle=Math.floor(step/(16*bars)),hot=g?.over>0,note=T.lead[bar*16+s];
  if(T.style==='menu'){if(s===0||s===8)this.kick(t,.45);if(s%4===2)this.hat(t,.045);if(s===0||s===10)this.bass(t,root,sd*(s?6:9),.16,500);if(s%2===0)this.arp(t,ch[(s/2)%ch.length]+12,.028);if(s===0)this.pad(t,ch,sd*16,.016);if(note&&cycle>0)this.lead(t,note.m,note.len*sd,.03);return}
  if(T.style==='stage'){if(s%4===0||s===10)this.kick(t,.85);if(s===4||s===12)this.snare(t,.42);if(s%4===2)this.hat(t,.11,true);else if(s%2===0||hot)this.hat(t,.06);
   if(s%2===0)this.bass(t,root+[0,0,12,0,0,12,7,12][s/2],sd*1.8,.2);this.arp(t,ch[s%ch.length]+(s>=8?24:12),hot?.035:.024);if(s===0)this.pad(t,ch,sd*16,.012);
   if(note&&cycle%3!==0)this.lead(t,note.m+(cycle%3===2||hot?12:0),note.len*sd,.034);return}
  if(s%4===0||s===6||s===14)this.kick(t,.95);if(s===4||s===12)this.snare(t,.5);if(s===15)this.snare(t,.18);this.hat(t,s%4===2?.1:.05,s%4===2);
  this.bass(t,root+(s%2?12:0),sd*.9,.2,1300);if(s===0||s===3||s===6||s===10)this.stab(t,ch.map(m=>m+12),.03);if(note&&cycle>0)this.lead(t,note.m,note.len*sd,.036);}
 silenceEngine(){if(!this.c||!this.engineGain)return;const t=this.c.currentTime;this.engineGain.gain.cancelScheduledValues(t);this.engineGain.gain.setValueAtTime(0,t);this.engineNext=0;}
 engineTick(){if(!this.ok()||this.c.currentTime<this.engineNext)return;const t=this.c.currentTime;this.engineNext=t+.05;const on=state==='playing'&&!muted&&g&&g.dying<=0,thrust=g?.flight?.thrust||0,hot=g?.over>0;
  this.engine.frequency.setTargetAtTime(52+thrust*30+(hot?22:0),t,.08);this.roarFilter.frequency.setTargetAtTime(260+thrust*900+(hot?700:0),t,.08);this.engineGain.gain.setTargetAtTime(on?.035+thrust*.03+(hot?.02:0):0,t,.06)}
}
function sound(){try{if(!audio)audio=new Synth();audio.resume()}catch{}}
function fx(n){audio?.fx(n)}
