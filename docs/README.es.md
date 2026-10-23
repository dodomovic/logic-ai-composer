# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · **Español** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

Describe la música que quieres y Claude escribe el MIDI: cada nota de cada parte,
en tu estilo, tonalidad y acordes. Cada parte va a su propia pista en Logic Pro,
así que suena con **tus propios instrumentos virtuales** (Alchemy, Kontakt,
Serum…) y se puede editar por completo.

> "Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, piano, bajo y batería, 8 compases"
> "Una canción synthwave original de 3 minutos"
> "Convierte ~/Desktop/micancion.wav en MIDI" · "Haz un cover de jazz"

Funciona con tu propia cuenta de Claude (Claude Code o Claude Desktop). El audio se
procesa localmente en tu Mac. No hay servidores ni costes extra.

## Qué hace

- **Componer**: Claude escribe partes originales o canciones completas de cualquier
  duración, en el estilo, tonalidad, tempo e instrumentos que pidas.
- **Audio → MIDI**: separa una canción en stems (voz, bajo, guitarra, piano, otros,
  batería) y transcribe cada uno a su propia pista MIDI.
- **Covers**: conserva la melodía y la armonía de tu canción y la rearregla en otro estilo.
- **Masterización**: masteriza tu bounce de Logic para Spotify, Apple Music y
  YouTube (-14 LUFS, ≤ -1 dBTP, WAV de 24 bits) con un informe de sonoridad.
- **Guía de mezcla y Dolby Atmos**: Claude te guía en una mezcla inicial, la
  configuración de Atmos (Audio espacial) y la exportación ADM BWF en Logic.

## Instalación

Requiere macOS, Logic Pro, Node.js 18+ y Claude Code o Claude Desktop.

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

Copia `skills/logic-composer` en `~/.claude/skills/` para la guía de composición.

**Claude Desktop**: añade esto a `claude_desktop_config.json`:

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**Funciones de audio (opcional)**: requiere Python 3.11.

```bash
npm run setup-audio
```

Descarga unos 2–3 GB de herramientas y modelos de código abierto a tu Mac, no desde
este repositorio. Usa `LOGIC_AI_AUDIO_HOME` para instalarlos en otro lugar, por
ejemplo en un disco externo.

Los archivos se guardan en `~/Music/Logic AI Composer` (cámbialo con
`LOGIC_AI_COMPOSER_DIR`). Usa `LOGIC_APP` si tu Logic Pro tiene otro nombre.

## Usar tus propias canciones

No subas la canción como adjunto del chat: los adjuntos van a los servidores de
Claude y la herramienta no puede acceder a ellos. Arrastra el archivo desde Finder
al cuadro de Claude Code (pega la ruta) o escribe dónde está, p. ej.
"Escritorio/micancion.wav". El audio nunca sale de tu Mac.

La separación usa los modelos de mejor calidad, así que lleva tiempo. Depende de tu
Mac: en un Mac con Apple Silicon, de varios minutos hasta unos 10 para una canción
de 4 minutos; en Mac más antiguos o Intel, más.

## Herramientas

| Herramienta | Qué hace |
|---|---|
| `chord_notes` | Cifrado → notas (`Am7`, `Fmaj7`, `C/E`, `G7sus4`, …) |
| `scale_notes` | Notas de una escala (mayor, menor, modos, pentatónica, blues, hicaz) |
| `write_midi` | Escribe las partes en un `.mid` multipista y lo abre en Logic Pro |
| `audio_to_midi` | Canción → stems → MIDI multipista, con tempo, tonalidad y todas las notas para covers |
| `master_audio` | Masteriza una mezcla para streaming, con informe de sonoridad antes/después |

Por dentro:
- la voz se separa con BS-RoFormer;
- sobre el instrumental sin voz, batería y bajo con Demucs `htdemucs_ft`, guitarra y piano con `htdemucs_6s`;
- las partes con altura se transcriben con Basic Pitch de Spotify, la batería con detección de ataques por bandas;
- la masterización usa Pedalboard de Spotify, y la sonoridad se mide con pyloudnorm (ITU-R BS.1770).

## Coste

La separación, transcripción y masterización se ejecutan en tu Mac y no gastan
tokens de Claude. Los tokens se gastan solo cuando Claude lee o escribe notas.
Aproximadamente:

- leer una transcripción: 15–50k tokens;
- un cover o una canción nueva de 3 minutos: 40–80k tokens.

Con una suscripción de Claude no pagas nada extra; cuenta para los límites de uso
de tu plan.

## Originalidad y derechos de autor

Cuando Claude escribe una canción, compone notas nuevas a partir del estilo que
describes. No busca ni copia grabaciones, ni escribe de memoria melodías
protegidas. Los estilos, los tempos y las progresiones comunes no están protegidos;
las melodías reconocibles sí.

Puedes transcribir o versionar cualquier audio que tengas en tu Mac, por ejemplo
para estudiar o practicar una canción. Lo que hagas con el resultado depende de ti,
como con cualquier DAW o editor de partituras. Publicar un cover o compartir la
transcripción de una canción ajena puede requerir la licencia del titular de los
derechos.

## Licencia

MIT. Logic Pro y Dolby Atmos son marcas de sus propietarios (Apple Inc., Dolby
Laboratories). Este proyecto no está afiliado a ellos ni cuenta con su respaldo.
Los modelos descargados por `setup-audio` mantienen sus propias licencias.
