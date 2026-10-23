#!/usr/bin/env node
// MCP server: Claude writes the notes, this turns them into a multi-track MIDI
// file and opens it in Logic Pro, where each track plays the user's own
// software instrument.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { execFile } from 'node:child_process';
import { buildMidi } from './midi.js';
import { DRUM_STYLES, programDrums, programDrumsFromLibrary } from './drums.js';
import { buildLibrary, loadLibrary, saveLibrary } from './library.js';
import { buildProject, renderProject, reaperReady, TEMPLATE } from './reaper.js';
import { chordNotes, noteName, scaleNotes, KNOWN_SCALES } from './theory.js';

const OUT_DIR = process.env.LOGIC_AI_COMPOSER_DIR || join(homedir(), 'Music', 'Logic AI Composer');

const server = new McpServer({ name: 'logic-ai-composer', version: '0.1.0' });

server.tool(
  'chord_notes',
  'Spell chord symbols as notes so parts stay in key. Example: ["Am7","F","C/E","G"] -> note names per chord.',
  { chords: z.array(z.string()).min(1), octave: z.number().int().min(1).max(7).default(4) },
  async ({ chords, octave }) => ({
    content: [{ type: 'text', text: chords.map((c) => `${c}: ${chordNotes(c, octave).map(noteName).join(' ')}`).join('\n') }],
  }),
);

server.tool(
  'scale_notes',
  `Notes of a scale, to keep melodies in key. Scales: ${KNOWN_SCALES.join(', ')}.`,
  { root: z.string(), scale: z.string().default('major') },
  async ({ root, scale }) => ({ content: [{ type: 'text', text: scaleNotes(root, scale).join(' ') }] }),
);

const note = z.object({
  pitch: z.union([z.string(), z.number().int().min(0).max(127)]).describe('Note name like "C4", "F#3" or MIDI number. Drums: GM numbers (36 kick, 38 snare, 42 closed hat).'),
  start: z.number().min(0).describe('Start position in beats (quarter notes) from the beginning'),
  duration: z.number().positive().describe('Length in beats'),
  velocity: z.number().int().min(1).max(127).optional().describe('Loudness 1-127, default 90'),
  lyric: z.string().optional().describe('Vocal tracks: the syllable sung on this note ("love", "for-", "-ev-", "-er"); "-" continues the previous syllable (melisma)'),
});

server.tool(
  'write_midi',
  'Write the composed parts to a multi-track MIDI file (one track per instrument) and optionally open it in Logic Pro. ' +
    'Compose every note yourself: rhythm, voicing, groove and dynamics in the requested style, key and chords.',
  {
    title: z.string().describe('Song or idea title, used for the file name'),
    bpm: z.number().min(20).max(300),
    timeSignature: z.tuple([z.number().int(), z.number().int()]).default([4, 4]),
    key: z.object({ tonic: z.string(), mode: z.string().default('major') }).optional(),
    tracks: z.array(z.object({
      name: z.string().describe('Instrument/part name, shown as the Logic track name, e.g. "Piano", "Bass", "Drums"'),
      program: z.number().int().min(0).max(127).optional().describe('Optional General MIDI program for players without a chosen instrument'),
      channel: z.number().int().min(0).max(15).optional(),
      notes: z.array(note).min(1),
      cc: z.array(z.object({
        controller: z.number().int().min(0).max(127).describe('1 modulation, 7 volume, 11 expression (swells), 64 sustain pedal (127 down, 0 up), 74 brightness/filter cutoff'),
        time: z.number().min(0).describe('Position in beats'),
        value: z.number().min(0).max(127),
      })).optional().describe('Controller automation for smooth, musical dynamics: expression swells on pads/strings, sustain pedal on piano, filter sweeps on synths in build-ups'),
    })).min(1),
    drums: z.object({
      style: z.enum(Object.keys(DRUM_STYLES)).describe('trance (Tiësto), melodic-techno (Hozho/Afterlife), faithless (dance/house)'),
      plan: z.array(z.object({ type: z.enum(['intro', 'groove', 'build', 'drop', 'breakdown', 'outro', 'stop']), bars: z.number().int().min(1) }))
        .describe('Sections in order, matching the song arrangement'),
      kitMap: z.enum(['gm', 'original']).default('gm').describe("'original' keeps the MIDI pack's own drum notes on one track for its own drum plugin (e.g. EZdrummer + EZX Dance), which sounds best; 'gm' maps to Logic's General MIDI kits"),
    }).optional().describe('Let the drum engine program the drums (separate Kick, Snare & Clap, Hats, Percussion, Cymbals tracks, with fills, build-ups and swing). Preferred over hand-written drums for electronic styles.'),
    lyrics: z.string().optional().describe('Full lyrics with section labels ([Verse 1], [Chorus] …); saved as a .txt next to the MIDI'),
    openInLogic: z.boolean().default(true),
  },
  async (song) => {
    let drumNote = '';
    if (song.drums) {
      const fromLib = programDrumsFromLibrary({ ...song.drums, library: loadLibrary() });
      const kit = fromLib || programDrums(song.drums);
      drumNote = fromLib ? ` Drums from your library: ${fromLib.sources.slice(0, 3).join('; ')}.` : ' Drums from the built-in engine (import MIDI packs for real grooves).';
      song = { ...song, tracks: [...kit.tracks, ...song.tracks] };
    }
    const data = buildMidi(song);
    mkdirSync(OUT_DIR, { recursive: true });
    const safe = song.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 60) || 'idea';
    const file = join(OUT_DIR, `${safe} ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.mid`);
    writeFileSync(file, data);
    if (song.lyrics) writeFileSync(file.replace(/\.mid$/, ' (Lyrics).txt'), `${song.title}\n\n${song.lyrics.trim()}\n`);
    let opened = '';
    if (song.openInLogic && process.platform === 'darwin') {
      const app = process.env.LOGIC_APP || (existsSync('/Applications/Logic Pro.app') ? 'Logic Pro' : existsSync('/Applications/Logic Pro Creator Studio.app') ? 'Logic Pro Creator Studio' : 'Logic Pro');
      opened = await new Promise((resolve) => execFile('open', ['-a', app, file], (err) =>
        resolve(err ? ` Could not open Logic Pro automatically (${err.message.trim()}); drag the file into your project.` : ' Opened in Logic Pro.')));
    }
    const summary = song.tracks.map((t) => `${t.name}: ${t.notes.length} notes`).join(', ');
    return { content: [{ type: 'text', text: `Saved ${file} (${summary}).${opened}${drumNote}\nIn Logic, pick your own software instrument on each track.` }] };
  },
);

const AUDIO_HOME = process.env.LOGIC_AI_AUDIO_HOME || join(homedir(), '.logic-ai-composer');
const PYTHON = join(AUDIO_HOME, 'venv', 'bin', 'python');
const SCRIPT = new URL('../audio/transcribe.py', import.meta.url).pathname;

server.tool(
  'audio_to_midi',
  'Turn a song (wav/mp3/m4a/flac) into MIDI: separates it into stems locally (Demucs) and transcribes melody, bass, chords and drums ' +
    '(Basic Pitch + onset detection), each on its own track, then opens it in Logic Pro. Also returns tempo, key and the notes, ' +
    'so you can write a cover or re-arrangement with write_midi.',
  {
    file: z.string().describe('Absolute path to the audio file'),
    separateStems: z.boolean().default(true).describe('false for a single solo instrument recording'),
    drumSep: z.boolean().default(process.env.LOGIC_AI_DRUMSEP === '1').describe('Split drums into kick/snare/toms/hi-hat/ride/crash with the DrumSep model (better drum MIDI; its weights have no documented license, so it is opt-in)'),
    openInLogic: z.boolean().default(true),
  },
  async ({ file, separateStems, drumSep, openInLogic }) => {
    if (!existsSync(PYTHON)) return { isError: true, content: [{ type: 'text', text: `Audio tools are not installed. Run: npm run setup-audio (installs into ${AUDIO_HOME}).` }] };
    if (!existsSync(file)) return { isError: true, content: [{ type: 'text', text: `File not found: ${file}` }] };
    const args = [SCRIPT, file, join(AUDIO_HOME, 'work'), ...(separateStems ? [] : ['--no-stems']), ...(drumSep ? ['--drumsep'] : [])];
    const json = await new Promise((resolve, reject) => execFile(PYTHON, args, {
      maxBuffer: 64 << 20, env: { ...process.env, TORCH_HOME: join(AUDIO_HOME, 'models') },
    }, (err, stdout, stderr) => (err ? reject(new Error(stderr.split('\n').slice(-5).join('\n'))) : resolve(stdout))));
    const result = JSON.parse(json);
    const title = basename(file).replace(/\.[^.]+$/, '');
    const data = buildMidi({ title, bpm: result.bpm, key: result.key, tracks: result.tracks });
    mkdirSync(OUT_DIR, { recursive: true });
    const out = join(OUT_DIR, `${title} (MIDI).mid`);
    writeFileSync(out, data);
    if (openInLogic && process.platform === 'darwin') execFile('open', ['-a', logicApp(), out], () => {});
    const summary = result.tracks.map((t) => `${t.name}: ${t.notes.length} notes`).join(', ');
    return { content: [{ type: 'text', text: `Saved ${out}. Tempo ~${result.bpm} BPM, key ${result.key.tonic} ${result.key.mode}. ${summary}.\n` +
      `All notes for a cover, one per line as "pitch start duration velocity" (beats, MIDI numbers; lossless, compact to save tokens):\n` +
      result.tracks.map((t) => `## ${t.name}\n${t.notes.map((n) => `${n.pitch} ${n.start} ${n.duration} ${n.velocity}`).join('\n')}`).join('\n') }] };
  },
);

server.tool(
  'master_audio',
  'Master a mixdown bounced from Logic for streaming: tonal balance, glue compression, limiter, loudness to the target ' +
    '(Spotify/Apple Music/YouTube ≈ -14 LUFS, true peak ≤ -1 dBTP). Writes a 24-bit WAV and returns a before/after loudness report.',
  {
    file: z.string().describe('Absolute path to the bounced WAV/AIFF'),
    targetLufs: z.number().min(-24).max(-6).default(-14),
    ceilingDbtp: z.number().min(-3).max(0).default(-1),
  },
  async ({ file, targetLufs, ceilingDbtp }) => {
    if (!existsSync(PYTHON)) return { isError: true, content: [{ type: 'text', text: `Audio tools are not installed. Run: npm run setup-audio (installs into ${AUDIO_HOME}).` }] };
    if (!existsSync(file)) return { isError: true, content: [{ type: 'text', text: `File not found: ${file}` }] };
    mkdirSync(OUT_DIR, { recursive: true });
    const out = join(OUT_DIR, `${basename(file).replace(/\.[^.]+$/, '')} (Master ${targetLufs} LUFS).wav`);
    const json = await new Promise((resolve, reject) => execFile(PYTHON, [new URL('../audio/master.py', import.meta.url).pathname, file, out, String(targetLufs), String(ceilingDbtp)],
      { maxBuffer: 8 << 20 }, (err, stdout, stderr) => (err ? reject(new Error(stderr.split('\n').slice(-5).join('\n'))) : resolve(stdout))));
    return { content: [{ type: 'text', text: JSON.stringify(JSON.parse(json), null, 1) }] };
  },
);

server.tool(
  'import_midi_library',
  'Build a local style library from the user\'s own MIDI packs (Toontrack, Splice, …). write_midi then programs drums from these real grooves, ' +
    'with their human velocities, timing and fills. The library stays on this Mac.',
  { folders: z.array(z.string()).min(1).describe('Folders containing .mid files; scanned recursively'), maxPerFolder: z.number().int().min(1).max(500).default(60) },
  async ({ folders, maxPerFolder }) => {
    const grooves = buildLibrary(folders.filter((f) => existsSync(f)), { maxPerFolder });
    const file = saveLibrary(grooves);
    const types = grooves.reduce((a, g) => ({ ...a, [g.type]: (a[g.type] || 0) + 1 }), {});
    return { content: [{ type: 'text', text: `Library saved to ${file}: ${grooves.length} grooves ${JSON.stringify(types)}.` }] };
  },
);

server.tool(
  'render_audio',
  'Turn a MIDI file written by write_midi into a finished, mixed and mastered song automatically: REAPER plays every track ' +
    'with the instruments of the user\'s template project (their own plug-ins and sounds), renders it headlessly, then it is mastered ' +
    'for streaming (-14 LUFS, ≤ -1 dBTP) and saved as WAV and MP3. Call it after write_midi so the user gets audio, not just MIDI.',
  {
    midiFile: z.string().describe('Path of the .mid returned by write_midi'),
    bpm: z.number().min(20).max(300),
    bars: z.number().int().min(1).describe('Song length in bars (4/4)'),
  },
  async ({ midiFile, bpm, bars }) => {
    if (!reaperReady()) return { isError: true, content: [{ type: 'text', text: `REAPER or the instrument template is missing (${TEMPLATE}). Install REAPER and create the template first.` }] };
    const title = basename(midiFile).replace(/\.mid$/i, '');
    const outDir = join(OUT_DIR, 'Renders', title);
    const { project, wav, tracks } = buildProject({ midiFile, outDir, title, bpm, lengthBeats: bars * 4 });
    await renderProject(project);
    if (!existsSync(wav)) return { isError: true, content: [{ type: 'text', text: `REAPER did not produce ${wav}. Open ${project} in REAPER to check.` }] };
    const master = join(outDir, `${title} (master).wav`);
    const report = await new Promise((resolve, reject) => execFile(PYTHON, [new URL('../audio/master.py', import.meta.url).pathname, wav, master],
      { maxBuffer: 8 << 20 }, (err, stdout, stderr) => (err ? reject(new Error(stderr.split('\n').slice(-5).join('\n'))) : resolve(JSON.parse(stdout)))));
    const mp3 = join(outDir, `${title}.mp3`);
    await new Promise((resolve) => execFile('ffmpeg', ['-loglevel', 'error', '-y', '-i', master, '-c:a', 'libmp3lame', '-b:a', '320k', mp3], () => resolve()));
    return { content: [{ type: 'text', text: `Rendered ${tracks} tracks in REAPER and mastered.\nWAV: ${master}\nMP3: ${mp3}\nREAPER project: ${project}\n` +
      `Loudness ${report.after.lufs} LUFS, true peak ${report.after.true_peak_dbtp} dBTP.` }] };
  },
);

function logicApp() {
  return process.env.LOGIC_APP || (existsSync('/Applications/Logic Pro.app') ? 'Logic Pro' : existsSync('/Applications/Logic Pro Creator Studio.app') ? 'Logic Pro Creator Studio' : 'Logic Pro');
}

await server.connect(new StdioServerTransport());
