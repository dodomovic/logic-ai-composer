// Renders a multi-track MIDI file to audio with REAPER, fully automatically: every MIDI track is placed
// on a copy of the matching instrument track from a template project (the user's own plug-ins and
// sounds), levels are set per role, and REAPER renders the project from the command line.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

export const REAPER_APP = process.env.REAPER_APP || '/Applications/REAPER.app/Contents/MacOS/REAPER';
export const TEMPLATE = process.env.LAC_REAPER_TEMPLATE || join(homedir(), 'Documents', 'LogicAIComposer', 'LAC Template.RPP');

// MIDI track name → template role, and the role's starting level (dB) for a balanced first mix.
const ROLES = [
  [/drum|kick|snare|hat|perc|cymbal/i, 'Drums', 0], [/sub/i, 'Sub Bass', -4], [/bass/i, 'Bass', -5],
  [/choir|vocal|vox/i, 'Choir', -12], [/riff|pluck/i, 'Pluck', -10], [/string/i, 'Strings', -11], [/pad/i, 'Pad', -13],
  [/piano|keys/i, 'Piano', -9], [/arp/i, 'Arp', -12],
  [/lead|melody|harm|saw/i, 'Lead', -7],
];
export const roleFor = (name) => ROLES.find(([re]) => re.test(name)) || [null, 'Pad', -14];

/** Split a type-1 MIDI file into { name, bytes } single-track files (conductor track kept in each). */
export function splitMidi(buf) {
  const ppq = buf.readUInt16BE(12), n = buf.readUInt16BE(10);
  const chunks = [];
  let p = 14;
  for (let i = 0; i < n; i++) { const len = buf.readUInt32BE(p + 4); chunks.push(buf.subarray(p, p + 8 + len)); p += 8 + len; }
  const name = (c) => { const i = c.indexOf(Buffer.from([0xff, 0x03])); return i < 0 ? '' : c.toString('utf8', i + 3, i + 3 + c[i + 2]); };
  const header = (tracks) => { const h = Buffer.alloc(14); h.write('MThd'); h.writeUInt32BE(6, 4); h.writeUInt16BE(1, 8); h.writeUInt16BE(tracks, 10); h.writeUInt16BE(ppq, 12); return h; };
  return chunks.slice(1).map((c) => ({ name: name(c), bytes: Buffer.concat([header(2), chunks[0], c]) }));
}

function trackChunks(rpp) { // [{ name, text }] for each top-level <TRACK … > block
  const out = [];
  const re = /\n  <TRACK[\s\S]*?\n  >/g;
  let m;
  while ((m = re.exec(rpp))) out.push({ text: m[0], name: (m[0].match(/\n    NAME "?([^"\n]*)"?/) || [])[1] });
  return out;
}
const newGuid = () => `{${randomUUID().toUpperCase()}}`;

/** Build the .RPP for a MIDI file and return its path. */
export function buildProject({ midiFile, outDir, title, bpm, lengthBeats }) {
  const tpl = readFileSync(TEMPLATE, 'utf8').replace(/\r\n/g, '\n');
  const tracks = trackChunks(tpl);
  const byRole = Object.fromEntries(tracks.map((t) => [t.name, t.text]));
  mkdirSync(outDir, { recursive: true });
  const parts = splitMidi(readFileSync(midiFile));
  const seconds = (lengthBeats * 60) / bpm + 4;
  const made = [];
  for (const [i, part] of parts.entries()) {
    const [, role, db] = roleFor(part.name);
    const base = byRole[role];
    if (!base) continue;
    const file = join(outDir, `${String(i + 1).padStart(2, '0')} ${part.name.replace(/[^\p{L}\p{N} &()-]+/gu, '')}.mid`);
    writeFileSync(file, part.bytes);
    const vol = Math.pow(10, db / 20).toFixed(6);
    const item = `\n    <ITEM\n      POSITION 0\n      LENGTH ${seconds.toFixed(3)}\n      NAME "${part.name}"\n      <SOURCE MIDI\n        FILE "${file}" 7\n      >\n    >`;
    const text = base
      .replace(/\n    NAME "?[^"\n]*"?/, `\n    NAME "${part.name}"`)
      .replace(/\n    VOLPAN [^\n]*/, `\n    VOLPAN ${vol} 0 -1 -1 1`)
      .replace(/\n    TRACKID [^\n]*/, `\n    TRACKID ${newGuid()}`)
      .replace(/\n    FXID [^\n]*/g, () => `\n    FXID ${newGuid()}`)
      .replace(/\n  >$/, `${item}\n  >`);
    made.push(text);
  }
  const first = tpl.indexOf('\n  <TRACK');
  const last = tracks.length ? tpl.lastIndexOf(tracks[tracks.length - 1].text) + tracks[tracks.length - 1].text.length : first;
  const wav = join(outDir, `${title} (mix).wav`);
  let head = tpl.slice(0, first)
    .replace(/\n  TEMPO [^\n]*/, `\n  TEMPO ${bpm} 4 4`)
    .replace(/\n  RENDER_FILE [^\n]*/, '').replace(/\n  RENDER_FMT [^\n]*/, '').replace(/\n  RENDER_RANGE [^\n]*/, '')
    .replace(/\n  RENDER_SRATE [^\n]*/, '').replace(/\n  <RENDER_CFG\n[\s\S]*?\n  >/, '');
  head += `\n  RENDER_FILE "${wav}"\n  RENDER_FMT 0 2 48000\n  RENDER_RANGE 1 0 0 18 1000\n  RENDER_SRATE 48000\n  <RENDER_CFG\n    ZXZhdxgAAQ==\n  >`;
  const rpp = head + made.join('') + tpl.slice(last);
  const project = join(outDir, `${title}.RPP`);
  writeFileSync(project, rpp);
  return { project, wav, tracks: made.length };
}

/** Render a project headlessly with a separate REAPER instance. */
export function renderProject(project, { timeoutMs = 30 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => execFile(REAPER_APP, ['-newinst', '-nosplash', '-renderproject', project],
    { timeout: timeoutMs }, (err) => (err && err.killed ? reject(new Error('REAPER render timed out')) : resolve())));
}

export const reaperReady = () => existsSync(REAPER_APP) && existsSync(TEMPLATE);
export const projectName = (midiFile) => basename(midiFile).replace(/\.mid$/i, '');
