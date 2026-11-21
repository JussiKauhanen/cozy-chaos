// Cozy Chaos sound effects — designed sounds rendered once at load into AudioBuffers ("samples"),
// so they cost nothing to download and play instantly. Needs music.js first (shared audioCtx()).
// Usage: SFX.play('pop', { vol, rate }), const h = SFX.loop('stream'); h.stop(), SFX.stopAll().
(() => {
  const SR = 44100;
  const VOLUME = .4;   // effects level; music.js has its own VOLUME. Tuned so effects sit just above the music.
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- tiny synthesis kit for an OfflineAudioContext ----
  function kit(c) {
    const out = c.createDynamicsCompressor(); out.connect(c.destination);
    let noiseBuf;
    const noiseSrc = () => {
      if (!noiseBuf) { noiseBuf = c.createBuffer(1, SR * 2, SR); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
      const s = c.createBufferSource(); s.buffer = noiseBuf; return s;
    };
    const env = (t, a, peak, d, curve = 'exp') => {
      const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
      if (curve === 'exp') g.gain.exponentialRampToValueAtTime(.0001, t + a + d); else g.gain.linearRampToValueAtTime(0, t + a + d);
      return g;
    };
    return {
      // oscillator with a pitch path: freqs = [[time, hz], ...]
      tone(type, freqs, t, a, peak, d, dest = out) {
        const o = c.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(freqs[0][1], t + freqs[0][0]);
        for (const [ft, f] of freqs.slice(1)) o.frequency.exponentialRampToValueAtTime(f, t + ft);
        const g = env(t, a, peak, d); o.connect(g).connect(dest); o.start(t); o.stop(t + a + d + .05); return o;
      },
      // filtered noise with a filter-frequency path
      noise(ftype, freqs, q, t, a, peak, d, dest = out) {
        const s = noiseSrc(), f = c.createBiquadFilter(); f.type = ftype; f.Q.value = q;
        f.frequency.setValueAtTime(freqs[0][1], t + freqs[0][0]);
        for (const [ft, fr] of freqs.slice(1)) f.frequency.exponentialRampToValueAtTime(fr, t + ft);
        const g = env(t, a, peak, d); s.connect(f).connect(g).connect(dest); s.start(t, rnd(0, 1)); s.stop(t + a + d + .05);
      },
      bell(f, t, peak = .3, d = .6) {                      // sine + inharmonic partial = glassy bell
        this.tone('sine', [[0, f]], t, .002, peak, d);
        this.tone('sine', [[0, f * 2.76]], t, .002, peak * .3, d * .4);
        this.tone('sine', [[0, f * 5.4]], t, .001, peak * .12, d * .2);
      },
      out, c,
    };
  }

  // ---- the sound designs (each: [seconds, render(k)]) ----
  const DESIGNS = {
    pop: [.12, k => { k.tone('sine', [[0, 900], [.07, 260]], 0, .002, .7, .08); k.noise('highpass', [[0, 3000]], .7, 0, .001, .2, .015) }],
    boop: [.18, k => { k.tone('sine', [[0, 520], [.08, 1150]], 0, .004, .5, .12); k.tone('triangle', [[0, 1040], [.08, 2300]], 0, .004, .12, .08) }],
    plip: [.1, k => k.tone('sine', [[0, 1500], [.05, 480]], 0, .002, .45, .06)],
    click: [.05, k => { k.tone('square', [[0, 2200], [.02, 1400]], 0, .001, .18, .018); k.noise('bandpass', [[0, 5000]], 2, 0, .001, .25, .01) }],
    tick: [.06, k => k.bell(1760, 0, .18, .05)],
    swoosh: [.34, k => k.noise('bandpass', [[0, 380], [.26, 4200]], 1.4, 0, .07, .7, .24)],
    chop: [.3, k => {
      k.noise('bandpass', [[0, 900], [.06, 5000]], 1.2, 0, .02, .5, .06);
      k.noise('highpass', [[0, 2500]], .7, .055, .001, .6, .03);
      k.tone('sine', [[0, 190], [.1, 70]], .055, .002, .8, .14);
    }],
    splash: [.55, k => {
      k.noise('lowpass', [[0, 4500], [.4, 700]], .5, 0, .005, .55, .4);
      for (let i = 0; i < 6; i++) { const t = rnd(.04, .35), f = rnd(500, 900); k.tone('sine', [[0, f], [.035, f * 2.4]], t, .002, .22, .04) }
    }],
    boing: [.5, k => {
      const o = k.tone('sine', [[0, 180], [.07, 520]], 0, .003, .55, .42);
      const lfo = k.c.createOscillator(), lg = k.c.createGain(); lfo.frequency.value = 17;
      lg.gain.setValueAtTime(90, .07); lg.gain.exponentialRampToValueAtTime(1, .45);
      lfo.connect(lg).connect(o.frequency); lfo.start(0); lfo.stop(.5);
    }],
    boom: [.9, k => {
      k.noise('lowpass', [[0, 1600], [.6, 120]], .7, 0, .004, .9, .75);
      k.tone('sine', [[0, 85], [.5, 32]], 0, .004, .9, .6);
    }],
    slap: [.2, k => {
      k.noise('bandpass', [[0, 2600]], .6, 0, .001, .95, .06);
      k.noise('lowpass', [[0, 700]], .7, 0, .002, .6, .12);
      k.tone('sine', [[0, 230], [.08, 120]], 0, .001, .4, .08);
    }],
    coin: [.45, k => { k.tone('square', [[0, 988]], 0, .002, .12, .07); k.tone('square', [[0, 1319]], .07, .002, .13, .32) }],
    twinkle: [.9, k => [2093, 2637, 3136, 3951, 4186].forEach((f, i) => k.bell(f, i * .055, .16, .5))],
    bloom: [1.0, k => {
      k.tone('sine', [[0, 300], [.18, 700]], 0, .02, .35, .25);
      [1047, 1319, 1568, 2093].forEach((f, i) => k.bell(f, .12 + i * .07, .2, .6));
    }],
    eek: [.3, k => { k.tone('square', [[0, 820], [.06, 1350]], 0, .003, .12, .06); k.tone('square', [[0, 900], [.07, 1500]], .11, .003, .12, .08) }],
    meow: [.5, k => {
      const o = k.c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, 0); o.frequency.linearRampToValueAtTime(840, .12); o.frequency.linearRampToValueAtTime(880, .2); o.frequency.exponentialRampToValueAtTime(560, .42);
      const g = k.c.createGain(); g.gain.setValueAtTime(.0001, 0); g.gain.exponentialRampToValueAtTime(.5, .04); g.gain.setValueAtTime(.5, .3); g.gain.exponentialRampToValueAtTime(.0001, .46);
      for (const [f, q, v] of [[1000, 6, 1], [1900, 8, .6], [3100, 10, .3]]) {      // vowel-ish formants: "mi-aow"
        const bp = k.c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f * .7, 0); bp.frequency.linearRampToValueAtTime(f, .2); bp.Q.value = q;
        const bg = k.c.createGain(); bg.gain.value = v; o.connect(bp).connect(bg).connect(g);
      }
      g.connect(k.out); o.start(0); o.stop(.5);
    }],
    start: [.6, k => { k.noise('bandpass', [[0, 300], [.22, 3500]], 1.2, 0, .12, .35, .14); k.bell(1319, .22, .28, .35); k.bell(1976, .28, .2, .3) }],
    win: [1.3, k => {
      [1047, 1319, 1568, 2093].forEach((f, i) => k.bell(f, i * .075, .3, .7));
      k.tone('triangle', [[0, 523]], 0, .005, .2, .35); k.tone('triangle', [[0, 784]], .3, .005, .2, .5);
      k.noise('highpass', [[0, 7000]], .5, .3, .2, .06, .6);
    }],
    lose: [1.1, k => {
      [[0, 392], [.28, 370], [.56, 349]].forEach(([t, f], i) => {
        const o = k.c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
        if (i === 2) o.frequency.linearRampToValueAtTime(f * .94, t + .5);
        const lp = k.c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
        lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(1500, t + .1); lp.frequency.exponentialRampToValueAtTime(350, t + (i === 2 ? .5 : .25));
        const g = k.c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + (i === 2 ? .52 : .27));
        o.connect(lp).connect(g).connect(k.out); o.start(t); o.stop(t + .6);
      });
    }],
    faster: [.8, k => { [523, 659, 784, 1047, 1319].forEach((f, i) => k.tone('square', [[0, f]], i * .06, .002, .1, .09)); k.noise('bandpass', [[0, 500], [.4, 6000]], 1, .05, .25, .25, .2) }],
    // 1-second steady water spray for looping
    stream: [1.0, k => {
      const s = k.c.createBufferSource(), d = k.c.createBuffer(1, SR, SR), ch = d.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (.7 + .3 * Math.sin(i / SR * Math.PI * 2 * 7));
      s.buffer = d; const bp = k.c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = .6;
      const lp = k.c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
      const g = k.c.createGain(); g.gain.value = .5; s.connect(bp).connect(lp).connect(g).connect(k.c.destination); s.start(0);
    }],
  };

  // peak level per sound after normalising (default .7); small UI sounds sit lower
  const LEVEL = { click: .35, tick: .3, plip: .45, eek: .45, coin: .5, stream: .5, swoosh: .6, meow: .4, boom: .5, twinkle: .55, slap: 1, splash: .9 };
  const BANK = {};
  let bus, loops = new Set();
  const ready = Promise.all(Object.entries(DESIGNS).map(async ([name, [dur, render]]) => {
    const c = new OfflineAudioContext(1, Math.ceil(SR * dur), SR);
    render(kit(c));
    const buf = await c.startRendering(), d = buf.getChannelData(0);
    let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
    const k = (LEVEL[name] || .7) / (peak || 1); for (let i = 0; i < d.length; i++) d[i] *= k;   // even out loudness
    BANK[name] = buf;
  }));

  function out() {
    const ctx = audioCtx();
    if (!bus) { bus = ctx.createGain(); bus.gain.value = VOLUME; bus.connect(ctx.destination) }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  window.SFX = {
    ready,
    play(name, { vol = 1, rate = 1 } = {}) {
      const buf = BANK[name]; if (!buf) return;
      const ctx = out(), s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol;
      s.connect(g).connect(bus); s.start();
    },
    loop(name, { vol = 1, rate = 1 } = {}) {
      const buf = BANK[name]; if (!buf) return { stop() {} };
      const ctx = out(), s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buf; s.loop = true; s.playbackRate.value = rate;
      g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(vol, ctx.currentTime + .05);
      s.connect(g).connect(bus); s.start();
      const h = { stop() { if (!loops.has(h)) return; loops.delete(h); g.gain.setTargetAtTime(0, ctx.currentTime, .04); s.stop(ctx.currentTime + .3) } };
      loops.add(h); return h;
    },
    stopAll() { [...loops].forEach(h => h.stop()) },
  };
})();
