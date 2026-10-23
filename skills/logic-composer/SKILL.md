---
name: logic-composer
description: Compose MIDI parts for Logic Pro from a plain request ("lo-fi, Am7-Fmaj7-C-G, 85 BPM, piano + bass + drums, 8 bars"). Writes every note itself and saves a multi-track MIDI file through the logic-ai-composer MCP tools, so each part plays the user's own software instrument.
---

# Logic Composer

You write the notes. The `logic-ai-composer` MCP server only turns them into a
MIDI file (one track per instrument) and opens it in Logic Pro, where the user
picks their own software instrument on each track.

## Workflow

1. **Read the request** for: style/genre, key or chords, tempo, meter, length
   (bars), instruments, mood, and anything about rhythm or density. Ask one short
   question only if the instruments or length are truly unclear; otherwise use
   sensible defaults (4/4, 8 bars, the style's typical tempo).
2. **Spell the harmony** with `chord_notes` (and `scale_notes` for melodies) so
   every part stays in key. Never guess chord tones.
3. **Write each part** as notes with `pitch` (name like `C4` or MIDI number),
   `start` and `duration` in beats (quarter notes), and `velocity`.
4. **Call `write_midi`** once with all tracks. Name tracks by instrument
   ("Piano", "Bass", "Drums", "Strings") so they show up clearly in Logic.
5. Tell the user what you wrote (bars, parts, groove) and that they can choose
   their own instrument on each track and edit any note.

## Writing good parts

- **Range per instrument**: bass E1–G3, piano/keys left hand C2–C4 and right hand
  C4–C6, pads/strings C3–C6, lead/melody C4–C6, guitar E2–E5.
- **Voice leading**: keep chord voicings close between changes (move the fewest
  notes, use inversions); avoid jumping the whole voicing an octave.
- **Groove by style**:
  - Lo-fi / hip-hop: 70–90 BPM, swung 16ths (delay off-beat 16ths ~0.08 beat),
    lazy chords slightly late, velocities 55–85, kick on 1 and the "and" of 2,
    snare/clap on 2 and 4.
  - Pop: 95–125 BPM, straight 8ths, root-fifth bass on the beat, four-on-floor
    or backbeat drums.
  - House: 120–128 BPM, kick every beat, off-beat open hats, syncopated bass.
  - Trap: 130–150 BPM (half-time feel), rolling hi-hats (1/16, 1/32 rolls),
    808 bass following the kick with long notes.
  - Jazz: swung 8ths, rootless 7th/9th voicings, walking bass on every beat.
  - Ballad / cinematic: 60–80 BPM, sustained pads, arpeggiated piano, slow swells
    (rising velocities).
  - Turkish / Arabesk: hicaz or harmonic minor colour, 2/4 or 9/8 if asked,
    ornaments as short grace notes before the main note.
- **Humanize**: vary velocity ±8 and nudge some starts by ±0.02 beat; keep
  drums on the grid unless the style swings.
- **Drums** use General MIDI numbers on one track named "Drums": 36 kick,
  38 snare, 39 clap, 42 closed hat, 46 open hat, 49 crash, 51 ride, 45/47/50 toms.
- **Length**: bar `n` starts at beat `(n - 1) * beatsPerBar`. Make the last note
  of each part end inside the requested length.

## Example call shape

```json
{
  "title": "Rainy Lofi",
  "bpm": 84,
  "key": { "tonic": "A", "mode": "minor" },
  "tracks": [
    { "name": "Piano", "notes": [{ "pitch": "A3", "start": 0, "duration": 3.8, "velocity": 68 }] },
    { "name": "Bass", "notes": [{ "pitch": "A1", "start": 0, "duration": 1.5, "velocity": 90 }] },
    { "name": "Drums", "notes": [{ "pitch": 36, "start": 0, "duration": 0.25, "velocity": 100 }] }
  ]
}
```
