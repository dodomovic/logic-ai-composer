# Logic AI Composer

Describe the music you want, and Claude writes the MIDI: every note of every
part, in your style, key and chords. Each part lands on its own track in Logic
Pro, so it plays **your own software instruments** (Alchemy, Kontakt, Serum, …)
and stays fully editable.

> "Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, piano, bass and drums, 8 bars"

## How it works

- Claude composes the notes (rhythm, voicing, groove, dynamics).
- This MCP server spells chords and scales so parts stay in key, writes a
  multi-track MIDI file, and opens it in Logic Pro.
- In Logic, choose an instrument on each track and press play.

No audio is generated and nothing about Logic Pro is modified; it only uses
standard MIDI files.

## Install

Requires macOS, Logic Pro and Node.js 18+.

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

Copy `skills/logic-composer` into `~/.claude/skills/` for the composing guide.

**Claude Desktop**: add to `claude_desktop_config.json`:

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

Files are saved to `~/Music/Logic AI Composer` (set `LOGIC_AI_COMPOSER_DIR` to
change it). Set `LOGIC_APP` if your Logic Pro app has a different name.

## Tools

| Tool | What it does |
|---|---|
| `chord_notes` | Chord symbols → notes (`Am7`, `Fmaj7`, `C/E`, `G7sus4`, …) |
| `scale_notes` | Notes of a scale (major, minor, modes, pentatonic, blues, hicaz) |
| `write_midi` | Writes the parts to a multi-track `.mid` and opens it in Logic Pro |
| `audio_to_midi` | Song → stems (vocals, bass, guitar, piano, other, drums) → multi-track MIDI; needs `npm run setup-audio` |
| `master_audio` | Masters a bounced mix for streaming (-14 LUFS, ≤ -1 dBTP, 24-bit WAV) with a loudness report |

## License

MIT. Logic Pro is a trademark of Apple Inc. This project is not affiliated with
or endorsed by Apple.

## Audio to MIDI and covers (optional)

```bash
npm run setup-audio   # installs Demucs + Basic Pitch locally (~2 GB, set LOGIC_AI_AUDIO_HOME to choose the folder)
```

Don't upload the song as a chat attachment: attachments go to Claude's servers and
the tool can't reach them. Drag the file from Finder into the Claude Code prompt
(it pastes the path) or type where it is, e.g. "my Desktop/mysong.wav". The audio
never leaves your Mac.

Then ask Claude: "turn ~/Desktop/mysong.wav into MIDI" or "make a lo-fi cover of
~/Desktop/mysong.wav". Separation and transcription run on your Mac; nothing is uploaded.
You can also ask for a brand-new song of any length: "a 3-minute original synthwave track".

## Originality and copyright

When Claude writes a song, it composes new notes from the style you describe; it
does not look up or copy recordings. The composing guide tells it not to reproduce
existing melodies or chord-for-chord copies of known songs. Style itself (lo-fi,
synthwave, a tempo, a chord progression like I–V–vi–IV) isn't protected, but a
recognisable melody is. You can transcribe or cover any audio file you have on your Mac, for example to
study or practise a song. What you do with the result is up to you, like with any
DAW or notation tool: releasing a cover or sharing a transcription of someone
else's song may need the rights holder's licence. Claude composes original
material itself and won't write out a copyrighted melody from memory.
