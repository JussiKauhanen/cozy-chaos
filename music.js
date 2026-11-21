// Cozy Chaos BGM — an original late-90s "jet-ski fusion" groove, synthesized live with Web Audio.
// Funky slap-ish bass, electric-piano stabs, a breezy lead with a watery echo, and a crisp little kit.
// Usage: BGM.start(), BGM.stop(), BGM.toggle(), BGM.setSpeed(1..2.6). Shares one AudioContext via audioCtx().
(() => {
  let ctx, master, music, echoIn, noise;
  window.audioCtx = () => ctx || (ctx = new AudioContext());

  const BASE_BPM = 116;
  const VOLUME = .3;                 // music level (sound effects have their own, in sfx.js)
  const midi = m => 440 * 2 ** ((m - 69) / 12);

  // ---- harmony: four-bar loops, bass root + chord voicing (midi numbers) ----
  const A = [
    { root: 41, chord: [57, 60, 64, 67] },   // Fmaj9
    { root: 40, chord: [55, 59, 62, 64] },   // Em7
    { root: 38, chord: [53, 57, 60, 64] },   // Dm9
    { root: 43, chord: [53, 57, 59, 64] },   // G13
  ];
  const B = [
    { root: 46, chord: [58, 62, 65, 69] },   // Bbmaj7
    { root: 45, chord: [55, 60, 64, 67] },   // Am7
    { root: 43, chord: [53, 58, 62, 69] },   // Gm9
    { root: 48, chord: [58, 65, 67, 70] },   // C7sus
  ];
  // ---- lead lines: [step, midi] per bar (16 steps = one bar) ----
  const LEAD_A = [
    [[0, 69], [3, 72], [6, 74], [8, 76], [12, 74], [14, 72]],
    [[0, 67], [3, 71], [6, 74], [10, 72], [12, 71], [14, 67]],
    [[0, 69], [2, 72], [4, 76], [7, 77], [10, 76], [12, 74], [14, 72]],
    [[0, 74], [6, 71], [8, 72], [10, 74], [12, 79]],
  ];
  const LEAD_B = [
    [[0, 77], [3, 76], [6, 74], [8, 69], [12, 72], [14, 74]],
    [[0, 76], [4, 72], [6, 69], [8, 67], [12, 69]],
    [[0, 70], [3, 74], [6, 77], [8, 81], [14, 79]],
    [[0, 79], [4, 77], [8, 74], [10, 72], [12, 70], [14, 72]],
  ];
  // song: intro groove (no lead) -> A -> B -> A, 4 bars each, then loop
  const SONG = [{ ch: A, lead: null }, { ch: A, lead: LEAD_A }, { ch: B, lead: LEAD_B }, { ch: A, lead: LEAD_A }];
  const BASS = [[0, 0], [3, 0], [6, 12], [8, 0], [10, 7], [11, 12], [14, 10]];   // [step, semitones over root]
  const STABS = [2, 6, 10, 13];

  function init() {
    audioCtx();
    master = ctx.createGain(); master.gain.value = .0001;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 1; music.connect(master);
    // watery echo for the lead
    echoIn = ctx.createGain();
    const d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.delayTime.value = .29; fb.gain.value = .32; lp.type = 'lowpass'; lp.frequency.value = 2200;
    echoIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(music);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }

  // ---- instruments ----
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur) }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    env(g, t, .002, .9, .2); o.connect(g).connect(music); o.start(t); o.stop(t + .22);
  }
  function noiseHit(t, type, freq, peak, dur) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    env(g, t, .001, peak, dur); s.connect(f).connect(g).connect(music); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function snare(t) {
    noiseHit(t, 'bandpass', 1900, .5, .16);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 190;
    env(g, t, .001, .3, .09); o.connect(g).connect(music); o.start(t); o.stop(t + .1);
  }
  const hat = (t, open, accent) => noiseHit(t, 'highpass', 7500, accent ? .16 : .08, open ? .22 : .035);
  function bass(t, m, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = o2.frequency.value = midi(m); o2.detune.value = -1200;
    f.type = 'lowpass'; f.Q.value = 7; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(260, t + .14);
    env(g, t, .004, .42, dur); o.connect(f); o2.connect(f); f.connect(g).connect(music);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  }
  function ep(t, notes, dur, peak) {          // electric piano: sine + a bell-ish overtone
    for (const m of notes) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
      o.frequency.value = midi(m); o2.frequency.value = midi(m) * 4; o2.type = 'sine';
      env(g, t, .005, peak, dur); env(g2, t, .002, peak * .25, .12);
      o.connect(g).connect(music); o2.connect(g2).connect(music);
      o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + .15);
    }
  }
  function lead(t, m, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'square'; o2.type = 'sawtooth'; o.frequency.value = o2.frequency.value = midi(m); o2.detune.value = 7;
    lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(midi(m) * .012, t + Math.min(dur, .35));
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    f.type = 'lowpass'; f.frequency.value = 2600;
    env(g, t, .02, .085, dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(music); g.connect(echoIn);
    for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + dur + .05) }
  }

  // ---- sequencer ----
  let step = 0, nextT = 0, timer = null, bpm = BASE_BPM;
  const stepDur = () => 60 / bpm / 4;
  function play(s, t) {
    const bar = Math.floor(s / 16) % 16, sec = SONG[Math.floor(bar / 4)], b = bar % 4, i = s % 16, sd = stepDur();
    const { root, chord } = sec.ch[b];
    if (i === 0 || i === 8 || (i === 11 && b % 2)) kick(t);
    if (i === 4 || i === 12) snare(t);
    if (i === 15 && b === 3) snare(t + sd * .5);                  // little fill into the next phrase
    hat(t, i === 14, i % 4 === 2);
    for (const [st, iv] of BASS) if (st === i) bass(t, root + iv, sd * 1.5);
    if (i === 0) ep(t, chord, sd * 6, .045);
    if (STABS.includes(i)) ep(t, chord, sd * .9, .05);
    if (sec.lead) {
      const line = sec.lead[b], k = line.findIndex(([st]) => st === i);
      if (k >= 0) { const nxt = line[k + 1] ? line[k + 1][0] : 16; lead(t, line[k][1], Math.min(nxt - i, 4) * sd * .95) }
    }
  }
  function pump() {
    while (nextT < ctx.currentTime + .12) { play(step, nextT); nextT += stepDur(); step++ }
  }

  let on = true;
  try { on = localStorage.cozyBgm !== 'off' } catch (e) {}
  window.BGM = {
    get on() { return on },
    start() {
      if (!on) return;
      if (!master) init();
      ctx.resume();
      if (timer) return;
      step = 0; nextT = ctx.currentTime + .05;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(VOLUME, ctx.currentTime, .3);
      timer = setInterval(pump, 25);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      master.gain.setTargetAtTime(.0001, ctx.currentTime, .15);
    },
    toggle() {
      on = !on; try { localStorage.cozyBgm = on ? 'on' : 'off' } catch (e) {}
      on ? this.start() : this.stop();
      return on;
    },
    setSpeed(sp) { bpm = BASE_BPM * (1 + (sp - 1) * .3) },      // the band speeds up with the game
    tension() {},                                                // (no hurry-up layer in this track)
    duck(down) { if (master && timer) master.gain.setTargetAtTime(down ? VOLUME * .35 : VOLUME, ctx.currentTime, .2) },
  };
})();
