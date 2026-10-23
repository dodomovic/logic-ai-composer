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
  - Melodic techno: 120–126 BPM, rolling 16th bass on the off-16ths, one hypnotic
    16th arp over the chords, long pads, a short emotional theme saved for the
    breakdowns; DJ intro/outro of 16–32 bars of drums only.
  - Trance / epic trance (e.g. 2000s anthems): 136–140 BPM, minor key, slow harmony
    (one chord per 2–4 bars, i–VI–iv–V or i–VI–III–VII), offbeat 8th-note bass on
    the root, a trance-gated supersaw chord (16th gate pattern), a 16th pluck arp,
    and above all **one memorable theme of long, singing notes** (half and whole
    notes, stepwise with one leap to the peak, resolving through the leading tone).
    The theme is introduced softly (piano or strings in the breakdown), then played
    by the supersaw lead in the drop and doubled in octaves in the final drop.
    Structure: intro 32 → build 16 → main 32 → breakdown 16 → build-up 8 (snare roll
    quarters→8ths→16ths→32nds) → drop 32 → bridge 16 → main breakdown 32 (strings
    alone, then choir) → build-up 16 → drop 32 → outro 24.
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

## Drums

For electronic styles don't write drum notes by hand: pass `drums` to
`write_midi` with a `style` (`trance` for Tiësto-style, `melodic-techno` for
Hozho/Afterlife-style, `faithless` for dance/house) and a `plan` of sections
matching the arrangement (`intro`, `groove`, `build`, `drop`, `breakdown`,
`outro`, `stop`, each with `bars`). The engine writes separate Kick, Snare & Clap,
Hats, Percussion and Cymbals tracks with the genre's groove, swing, ghost
accents, 8/16-bar fills, crashes on phrase starts, snare/clap-roll build-ups with
a silent beat before the drop, no kick in breakdowns, and DJ-friendly intros and
outros where elements arrive or leave every 4 bars.

## Making electronic tracks sound right

- Repetition is the point: loop 8- or 16-bar patterns and change the arrangement
  (add/remove parts, open filters, velocity ramps) rather than the notes.
- Write the theme first, harmony second, then the drums and bass; one strong
  motif beats many random notes. Never generate melodies by random walks.
- Use velocity for build-ups (ramps over 8–16 bars) and leave space: breakdowns
  drop the kick and bass entirely.

## Strong bass and memorable melodies

- **Low end in two layers**: a sustained "Sub Bass" track (root an octave below,
  one note per chord or per bar) plus a moving mid bass (galloping 16ths around the
  kick, octave flicks, and a step/chromatic approach note into each chord change).
  Keep the sub mono and simple; let the mid bass carry the rhythm.
- **Hooks**: mix rhythms (dotted 8ths, syncopated pickups, a long note at the end
  of each 2-bar idea), use call and response (bar 1–2 asks, 3–4 answers), then
  sequence the idea a step higher in the second phrase and save the highest note
  for one climax. Land chord tones on strong beats, use passing notes in between,
  and approach the leading tone (e.g. C♯ in D minor) before the cycle repeats.
- **Richer harmony**: add9, maj7, sus4→3 resolutions, slash chords for a moving
  bass line, a major V (harmonic minor) before the loop, and a +1 or +2 semitone
  key change for the final chorus/drop.
- **Develop, don't just repeat**: introduce the hook softly (pluck or half-speed
  piano), then full lead, then octave-up, then octave + harmony in thirds.

## Soft, harmonic, professional sound

- Legato by default: melodic notes last until the next one starts (duration ≈ step),
  pads overlap chord changes slightly; staccato only when the style asks for it.
- Riffs rock stepwise between chord tones and keep common tones across chord
  changes; avoid jumps larger than a fifth inside a riff.
- Use lush voicings (add9, maj7, m9, slash chords), voice-led so each voice moves
  by a step or stays.
- Dynamics are gentle: velocities 45–90 for melodic parts with a soft pulse
  (±6), not hard accents; drums under 115.
- Add controller automation with `cc` on `write_midi`: CC11 expression swells on
  pads, strings and leads (in on the chord, breathe out at the phrase end), CC64
  sustain pedal on piano changing with the harmony, CC74 brightness ramps to open
  a riff's filter over 8–16 bars in build-ups.
- Pick soft GM programs for melodies (warm pad 89, voice lead 85, strings 48,
  pizzicato 45, harp 46) instead of saw leads when the style is melancholic.

## Full songs of a given length

When asked for a whole song ("3 minutes", "random", "something new"):

- Bars = minutes × BPM ÷ beats per bar (3 min at 120 BPM in 4/4 = 90 bars).
- If the style, key or chords are not given, choose them yourself and say what you chose.
  Make it original: no existing melodies or chord-for-chord copies of known songs.
- Plan a structure first, e.g. Intro 8 – Verse 16 – Pre 8 – Chorus 16 – Verse 16 –
  Chorus 16 – Bridge 8 – Chorus 16 – Outro 8, and give each section its own
  progression, density and dynamics (sparser verses, fuller choruses, fills before
  section changes, a crash on each chorus downbeat).
- Repeat sections with small variations rather than rewriting from scratch.
- Very long songs can be written as several `write_midi` calls (one per section,
  same tempo and key) if one call gets too large; tell the user to place them in order.

## Covers and arrangements of the user's own songs

1. Call `audio_to_midi` on the file. It separates the song into stems
   (vocals, bass, guitar, piano, other, drums) and returns tempo, key and the notes.
2. Keep the song's melody and harmony; change the style the user asked for:
   rhythm and groove, voicings, instrumentation, tempo (scale every start and
   duration by old BPM ÷ new BPM only if they want it faster/slower in feel).
   Example "jazz cover": walking bass on the same roots, rootless 7th voicings of the
   detected chords, swung ride pattern, melody kept with swung phrasing.
3. Write the result with `write_midi` and say which parts came from the original.
Only cover music the user owns or has the rights to.

## Mix, master and Dolby Atmos

MIDI has no sound until Logic plays it with the user's instruments, so the user
bounces in Logic (File → Bounce → Project or Section; WAV 24-bit, no normalize).
Then:

- **Stereo master**: call `master_audio` on the bounce. Defaults suit Spotify, Apple
  Music, YouTube, Tidal and Deezer (-14 LUFS integrated, ≤ -1 dBTP). Report the
  before/after numbers. It meets the platforms' technical specs; say honestly that a
  human mastering engineer may still do better for the user's taste.
- **Mix starting point** (tell the user, per track in Logic): Bass and Kick centre,
  kick/bass sidechain or EQ split (kick ~60 Hz, bass ~100 Hz), high-pass everything
  except kick and bass around 80–120 Hz, guitars panned ±60–80, pads wide, lead and
  vocals centre at the loudest point, bus compression 2:1 on the mix, leave ~-6 dBFS
  headroom before mastering.
- **Dolby Atmos** (Apple Music Spatial Audio) is done in Logic itself:
  1. Project Settings → Audio → Spatial Audio: Dolby Atmos (sets 7.1.4 and the renderer).
  2. Beds: drums, bass, lead and vocals on the bed (front/centre). Objects: pads,
     guitars, FX, backing vocals, placed with the 3D panner (wide and slightly up,
     movement only for effects).
  3. Monitor with Binaural (headphones), keep loudness at -18 LKFS integrated and
     true peak ≤ -1 dBTP (Apple Music Atmos spec), using Logic's Dolby Atmos plug-in meter.
  4. File → Export → Project as ADM BWF, which distributors accept for Apple Music
     Spatial Audio, plus the stereo master above.

## Lyrics and vocal melody

When the user wants lyrics, or gives their own, write them and a "Vocals" track
whose notes carry the syllables (`lyric` on each note), and pass the full text as
`lyrics` so a lyric sheet is saved next to the MIDI.

- **Write in the requested language and style**: theme, imagery and vocabulary of
  the genre (metal: dark, heavy, direct; pop: personal, catchy hook; rap: dense
  internal rhymes). Original lyrics only; never reproduce existing song lyrics.
- **Structure follows the song**: label sections ([Verse 1], [Pre-Chorus], [Chorus],
  [Bridge]); each lyric line fits a musical phrase (usually 2 or 4 bars). The
  chorus carries the title/hook and repeats with the same words.
- **Rhyme and metre**: consistent syllable counts between matching lines, a clear
  rhyme scheme (AABB, ABAB or ABCB), stronger rhymes in the chorus.
- **Prosody**: put stressed syllables on strong beats (1 and 3, or the downbeat of
  a phrase) and long vowels on long notes; never stretch an unstressed syllable
  over a long note. In Turkish, stress usually falls on the last syllable of a word,
  except place names, adverbs and some suffixes. Leave breaths (a rest of at least
  half a beat) between lines.
- **One syllable per note**: split words with hyphens ("for-", "-ev-", "-er").
  For a melisma (one syllable across several notes) give the following notes
  `lyric: "-"`.
- **Vocal melody**: stay in a singable range (male tenor/baritone A2–A4, female
  alto/soprano F3–F5; metal belts and screams up to A4/B4 for male), mostly
  stepwise with occasional leaps on emotional words, verses lower and quieter,
  chorus higher and stronger. Use chord tones on strong beats.
- **Harmony vocals (optional)**: a "Backing Vocals" track a third or sixth above
  on the chorus.
