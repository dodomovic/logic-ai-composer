import assert from 'node:assert/strict';
import { buildMidi, readMidi } from '../src/midi.js';
import { chordNotes, noteName, noteNumber, scaleNotes } from '../src/theory.js';

assert.equal(noteNumber('C4'), 60);
assert.equal(noteNumber('Bb2'), 46);
assert.deepEqual(chordNotes('Am7').map(noteName), ['A4', 'C5', 'E5', 'G5']);
assert.deepEqual(chordNotes('C/E').map(noteName), ['E3', 'C4', 'E4', 'G4']);
assert.deepEqual(scaleNotes('A', 'minor'), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);

const prog = ['Am7', 'Fmaj7', 'C', 'G'];
const song = {
  title: 'Test lofi', bpm: 85, key: { tonic: 'A', mode: 'minor' },
  tracks: [
    { name: 'Piano', notes: prog.flatMap((c, i) => chordNotes(c, 4).map((p) => ({ pitch: p, start: i * 4, duration: 3.5, velocity: 70 }))) },
    { name: 'Bass', notes: prog.map((c, i) => ({ pitch: chordNotes(c, 2)[0], start: i * 4, duration: 2 })) },
    { name: 'Drums', notes: [0, 1, 2, 3].flatMap((b) => [{ pitch: 36, start: b * 4, duration: 0.5 }, { pitch: 38, start: b * 4 + 2, duration: 0.5 }]) },
  ],
};
const parsed = readMidi(buildMidi(song));
assert.equal(parsed.length, 4);
assert.deepEqual(parsed.slice(1).map((t) => [t.name, t.notes]), [['Piano', 14], ['Bass', 4], ['Drums', 8]]);
console.log('ok');

const sung = buildMidi({ title: 'L', bpm: 90, tracks: [{ name: 'Vocals', notes: [{ pitch: 'D4', start: 0, duration: 1, lyric: 'Hel-' }, { pitch: 'F4', start: 1, duration: 1, lyric: 'lo' }] }] });
assert.ok(sung.includes(Buffer.from([0xff, 0x05, 4, ...Buffer.from('Hel-')])));
console.log('lyrics ok');
const withCc = buildMidi({ title: 'C', bpm: 120, tracks: [{ name: 'Piano', notes: [{ pitch: 60, start: 0, duration: 1 }], cc: [{ controller: 64, time: 0, value: 127 }] }] });
assert.ok(withCc.includes(Buffer.from([0xb0, 64, 127])));
console.log('cc ok');
import { programDrums } from '../src/drums.js';
const kit = programDrums({ style: 'faithless', plan: [{ type: 'intro', bars: 16 }, { type: 'build', bars: 8 }, { type: 'drop', bars: 16 }, { type: 'breakdown', bars: 8 }] });
assert.equal(kit.bars, 48);
assert.deepEqual(kit.tracks.map((t) => t.name), ['Drums – Kick', 'Drums – Snare & Clap', 'Drums – Hats', 'Drums – Percussion', 'Drums – Cymbals']);
assert.ok(!kit.tracks[0].notes.some((n) => n.start >= 40 * 4), 'no kick in breakdown');
console.log('drums ok');
