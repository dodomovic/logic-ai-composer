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
