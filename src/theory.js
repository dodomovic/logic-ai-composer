// Small music-theory helpers so written parts stay in key: note names,
// chord symbols and scales to MIDI numbers.

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** "C4" -> 60, "F#3" -> 54, "Bb2" -> 46. Numbers pass through. */
export function noteNumber(note) {
  if (typeof note === 'number') return note;
  const m = /^([A-Ga-g])([#b]*)(-?\d+)$/.exec(String(note).trim());
  if (!m) throw new Error(`Unknown note "${note}" (use names like C4, F#3, Bb2 or MIDI numbers)`);
  let n = PITCH[m[1].toUpperCase()];
  for (const a of m[2]) n += a === '#' ? 1 : -1;
  const midi = n + (Number(m[3]) + 1) * 12;
  if (midi < 0 || midi > 127) throw new Error(`Note "${note}" is outside the MIDI range`);
  return midi;
}

export function noteName(midi) {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// Intervals in semitones above the root.
const QUALITIES = {
  '': [0, 4, 7], maj: [0, 4, 7], m: [0, 3, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], 5: [0, 7],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  mmaj7: [0, 3, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14],
  11: [0, 4, 7, 10, 14, 17], m11: [0, 3, 7, 10, 14, 17], 13: [0, 4, 7, 10, 14, 21],
};

/**
 * Chord symbol to MIDI notes, e.g. "Am7" (octave 4) -> [57, 60, 64, 67].
 * Slash chords put the bass note below: "C/E".
 */
export function chordNotes(symbol, octave = 4) {
  const m = /^([A-Ga-g])([#b]?)([^/]*)(?:\/([A-Ga-g][#b]?))?$/.exec(String(symbol).trim());
  if (!m) throw new Error(`Unknown chord "${symbol}"`);
  const quality = m[3].replace(/^M7$/, 'maj7').replace(/^-/, 'm');
  const intervals = QUALITIES[quality];
  if (!intervals) throw new Error(`Unknown chord quality "${m[3]}" in "${symbol}". Known: ${Object.keys(QUALITIES).filter(Boolean).join(', ')}`);
  const root = noteNumber(`${m[1].toUpperCase()}${m[2]}${octave}`);
  const notes = intervals.map((i) => root + i);
  if (m[4]) {
    let bass = noteNumber(`${m[4][0].toUpperCase()}${m[4].slice(1)}${octave - 1}`);
    while (bass >= notes[0]) bass -= 12;
    notes.unshift(bass);
  }
  return notes;
}

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11], pentatonic_major: [0, 2, 4, 7, 9], pentatonic_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10], hicaz: [0, 1, 4, 5, 7, 8, 10],
};

export function scaleNotes(root, scale = 'major') {
  const steps = SCALES[scale];
  if (!steps) throw new Error(`Unknown scale "${scale}". Known: ${Object.keys(SCALES).join(', ')}`);
  const r = noteNumber(`${root}4`) % 12;
  return steps.map((s) => NAMES[(r + s) % 12]);
}

export const KNOWN_SCALES = Object.keys(SCALES);
