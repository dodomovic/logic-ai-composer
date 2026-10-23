// Drum programming engine: genre grooves, section-aware arrangement, fills, build-ups and swing,
// written to separate Kick / Snare & Clap / Hats / Percussion / Cymbals tracks (GM drum map,
// channel 10) so each can be mixed on its own in Logic Pro.

const N = {
  kick: 36, snare: 38, clap: 39, rim: 37, ch: 42, ph: 44, oh: 46, crash: 49, ride: 51, rideBell: 53,
  tamb: 54, shaker: 70, clave: 75, congaHi: 63, congaLo: 64, bongoHi: 60, bongoLo: 61,
  tomLo: 45, tomMid: 47, tomHi: 50,
};

// Per-style settings. Velocities follow how these records are programmed: kicks steady and loud,
// hats with an accent shape, percussion quieter and syncopated.
export const DRUM_STYLES = {
  // Tiësto-style trance (136–140 BPM): straight 16ths, offbeat open hat, ride in drops, long snare-roll builds
  trance: {
    swing: 0.5, kick: 124, clapOn24: true, snareLayer: true,
    hats16: [64, 40, 54, 40], openOff: 96, ride: 'offbeat', shaker: false,
    perc: [], build: 'snareRoll', kickRoll: true, crashEvery: 8,
  },
  // Hozho / Afterlife-style melodic techno (120–126 BPM): light swing, rim and clave syncopation, rolling shaker
  'melodic-techno': {
    swing: 0.53, kick: 122, clapOn24: true, snareLayer: false,
    hats16: [58, 34, 50, 38], openOff: 82, ride: 'quarter', shaker: true,
    perc: [[N.rim, [3, 6, 11, 14], 58], [N.clave, [10], 46], [N.tomLo, [7], 40]],
    build: 'clapRoll', kickRoll: false, crashEvery: 16,
  },
  // Faithless-style dance/house (125–128 BPM): swung shaker, congas/bongos, tambourine, piano-house drive
  faithless: {
    swing: 0.56, kick: 122, clapOn24: true, snareLayer: true,
    hats16: [52, 30, 44, 32], openOff: 88, ride: 'offbeat', shaker: true,
    perc: [[N.congaHi, [3, 11, 14], 60], [N.congaLo, [6, 10], 66], [N.bongoHi, [7, 15], 46], [N.tamb, [4, 12], 56]],
    build: 'snareRoll', kickRoll: false, crashEvery: 8,
  },
};

/**
 * plan: [{ type: 'intro'|'groove'|'build'|'drop'|'breakdown'|'outro'|'stop', bars }]
 * Returns { tracks: [{ name, notes }], bars }.
 */
export function programDrums({ style = 'trance', plan, startBar = 0 }) {
  const S = DRUM_STYLES[style] || DRUM_STYLES.trance;
  const kick = [], snare = [], hats = [], perc = [], cym = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const v = (x, spread = 4) => Math.max(1, Math.min(127, Math.round(x + (rnd() - 0.5) * spread)));
  const sw = (step) => (step % 2 ? (S.swing - 0.5) * 0.5 : 0); // delay odd 16ths
  const hit = (arr, pitch, beat, vel, dur = 0.2) => arr.push({ pitch, start: +beat.toFixed(4), duration: dur, velocity: v(vel) });

  function grooveBar(t, o) {
    for (let b = 0; b < 4; b++) {
      if (o.kick) hit(kick, N.kick, t + b, S.kick - (b ? 4 : 0), 0.25);
      if (o.clap && S.clapOn24 && b % 2) { hit(snare, N.clap, t + b, 104); if (S.snareLayer) hit(snare, N.snare, t + b, 80); }
      if (o.openHat) hit(hats, N.oh, t + b + 0.5, S.openOff);
      if (o.hats) for (let k = 0; k < 4; k++) if (!(o.openHat && k === 2)) hit(hats, N.ch, t + b + k * 0.25 + sw(k), S.hats16[k] * (o.hatScale || 1));
      if (o.ride === 'offbeat') hit(cym, N.ride, t + b + 0.5, 70);
      if (o.ride === 'quarter') hit(cym, N.ride, t + b, b % 2 ? 62 : 70);
      if (o.shaker && S.shaker) for (let k = 0; k < 4; k++) hit(perc, N.shaker, t + b + k * 0.25 + sw(k), [46, 30, 54, 34][k]);
    }
    if (o.perc) for (const [p, steps, vel] of S.perc) for (const s of steps) hit(perc, p, t + s * 0.25 + sw(s), vel);
  }
  function fill(t, big) { // last bar of a phrase
    if (big) { // two beats: snare 16ths into toms
      [N.snare, N.snare, N.snare, N.snare, N.tomHi, N.tomHi, N.tomMid, N.tomLo].forEach((p, i) => hit(snare, p, t + 2 + i * 0.25, 84 + i * 4));
    } else { // small: open hat on the last offbeat and a clap pickup
      hit(hats, N.oh, t + 3.5, 100); hit(snare, N.clap, t + 3.75, 70);
    }
  }
  function build(t0, bars) {
    const total = bars * 4;
    for (let x = 0; x < total;) { // snare/clap roll: quarters → 8ths → 16ths → 32nds, crescendo
      const p = x / total;
      if (x < total - 0.5) hit(snare, S.build === 'clapRoll' ? N.clap : N.snare, t0 + x, 40 + p * 84, 0.1);
      x += p < 0.25 ? 1 : p < 0.5 ? 0.5 : p < 0.85 ? 0.25 : 0.125;
    }
    for (let b = 0; b < total - 1; b++) { // kick keeps time, rolling in the last bars for trance; silent last beat
      const p = b / total;
      hit(kick, N.kick, t0 + b, 100 + p * 20, 0.25);
      if (S.kickRoll && p >= 0.75) hit(kick, N.kick, t0 + b + 0.5, 90 + p * 20, 0.25);
    }
    for (let b = 0; b < total - 1; b++) hit(hats, N.ch, t0 + b + 0.5, 40 + (b / total) * 60); // rising offbeat hat
    hit(cym, N.crash, t0 + total - 1, 50, 1); // soft swell hit before the drop
  }

  let bar = startBar;
  for (const sec of plan) {
    for (let i = 0; i < sec.bars; i++) {
      const t = (bar + i) * 4, p = i / sec.bars, phraseEnd8 = i % 8 === 7, phraseEnd16 = i % 16 === 15;
      switch (sec.type) {
        case 'intro': // elements arrive every 4 bars, DJ-friendly
          grooveBar(t, { kick: true, hats: i >= 4, openHat: i >= 8, shaker: i >= 8, perc: i >= 12, clap: i >= 12, hatScale: 0.85 });
          if (phraseEnd8 && i >= 8) fill(t, false);
          break;
        case 'groove':
          grooveBar(t, { kick: true, hats: true, openHat: true, clap: true, shaker: true, perc: true });
          if (phraseEnd16) fill(t, true); else if (phraseEnd8) fill(t, false);
          break;
        case 'drop':
          grooveBar(t, { kick: true, hats: true, openHat: true, clap: true, shaker: true, perc: true, ride: S.ride });
          if (i % S.crashEvery === 0) hit(cym, N.crash, t, i ? 96 : 118, 2);
          if (phraseEnd16) fill(t, true); else if (phraseEnd8) fill(t, false);
          break;
        case 'breakdown': // no kick or clap; a soft pulse keeps the tempo felt
          if (i === 0) hit(cym, N.crash, t, 100, 2);
          if (p < 0.5 && S.shaker) for (let k = 0; k < 4; k++) hit(perc, N.shaker, t + k + 0.5, 28);
          break;
        case 'build':
          if (i === 0) build(t, sec.bars);
          break;
        case 'outro': // elements leave every 4 bars
          grooveBar(t, { kick: true, hats: i < sec.bars - 4, openHat: i < sec.bars - 8, shaker: i < sec.bars - 8, perc: i < sec.bars - 12, clap: i < sec.bars - 12 });
          break;
        case 'stop': break;
      }
    }
    bar += sec.bars;
  }
  const tracks = [
    { name: 'Drums – Kick', notes: kick }, { name: 'Drums – Snare & Clap', notes: snare },
    { name: 'Drums – Hats', notes: hats }, { name: 'Drums – Percussion', notes: perc }, { name: 'Drums – Cymbals', notes: cym },
  ].filter((t) => t.notes.length);
  return { tracks, bars: bar - startBar };
}

// --- Library mode: real grooves from the user's MIDI packs (see library.js) ---
const STYLE_MATCH = {
  trance: { re: /trance|uplifting|edm|uk dance|uptempo/, bpm: [128, 145] },
  'melodic-techno': { re: /techno|progressive house|tech house|electronic/, bpm: [116, 130] },
  faithless: { re: /house|uk dance|alternative dance|disco|afro|dance/, bpm: [116, 132] },
};
const part = (p) => (p === 36 ? 'kick' : [37, 38, 39, 40].includes(p) ? 'snare' : [42, 44, 46].includes(p) ? 'hats'
  : [49, 51, 52, 53, 55, 57].includes(p) ? 'cym' : 'perc');

// kitMap 'original' keeps the pack's own note numbers on ONE track, to be played by the pack's own
// instrument (e.g. EZdrummer with the matching EZX kit); 'gm' maps to General MIDI for Logic's kits.
export function programDrumsFromLibrary({ style = 'trance', plan, library, startBar = 0, seed = 7, kitMap = 'gm' }) {
  const want = STYLE_MATCH[style] || STYLE_MATCH.trance;
  let pool = library.filter((g) => want.re.test(g.tags) && g.bpm >= want.bpm[0] && g.bpm <= want.bpm[1]);
  if (pool.length < 10) pool = library.filter((g) => want.re.test(g.tags));
  if (!pool.length) return null;
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const byType = (types) => pool.filter((g) => types.includes(g.type));
  const grooves = byType(['groove', 'drop']).filter((g) => g.bars <= 8);
  const fills = byType(['fill']);
  const builds = byType(['build']);
  const breakdowns = byType(['breakdown', 'break']);
  const out = { kick: [], snare: [], hats: [], perc: [], cym: [] };
  const used = new Set();
  const lay = (g, atBar, fromBar = 0, bars = g.bars, only = null, velScale = 1) => {
    used.add(g.source);
    for (const [gm, beat, vel, orig] of g.notes) {
      const p = kitMap === 'original' ? orig ?? gm : gm;
      if (p == null) continue;
      const b = beat - fromBar * 4;
      if (b < 0 || b >= bars * 4) continue;
      const k = part(gm ?? 0);
      if (only && !only.includes(k)) continue;
      out[k].push({ pitch: p, start: +(atBar * 4 + b).toFixed(4), duration: 0.2, velocity: Math.max(1, Math.min(127, Math.round(vel * velScale))) });
    }
  };
  // One main groove for the song and a related variation (same folder when possible), like a producer would.
  const main = pick(grooves.length ? grooves : pool);
  const folder = main.source.replace(/\/[^/]*$/, '');
  const siblings = grooves.filter((g) => g.source.startsWith(folder) && g !== main);
  const varn = siblings.length ? pick(siblings) : pick(grooves);
  const tile = (g, bar, i, only, velScale) => lay(g, bar, i % g.bars, 1, only, velScale);

  let bar = startBar;
  for (const sec of plan) {
    for (let i = 0; i < sec.bars; i++) {
      const b = bar + i, phraseEnd = i % 8 === 7 && sec.bars >= 8;
      const g = i % 16 >= 8 ? varn : main;
      switch (sec.type) {
        case 'intro': tile(g, b, i, ['kick', ...(i >= 4 ? ['hats'] : []), ...(i >= 8 ? ['perc'] : []), ...(i >= 12 ? ['snare'] : [])], 0.95); break;
        case 'groove': case 'drop':
          if (phraseEnd && fills.length) { tile(g, b, i, ['kick']); lay(pick(fills), b, Math.max(0, pick(fills).bars - 1), 1); }
          else tile(g, b, i, null, sec.type === 'drop' ? 1 : 0.95);
          if (sec.type === 'drop' && i % 8 === 0) out.cym.push({ pitch: 49, start: b * 4, duration: 2, velocity: i ? 100 : 120 });
          break;
        case 'breakdown': if (i === 0) out.cym.push({ pitch: 49, start: b * 4, duration: 2, velocity: 100 });
          if (breakdowns.length && i < sec.bars / 2) tile(breakdowns[0], b, i, ['hats', 'perc'], 0.6);
          break;
        case 'build':
          if (i === 0 && builds.length) { const bu = pick(builds); for (let k = 0; k < sec.bars; k++) lay(bu, b + k, k % bu.bars, 1, null, 0.7 + 0.3 * k / sec.bars); }
          else if (i === 0) { const synth = programDrums({ style, plan: [{ type: 'build', bars: sec.bars }], startBar: b }); for (const t of synth.tracks) for (const n of t.notes) out[part(n.pitch)].push(n); }
          break;
        case 'outro': tile(g, b, i, ['kick', ...(i < sec.bars - 4 ? ['hats'] : []), ...(i < sec.bars - 8 ? ['perc', 'snare'] : [])]); break;
      }
    }
    // silent last beat before a drop
    if (sec.type === 'build') for (const k of Object.keys(out)) out[k] = out[k].filter((n) => !(n.start >= (bar + sec.bars) * 4 - 1 && n.start < (bar + sec.bars) * 4));
    bar += sec.bars;
  }
  if (kitMap === 'original') {
    const all = Object.values(out).flat().sort((a, b) => a.start - b.start);
    const kit = main.kit ? ` (${main.kit.replace(/_/g, ' ')} kit)` : '';
    return { tracks: [{ name: `Drums${kit}`, notes: all }], bars: bar - startBar, sources: [...used], kit: main.kit };
  }
  const tracks = [['Drums – Kick', 'kick'], ['Drums – Snare & Clap', 'snare'], ['Drums – Hats', 'hats'], ['Drums – Percussion', 'perc'], ['Drums – Cymbals', 'cym']]
    .map(([name, k]) => ({ name, notes: out[k] })).filter((t) => t.notes.length);
  return { tracks, bars: bar - startBar, sources: [...used] };
}
