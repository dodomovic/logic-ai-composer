# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · **Deutsch** · [Français](README.fr.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

Beschreibe die Musik, die du willst, und Claude schreibt das MIDI: jede Note jeder
Stimme, in deinem Stil, deiner Tonart und deinen Akkorden. Jede Stimme landet auf
einer eigenen Spur in Logic Pro, spielt also **deine eigenen Software-Instrumente**
(Alchemy, Kontakt, Serum …) und bleibt voll editierbar.

> „Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, Piano, Bass und Drums, 8 Takte"
> „Ein 3-minütiger eigener Synthwave-Song"
> „Mach aus ~/Desktop/meinsong.wav MIDI" · „Mach daraus ein Jazz-Cover"

Es läuft mit deinem eigenen Claude-Konto (Claude Code oder Claude Desktop). Audio
wird lokal auf deinem Mac verarbeitet. Keine Server, keine Zusatzkosten.

## Was es kann

- **Komponieren**: Claude schreibt eigene Parts oder ganze Songs beliebiger Länge,
  in Stil, Tonart, Tempo und Besetzung deiner Wahl.
- **Audio → MIDI**: trennt einen Song in Stems (Gesang, Bass, Gitarre, Piano,
  Sonstiges, Drums) und transkribiert jeden auf eine eigene MIDI-Spur.
- **Covers**: behält Melodie und Harmonie deines Songs und arrangiert ihn in einem
  neuen Stil.
- **Mastering**: mastert deinen Logic-Bounce für Spotify, Apple Music und YouTube
  (-14 LUFS, ≤ -1 dBTP, 24-Bit-WAV) mit Lautheitsbericht.
- **Mix- und Dolby-Atmos-Anleitung**: Claude führt dich durch einen Start-Mix, das
  Atmos-Setup (3D-Audio) und den ADM-BWF-Export in Logic.

## Installation

Benötigt macOS, Logic Pro, Node.js 18+ und Claude Code oder Claude Desktop.

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

Kopiere `skills/logic-composer` nach `~/.claude/skills/` für die Kompositionsanleitung.

**Claude Desktop**: füge dies in `claude_desktop_config.json` ein:

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**Audio-Funktionen (optional)**: benötigt Python 3.11.

```bash
npm run setup-audio
```

Lädt etwa 2–3 GB Open-Source-Werkzeuge und -Modelle auf deinen Mac, nicht aus
diesem Repository. Mit `LOGIC_AI_AUDIO_HOME` installierst du sie woanders, z. B.
auf einer externen Festplatte.

Dateien werden in `~/Music/Logic AI Composer` gespeichert (änderbar mit
`LOGIC_AI_COMPOSER_DIR`). Setze `LOGIC_APP`, wenn deine Logic-Pro-App anders heißt.

## Eigene Songs verwenden

Lade den Song nicht als Chat-Anhang hoch: Anhänge gehen an die Server von Claude,
und das Werkzeug kommt nicht an sie heran. Zieh die Datei aus dem Finder in das
Eingabefeld von Claude Code (der Pfad wird eingefügt) oder schreib, wo sie liegt,
z. B. „Schreibtisch/meinsong.wav". Das Audio verlässt deinen Mac nie.

Die Trennung nutzt die Modelle mit der besten Qualität und braucht daher etwas Zeit.
Wie lange, hängt von deinem Mac ab: auf einem Apple-Silicon-Mac einige Minuten bis
etwa 10 Minuten für einen 4-minütigen Song; ältere oder Intel-Macs brauchen länger.

## Werkzeuge

| Werkzeug | Funktion |
|---|---|
| `chord_notes` | Akkordsymbole → Noten (`Am7`, `Fmaj7`, `C/E`, `G7sus4`, …) |
| `scale_notes` | Töne einer Skala (Dur, Moll, Modi, Pentatonik, Blues, Hicaz) |
| `write_midi` | Schreibt die Stimmen in eine mehrspurige `.mid` und öffnet sie in Logic Pro |
| `audio_to_midi` | Song → Stems → mehrspuriges MIDI, plus Tempo, Tonart und alle Noten für Covers |
| `master_audio` | Mastert einen Mixdown für Streaming, mit Lautheitsbericht vorher/nachher |

Unter der Haube:
- der Gesang wird mit BS-RoFormer getrennt;
- auf dem gesangsfreien Instrumental Drums und Bass mit Demucs `htdemucs_ft`, Gitarre und Piano mit `htdemucs_6s`;
- tonale Stimmen werden mit Spotifys Basic Pitch transkribiert, Drums mit bandweiser Onset-Erkennung;
- das Mastering nutzt Spotifys Pedalboard, die Lautheit wird mit pyloudnorm gemessen (ITU-R BS.1770).

## Kosten

Trennung, Transkription und Mastering laufen auf deinem Mac und verbrauchen keine
Claude-Tokens. Tokens fallen nur an, wenn Claude Noten liest oder schreibt. Grob:

- eine Transkription lesen: 15–50k Tokens;
- ein Cover oder ein neuer 3-Minuten-Song: 40–80k Tokens.

Mit einem Claude-Abo kostet das nichts extra; es zählt zu den Nutzungslimits
deines Plans.

## Originalität und Urheberrecht

Wenn Claude einen Song schreibt, komponiert es neue Noten aus dem beschriebenen
Stil. Es sucht oder kopiert keine Aufnahmen und schreibt keine geschützten Melodien
aus dem Gedächtnis. Stile, Tempi und gängige Akkordfolgen sind nicht geschützt;
wiedererkennbare Melodien schon.

Du kannst jede Audiodatei auf deinem Mac transkribieren oder covern, z. B. um einen
Song zu lernen oder zu üben. Was du mit dem Ergebnis machst, liegt bei dir, wie bei
jeder DAW oder Notensoftware. Ein Cover zu veröffentlichen oder die Transkription
eines fremden Songs zu teilen, kann eine Lizenz des Rechteinhabers erfordern.

## Lizenz

MIT. Logic Pro und Dolby Atmos sind Marken ihrer Inhaber (Apple Inc., Dolby
Laboratories). Dieses Projekt ist nicht mit ihnen verbunden und wird nicht von
ihnen unterstützt. Von `setup-audio` geladene Modelle behalten ihre eigenen Lizenzen.
