'use strict';

// Original stage loops. Positions are sixteenth-note steps across two bars.
const RACE_TRACKS=[
  {bpm:112, root:33, scale:[0,3,7,10,12], voice:'bell',
   riff:[[0,4],[3,2],[6,3],[10,1],[14,2],[16,4],[20,3],[23,2],[27,0],[30,1]],
   kick:[0,7,10,16,22,26], bass:[0,7,16,22,26], hats:[2,6,10,14,18,22,26,30]},
  {bpm:124, root:38, scale:[0,2,5,7,9], voice:'pluck',
   riff:[[0,0],[2,2],[4,4],[7,3],[10,4],[13,2],[16,1],[18,3],[21,4],[24,3],[28,2]],
   kick:[0,4,8,12,16,20,24,28], bass:[2,6,10,14,18,22,26,30], hats:[2,6,10,14,18,22,26,30]},
  {bpm:132, root:36, scale:[0,3,5,7,12], voice:'stab',
   riff:[[1,0],[4,0],[7,2],[8,1],[12,3],[15,2],[17,0],[20,0],[23,4],[24,3],[28,1],[31,2]],
   kick:[0,5,8,14,16,21,24,30], bass:[0,5,8,14,16,21,24,30], hats:[2,6,9,11,14,18,22,25,27,30]},
  {bpm:144, root:34, scale:[0,1,5,7,10], voice:'bell',
   riff:[[0,2],[2,1],[3,0],[6,2],[8,3],[11,2],[14,4],[16,2],[18,1],[19,0],[23,3],[26,1],[28,2],[30,0]],
   kick:[0,3,7,14,16,19,25,30], bass:[0,3,7,14,16,19,25,30], hats:[2,4,6,10,12,14,15,18,20,22,26,28,30,31]},
  {bpm:156, root:40, scale:[0,2,3,7,12], voice:'pluck',
   riff:[[0,4],[3,3],[6,2],[9,3],[12,1],[14,2],[16,4],[19,3],[22,2],[25,0],[28,1],[29,2],[31,3]],
   kick:[0,7,10,16,19,26,29], bass:[0,4,7,10,16,19,23,26,29], hats:[2,4,6,10,14,18,20,22,26,28,30]},
  {bpm:170, root:35, scale:[0,1,3,6,12], voice:'stab',
   riff:[[0,0],[2,4],[3,3],[6,2],[8,0],[11,1],[14,3],[16,0],[18,4],[19,3],[22,2],[24,1],[26,3],[29,4],[31,1]],
   kick:[0,4,7,10,14,16,20,23,26,30], bass:[0,4,7,10,14,16,20,23,26,30], hats:[2,5,6,9,12,14,15,18,21,22,25,28,30,31]}
];

class RaceAudio {
  constructor(context){
    this.context=context;
    this.noise=context.createBuffer(1,Math.ceil(context.sampleRate*.18),context.sampleRate);
    const samples=this.noise.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    this.loop=null;
  }

  tone(out,time,frequency,type,volume,duration,endFrequency=frequency,attack=.005){
    const osc=this.context.createOscillator();
    const envelope=this.context.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(frequency,time);
    if(endFrequency!==frequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,time+duration*.72);
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.linearRampToValueAtTime(volume,time+attack);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(envelope);envelope.connect(out);
    osc.start(time);osc.stop(time+duration+.008);
  }

  drumNoise(out,time,frequency,volume,duration){
    const source=this.context.createBufferSource();
    const filter=this.context.createBiquadFilter();
    const envelope=this.context.createGain();
    source.buffer=this.noise;
    filter.type='highpass';
    filter.frequency.value=frequency;
    envelope.gain.setValueAtTime(volume,time);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter);filter.connect(envelope);envelope.connect(out);
    source.start(time);source.stop(time+duration);
  }

  cue(name){
    const now=this.context.currentTime+.01, out=this.context.destination;
    if(name==='ready')this.tone(out,now,440,'triangle',.13,.19);
    if(name==='set')this.tone(out,now,660,'triangle',.15,.22);
    if(name==='go'){
      this.tone(out,now,880,'triangle',.17,.27);
      this.tone(out,now+.06,1320,'sine',.10,.30);
    }
  }

  schedule(stage){
    const now=this.context.currentTime;
    if(this.loop?.stage!==stage){
      this.stop();
      const bus=this.context.createGain();
      bus.gain.value=.68;
      bus.connect(this.context.destination);
      this.loop={stage,bus,step:0,time:now+.035};
    }
    const loop=this.loop, track=RACE_TRACKS[stage];
    const interval=60/track.bpm/4;
    // Skip overdue steps when animation stalls to avoid playing a burst at once.
    if(loop.time<now){
      const skipped=Math.ceil((now-loop.time)/interval);
      loop.step+=skipped;
      loop.time+=skipped*interval;
    }
    while(loop.time<now+.12){
      this.playStep(track,loop.bus,loop.time,loop.step,interval);
      loop.step++;
      loop.time+=interval;
    }
  }

  playStep(track,out,time,step,interval){
    const position=step%32;
    const secondPhrase=Math.floor(step/32)%2===1;
    const hz=note=>440*2**((note-69)/12);
    if(track.kick.includes(position))this.tone(out,time,115,'sine',.17,.22,43);
    if(position%16===8||track.voice==='pluck'&&position%16===4){
      this.drumNoise(out,time,1250,.09,.12);
      this.tone(out,time,181,'triangle',.035,.10,105);
    }
    if(track.hats.includes(position))this.drumNoise(out,time,6500,position%4===2?.055:.032,.046);
    if(track.bass.includes(position)){
      const note=track.root+(secondPhrase&&position>=16?-2:0);
      this.tone(out,time,hz(note),'sine',.095,interval*2.7,hz(note)*.98);
    }
    const hit=track.riff.find(([offset])=>offset===position);
    if(hit){
      const note=track.root+24+track.scale[hit[1]]+(secondPhrase&&position>=24?-5:0);
      const pitch=hz(note);
      if(track.voice==='bell'){
        this.tone(out,time,pitch,'triangle',.075,.24);
        this.tone(out,time,pitch*2.76,'sine',.021,.10);
      }else if(track.voice==='pluck'){
        this.tone(out,time,pitch,'triangle',.075,.21);
        this.tone(out,time+interval*1.5,pitch,'sine',.025,.18);
      }else{
        this.tone(out,time,pitch,'triangle',.085,.17,pitch*.95);
        this.tone(out,time,pitch*.5,'triangle',.032,.15);
      }
    }
  }

  stop(){
    if(!this.loop)return;
    const {bus}=this.loop, now=this.context.currentTime;
    bus.gain.setTargetAtTime(0,now,.024);
    setTimeout(()=>bus.disconnect(),180);
    this.loop=null;
  }
}
