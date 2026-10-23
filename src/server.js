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
    })).min(1),
    openInLogic: z.boolean().default(true),
  },
  async (song) => {
    const data = buildMidi(song);
    mkdirSync(OUT_DIR, { recursive: true });
    const safe = song.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 60) || 'idea';
    const file = join(OUT_DIR, `${safe} ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.mid`);
    writeFileSync(file, data);
    let opened = '';
    if (song.openInLogic && process.platform === 'darwin') {
      const app = process.env.LOGIC_APP || (existsSync('/Applications/Logic Pro.app') ? 'Logic Pro' : existsSync('/Applications/Logic Pro Creator Studio.app') ? 'Logic Pro Creator Studio' : 'Logic Pro');
      opened = await new Promise((resolve) => execFile('open', ['-a', app, file], (err) =>
        resolve(err ? ` Could not open Logic Pro automatically (${err.message.trim()}); drag the file into your project.` : ' Opened in Logic Pro.')));
    }
    const summary = song.tracks.map((t) => `${t.name}: ${t.notes.length} notes`).join(', ');
    return { content: [{ type: 'text', text: `Saved ${file} (${summary}).${opened}\nIn Logic, pick your own software instrument on each track.` }] };
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
    openInLogic: z.boolean().default(true),
  },
  async ({ file, separateStems, openInLogic }) => {
    if (!existsSync(PYTHON)) return { isError: true, content: [{ type: 'text', text: `Audio tools are not installed. Run: npm run setup-audio (installs into ${AUDIO_HOME}).` }] };
    if (!existsSync(file)) return { isError: true, content: [{ type: 'text', text: `File not found: ${file}` }] };
    const args = [SCRIPT, file, join(AUDIO_HOME, 'work'), ...(separateStems ? [] : ['--no-stems'])];
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
      `Notes (beats) for a cover:\n${JSON.stringify(result.tracks.map((t) => ({ name: t.name, notes: t.notes.slice(0, 400) })))}` }] };
  },
);

function logicApp() {
  return process.env.LOGIC_APP || (existsSync('/Applications/Logic Pro.app') ? 'Logic Pro' : existsSync('/Applications/Logic Pro Creator Studio.app') ? 'Logic Pro Creator Studio' : 'Logic Pro');
}

await server.connect(new StdioServerTransport());
