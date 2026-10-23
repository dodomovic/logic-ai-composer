# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Português** · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

Descreva a música que você quer, e o Claude escreve o MIDI: cada nota de cada
parte, no seu estilo, tom e acordes. Cada parte vai para a própria faixa no Logic
Pro, então toca com **os seus próprios instrumentos virtuais** (Alchemy, Kontakt,
Serum…) e continua totalmente editável.

> "Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, piano, baixo e bateria, 8 compassos"
> "Uma música synthwave original de 3 minutos"
> "Transforme ~/Desktop/minhamusica.wav em MIDI" · "Faça um cover de jazz"

Funciona com a sua própria conta do Claude (Claude Code ou Claude Desktop). O áudio
é processado localmente no seu Mac. Sem servidores e sem custos extras.

## O que faz

- **Compor**: o Claude escreve partes originais ou músicas completas de qualquer
  duração, no estilo, tom, andamento e instrumentos que você pedir.
- **Áudio → MIDI**: separa uma música em stems (voz, baixo, guitarra, piano,
  outros, bateria) e transcreve cada um para a própria faixa MIDI.
- **Covers**: mantém a melodia e a harmonia da sua música e faz um novo arranjo em
  outro estilo.
- **Masterização**: masteriza o seu bounce do Logic para Spotify, Apple Music e
  YouTube (-14 LUFS, ≤ -1 dBTP, WAV 24 bits) com relatório de loudness.
- **Guia de mixagem e Dolby Atmos**: o Claude orienta uma mixagem inicial, a
  configuração do Atmos (Áudio Espacial) e a exportação ADM BWF no Logic.

## Instalação

Requer macOS, Logic Pro, Node.js 18+ e Claude Code ou Claude Desktop.

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

Copie `skills/logic-composer` para `~/.claude/skills/` para ter o guia de composição.

**Claude Desktop**: adicione isto ao `claude_desktop_config.json`:

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**Recursos de áudio (opcional)**: requer Python 3.11.

```bash
npm run setup-audio
```

Baixa cerca de 2–3 GB de ferramentas e modelos de código aberto para o seu Mac, não
deste repositório. Use `LOGIC_AI_AUDIO_HOME` para instalar em outro lugar, por
exemplo num disco externo.

Os arquivos são salvos em `~/Music/Logic AI Composer` (altere com
`LOGIC_AI_COMPOSER_DIR`). Use `LOGIC_APP` se o seu Logic Pro tiver outro nome.

## Usando as suas próprias músicas

Não envie a música como anexo no chat: anexos vão para os servidores do Claude e a
ferramenta não consegue acessá-los. Arraste o arquivo do Finder para a caixa do
Claude Code (o caminho é colado) ou escreva onde ele está, ex.
"Mesa/minhamusica.wav". O áudio nunca sai do seu Mac.

Separar uma música de 4 minutos leva cerca de 10 minutos, porque são usados os
modelos de melhor qualidade.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `chord_notes` | Cifras → notas (`Am7`, `Fmaj7`, `C/E`, `G7sus4`, …) |
| `scale_notes` | Notas de uma escala (maior, menor, modos, pentatônica, blues, hicaz) |
| `write_midi` | Grava as partes num `.mid` multipista e abre no Logic Pro |
| `audio_to_midi` | Música → stems → MIDI multipista, com andamento, tom e todas as notas para covers |
| `master_audio` | Masteriza uma mixagem para streaming, com relatório de loudness antes/depois |

Por dentro:
- a voz é separada com BS-RoFormer;
- no instrumental sem voz, bateria e baixo com Demucs `htdemucs_ft`, guitarra e piano com `htdemucs_6s`;
- as partes com altura são transcritas com o Basic Pitch do Spotify, a bateria com detecção de ataques por banda;
- a masterização usa o Pedalboard do Spotify, e a loudness é medida com pyloudnorm (ITU-R BS.1770).

## Custo

Separação, transcrição e masterização rodam no seu Mac e não usam tokens do Claude.
Tokens só são gastos quando o Claude lê ou escreve notas. Aproximadamente:

- ler uma transcrição: 15–50 mil tokens;
- um cover ou uma música nova de 3 minutos: 40–80 mil tokens.

Com uma assinatura do Claude, não há custo extra; conta para os limites de uso do
seu plano.

## Originalidade e direitos autorais

Quando o Claude escreve uma música, ele compõe notas novas a partir do estilo
descrito. Não busca nem copia gravações, e não escreve de memória uma melodia
protegida. Estilos, andamentos e progressões comuns não são protegidos; melodias
reconhecíveis são.

Você pode transcrever ou fazer cover de qualquer áudio que tenha no seu Mac, por
exemplo para estudar ou praticar uma música. O que fazer com o resultado é decisão
sua, como em qualquer DAW ou editor de partituras. Lançar um cover ou compartilhar
a transcrição de uma música de outra pessoa pode exigir licença do titular dos
direitos.

## Licença

MIT. Logic Pro e Dolby Atmos são marcas dos seus proprietários (Apple Inc., Dolby
Laboratories). Este projeto não é afiliado nem endossado por eles. Os modelos
baixados pelo `setup-audio` mantêm as suas próprias licenças.
