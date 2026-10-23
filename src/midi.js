// Standard MIDI File (type 1) writer: one track per instrument part, so each
// part lands on its own track in Logic Pro and can use any software instrument.

import { noteNumber } from './theory.js';

const PPQ = 480; // ticks per quarter note

function vlq(n) {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n) => [(n >>> 8) & 255, n & 255];
const text = (s) => [...Buffer.from(String(s), 'utf8')];

function chunk(type, bytes) {
  return [...Buffer.from(type, 'ascii'), ...u32(bytes.length), ...bytes];
}

function trackChunk(events) {
  // events: { tick, data:number[] }, sorted; note-offs before note-ons at the same tick
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const bytes = [];
  let last = 0;
  for (const e of events) {
    bytes.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  bytes.push(0, 0xff, 0x2f, 0); // end of track
  return chunk('MTrk', bytes);
}

// General MIDI programs guessed from a track name, so Logic Pro (which maps GM program changes
// to its own patches on import) loads a fitting instrument even when no program is given.
const GM_GUESS = [ // first match wins, so specific names come before general ones
  [/choir|aah|koro/i, 52], [/vocal|vox|voice|vokal/i, 54], [/pizz/i, 45], [/string|yayl|violin|cello/i, 48],
  [/rhodes|e\.?piano/i, 4], [/piano|piyano|keys/i, 0], [/organ/i, 16], [/acoustic.*guitar|akustik/i, 25],
  [/lead guitar|solo gitar|solo guitar/i, 29], [/guitar|gitar/i, 30], [/synth ?bass|sub|808|trance bass|rolling/i, 38],
  [/bass|\bbas\b/i, 33], [/pluck/i, 80], [/harp|\barp/i, 46], [/gate|pad/i, 90], [/supersaw|saw|lead|melody|melodi/i, 81],
  [/synth/i, 90], [/brass|horn|trumpet/i, 61], [/flute|flüt/i, 73], [/bell/i, 14],
];
export function guessProgram(name = '') {
  for (const [re, prog] of GM_GUESS) if (re.test(name)) return prog;
  return undefined;
}

const KEY_SIGS = { // major-key sharps(+)/flats(-)
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};

/**
 * song: { title, bpm, timeSignature:[n,d], key:{tonic,mode}, tracks:[{ name, channel?, program?,
 *   notes:[{ pitch, start, duration, velocity? }] }] }  — start/duration in beats (quarter notes).
 * Returns a Buffer with the .mid file.
 */
export function buildMidi(song) {
  const bpm = Number(song.bpm) || 120;
  const [num, den] = song.timeSignature || [4, 4];
  const tracks = [];

  // Conductor track: tempo, meter, key, title.
  const meta = [
    { tick: 0, order: 0, data: [0xff, 0x03, ...vlq(text(song.title || 'AI Composer').length), ...text(song.title || 'AI Composer')] },
    { tick: 0, order: 0, data: [0xff, 0x51, 3, ...u32(Math.round(60000000 / bpm)).slice(1)] },
    { tick: 0, order: 0, data: [0xff, 0x58, 4, num, Math.log2(den), 24, 8] },
  ];
  if (song.key?.tonic) {
    const minor = /min|aeol/i.test(song.key.mode || '');
    const rel = minor ? relativeMajor(song.key.tonic) : song.key.tonic;
    const sf = KEY_SIGS[rel];
    if (sf !== undefined) meta.push({ tick: 0, order: 0, data: [0xff, 0x59, 2, sf & 255, minor ? 1 : 0] });
  }
  tracks.push(trackChunk(meta));

  song.tracks.forEach((t, i) => {
    const ch = Math.max(0, Math.min(15, t.channel ?? (/drum|perc|davul/i.test(t.name || '') ? 9 : i % 16 === 9 ? 10 : i % 16)));
    const ev = [{ tick: 0, order: 0, data: [0xff, 0x03, ...vlq(text(t.name || `Part ${i + 1}`).length), ...text(t.name || `Part ${i + 1}`)] }];
    const program = t.program ?? guessProgram(t.name);
    if (t.instrument || t.name) { // instrument name meta event, shown by DAWs that read it
      const inst = text(t.instrument || t.name);
      ev.push({ tick: 0, order: 0, data: [0xff, 0x04, ...vlq(inst.length), ...inst] });
    }
    if (program !== undefined && ch !== 9) ev.push({ tick: 0, order: 0, data: [0xc0 | ch, program & 127] });
    for (const n of t.notes || []) {
      const pitch = noteNumber(n.pitch);
      const on = Math.round(Number(n.start) * PPQ);
      const off = on + Math.max(1, Math.round(Number(n.duration) * PPQ));
      if (!(on >= 0)) throw new Error(`Bad start for ${n.pitch} in "${t.name}"`);
      const vel = Math.max(1, Math.min(127, Math.round(n.velocity ?? 90)));
      if (n.lyric) { // one syllable per note, as a lyric meta event (shown in Logic's Score and lyric views)
        const l = text(n.lyric);
        ev.push({ tick: on, order: 2, data: [0xff, 0x05, ...vlq(l.length), ...l] });
      }
      ev.push({ tick: on, order: 2, data: [0x90 | ch, pitch, vel] });
      ev.push({ tick: off, order: 1, data: [0x80 | ch, pitch, 0] });
    }
    tracks.push(trackChunk(ev));
  });

  const header = chunk('MThd', [...u16(1), ...u16(tracks.length), ...u16(PPQ)]);
  return Buffer.from([...header, ...tracks.flat()]);
}

function relativeMajor(tonic) {
  const order = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const alt = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
  const i = order.indexOf(alt[tonic] || tonic);
  return i < 0 ? undefined : order[(i + 3) % 12].replace('C#', 'Db');
}

/** Minimal reader used by tests: returns tracks with note counts. */
export function readMidi(buf) {
  if (buf.toString('ascii', 0, 4) !== 'MThd') throw new Error('Not a MIDI file');
  const ntracks = buf.readUInt16BE(10);
  let p = 14; const out = [];
  for (let t = 0; t < ntracks; t++) {
    if (buf.toString('ascii', p, p + 4) !== 'MTrk') throw new Error('Bad track');
    const len = buf.readUInt32BE(p + 4); const end = p + 8 + len; let q = p + 8; let ons = 0; let name = '';
    let status = 0;
    while (q < end) {
      let d = 0; let b; do { b = buf[q++]; d = (d << 7) | (b & 127); } while (b & 128);
      let s = buf[q];
      if (s & 0x80) { status = s; q++; } else s = status;
      if (s === 0xff) { const type = buf[q++]; let l = 0; do { b = buf[q++]; l = (l << 7) | (b & 127); } while (b & 128); if (type === 3) name = buf.toString('utf8', q, q + l); q += l; }
      else if ((s & 0xf0) === 0xc0 || (s & 0xf0) === 0xd0) q += 1;
      else { if ((s & 0xf0) === 0x90 && buf[q + 1] > 0) ons++; q += 2; }
    }
    out.push({ name, notes: ons }); p = end;
  }
  return out;
}
