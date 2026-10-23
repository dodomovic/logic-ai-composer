// Style library built from the user's own MIDI packs (e.g. Toontrack, Splice). Grooves keep their
// real velocities and micro-timing, so drums programmed from them sound like a human producer made
// them. The library is stored locally and never shipped with this project.

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { homedir } from 'node:os';

export const LIBRARY_FILE = join(process.env.LOGIC_AI_AUDIO_HOME || join(homedir(), '.logic-ai-composer'), 'library', 'drums.json');

/** Full Standard MIDI File parser: returns { ppq, bpm, notes: [{ pitch, beat, len, vel }] } (all tracks merged). */
export function parseMidi(buf) {
  if (buf.toString('ascii', 0, 4) !== 'MThd') throw new Error('Not a MIDI file');
  const ntracks = buf.readUInt16BE(10), ppq = buf.readUInt16BE(12) & 0x7fff;
  let p = 14, bpm = null;
  const notes = [];
  for (let t = 0; t < ntracks && p < buf.length; t++) {
    if (buf.toString('ascii', p, p + 4) !== 'MTrk') break;
    const end = p + 8 + buf.readUInt32BE(p + 4);
    let q = p + 8, tick = 0, status = 0;
    const open = new Map();
    const vlq = () => { let v = 0, b; do { b = buf[q++]; v = (v << 7) | (b & 127); } while (b & 128 && q < end); return v; };
    while (q < end) {
      tick += vlq();
      let s = buf[q];
      if (s & 0x80) { status = s; q++; } else s = status;
      if (s === 0xff) {
        const type = buf[q++], len = vlq();
        if (type === 0x51 && bpm === null) bpm = 60000000 / ((buf[q] << 16) | (buf[q + 1] << 8) | buf[q + 2]);
        q += len;
      } else if (s === 0xf0 || s === 0xf7) { q += vlq(); }
      else {
        const hi = s & 0xf0, a = buf[q], b = buf[q + 1];
        if (hi === 0xc0 || hi === 0xd0) { q += 1; continue; }
        q += 2;
        if (hi === 0x90 && b > 0) open.set(a, { tick, vel: b });
        else if (hi === 0x80 || (hi === 0x90 && b === 0)) {
          const o = open.get(a);
          if (o) { notes.push({ pitch: a, beat: o.tick / ppq, len: Math.max(1, tick - o.tick) / ppq, vel: o.vel }); open.delete(a); }
        }
      }
    }
    for (const [a, o] of open) notes.push({ pitch: a, beat: o.tick / ppq, len: 0.25, vel: o.vel });
    p = end;
  }
  notes.sort((x, y) => x.beat - y.beat || x.pitch - y.pitch);
  return { ppq, bpm, notes };
}

// Toontrack-style drum notes → General MIDI (Logic Drum Kit / Drum Machine Designer)
const TO_GM = {
  35: 36, 36: 36, 37: 37, 38: 38, 39: 39, 40: 38, 41: 41, 43: 43, 45: 45, 47: 47, 48: 48, 50: 50,
  42: 42, 22: 42, 8: 42, 44: 44, 21: 44, 46: 46, 23: 46, 24: 46, 25: 46, 26: 46, 60: 46,
  49: 49, 55: 49, 57: 57, 52: 52, 51: 51, 53: 53, 59: 51, 54: 54, 56: 56, 58: 70,
};
// Notes with no clear General MIDI equivalent return null and are dropped in GM mode (they stay in 'original' mode).
export function toGM(pitch) { return TO_GM[pitch] ?? null; }

const TYPES = [
  [/fill/i, 'fill'], [/build/i, 'build'], [/break ?down/i, 'breakdown'], [/break/i, 'break'], [/intro/i, 'intro'],
  [/outro|ending|end/i, 'outro'], [/chorus|drop|peak/i, 'drop'], [/verse/i, 'groove'], [/bridge/i, 'groove'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    const st = statSync(f);
    if (st.isDirectory()) walk(f, out);
    else if (/\.midi?$/i.test(name)) out.push(f);
  }
  return out;
}

/** Scan folders of MIDI packs into a groove library. */
export function buildLibrary(roots, { maxPerFolder = 40 } = {}) {
  const grooves = [];
  for (const root of roots) {
    const perFolder = new Map();
    for (const f of walk(root)) {
      const rel = relative(root, f);
      const folder = rel.split(sep).slice(0, -1).join('/');
      if ((perFolder.get(folder) || 0) >= maxPerFolder) continue;
      let parsed;
      try { parsed = parseMidi(readFileSync(f)); } catch { continue; }
      if (parsed.notes.length < 4) continue;
      const path = rel.replace(/\d+@/g, '').replace(/_/g, ' ');
      const tempoInPath = rel.match(/(?:^|\/)(\d{2,3})-/);
      const bpm = Math.round(parsed.bpm || (tempoInPath ? +tempoInPath[1] : 120));
      const lastBeat = Math.max(...parsed.notes.map((n) => n.beat + Math.min(n.len, 1)));
      const bars = Math.max(1, Math.min(16, Math.round(lastBeat / 4)));
      const type = (TYPES.find(([re]) => re.test(path)) || [, 'groove'])[1];
      grooves.push({
        source: `${root.split(sep).pop()}/${path}`, tags: path.toLowerCase(), bpm, bars, type,
        notes: parsed.notes.filter((n) => n.beat < bars * 4).map((n) => [toGM(n.pitch), +n.beat.toFixed(3), n.vel, n.pitch]),
        kit: root.split(sep).pop().replace(/^\d+@/, ''),
      });
      perFolder.set(folder, (perFolder.get(folder) || 0) + 1);
    }
  }
  return grooves;
}

export function saveLibrary(grooves, file = LIBRARY_FILE) {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify({ created: new Date().toISOString(), grooves }));
  return file;
}
export function loadLibrary(file = LIBRARY_FILE) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).grooves : [];
}
