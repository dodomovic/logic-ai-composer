# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Deutsch](README.de.md) · **Français** · [Português](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

Décrivez la musique que vous voulez, et Claude écrit le MIDI : chaque note de chaque
partie, dans votre style, votre tonalité et vos accords. Chaque partie arrive sur sa
propre piste dans Logic Pro, elle joue donc **vos propres instruments virtuels**
(Alchemy, Kontakt, Serum…) et reste entièrement modifiable.

![Une chanson générée (voix avec paroles, guitare rythmique et solo, basse, batterie) ouverte dans Logic Pro, chaque partie sur sa piste.](logic-pro.jpg)

> « Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, piano, basse et batterie, 8 mesures »
> « Une chanson synthwave originale de 3 minutes »
> « Transforme ~/Desktop/machanson.wav en MIDI » · « Fais-en une reprise jazz »

Il fonctionne avec votre propre compte Claude (Claude Code ou Claude Desktop).
L'audio est traité localement sur votre Mac. Aucun serveur, aucun frais
supplémentaire.

## Fonctions

- **Composition** : Claude écrit des parties originales ou des chansons complètes
  de n'importe quelle durée, dans le style, la tonalité, le tempo et
  l'instrumentation demandés.
- **Audio → MIDI** : sépare une chanson en stems (voix, basse, guitare, piano,
  autres, batterie) et transcrit chacun sur sa propre piste MIDI.
- **Reprises** : garde la mélodie et l'harmonie de votre chanson et la réarrange
  dans un nouveau style.
- **Mastering** : masterise votre bounce Logic pour Spotify, Apple Music et YouTube
  (-14 LUFS, ≤ -1 dBTP, WAV 24 bits) avec un rapport de loudness.
- **Guide mixage et Dolby Atmos** : Claude vous guide pour un premier mixage, la
  configuration Atmos (audio spatial) et l'export ADM BWF dans Logic.

## Installation

Nécessite macOS, Logic Pro, Node.js 18+ et Claude Code ou Claude Desktop.

```bash
git clone https://github.com/dodomovic/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

Copiez `skills/logic-composer` dans `~/.claude/skills/` pour le guide de composition.

**Claude Desktop** : ajoutez ceci à `claude_desktop_config.json` :

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**Fonctions audio (optionnel)** : nécessite Python 3.11.

```bash
npm run setup-audio
```

Télécharge environ 2–3 Go d'outils et de modèles open source sur votre Mac, pas
depuis ce dépôt. Définissez `LOGIC_AI_AUDIO_HOME` pour les installer ailleurs, par
exemple sur un disque externe.

Les fichiers sont enregistrés dans `~/Music/Logic AI Composer` (modifiable avec
`LOGIC_AI_COMPOSER_DIR`). Définissez `LOGIC_APP` si votre Logic Pro porte un autre
nom.

## Utiliser vos propres chansons

N'envoyez pas la chanson en pièce jointe du chat : les pièces jointes partent sur
les serveurs de Claude et l'outil ne peut pas y accéder. Glissez le fichier depuis
le Finder dans la zone de saisie de Claude Code (le chemin est collé), ou indiquez
où il se trouve, par ex. « Bureau/machanson.wav ». L'audio ne quitte jamais votre
Mac.

La séparation utilise les modèles de meilleure qualité, elle prend donc du temps.
La durée dépend de votre Mac : sur un Mac Apple Silicon, de quelques minutes à
environ 10 minutes pour une chanson de 4 minutes ; plus sur un Mac ancien ou Intel.

## Outils

| Outil | Rôle |
|---|---|
| `chord_notes` | Symboles d'accords → notes (`Am7`, `Fmaj7`, `C/E`, `G7sus4`, …) |
| `scale_notes` | Notes d'une gamme (majeure, mineure, modes, pentatonique, blues, hicaz) |
| `write_midi` | Écrit les parties dans un `.mid` multipiste et l'ouvre dans Logic Pro |
| `audio_to_midi` | Chanson → stems → MIDI multipiste, avec tempo, tonalité et toutes les notes pour les reprises |
| `master_audio` | Masterise un mixage pour le streaming, avec rapport de loudness avant/après |

Sous le capot :
- voix, batterie et basse sont séparées avec Demucs `htdemucs_ft`, guitare et piano avec `htdemucs_6s` ;
- les parties mélodiques sont transcrites avec Basic Pitch de Spotify, la batterie par détection d'attaques par bande ;
- le mastering utilise Pedalboard de Spotify, et la loudness est mesurée avec pyloudnorm (ITU-R BS.1770).

## Coût

La séparation, la transcription et le mastering tournent sur votre Mac et ne
consomment aucun token Claude. Les tokens ne sont utilisés que lorsque Claude lit
ou écrit des notes. En gros :

- lire une transcription : 15–50k tokens ;
- une reprise ou une nouvelle chanson de 3 minutes : 40–80k tokens.

Avec un abonnement Claude, cela ne coûte rien de plus ; c'est décompté des limites
d'utilisation de votre forfait.

## Originalité et droits d'auteur

Quand Claude écrit une chanson, il compose de nouvelles notes à partir du style
décrit. Il ne recherche ni ne copie d'enregistrements, et n'écrit pas de mémoire
une mélodie protégée. Les styles, les tempos et les grilles d'accords courantes ne
sont pas protégés ; les mélodies reconnaissables le sont.

Vous pouvez transcrire ou reprendre n'importe quel fichier audio présent sur votre
Mac, par exemple pour étudier ou travailler une chanson. Ce que vous faites du
résultat vous appartient, comme avec n'importe quel DAW ou logiciel de partition.
Publier une reprise ou partager la transcription d'une chanson d'autrui peut
nécessiter une licence de l'ayant droit.

## Licence

MIT. Logic Pro et Dolby Atmos sont des marques de leurs propriétaires (Apple Inc.,
Dolby Laboratories). Ce projet n'est ni affilié à eux ni approuvé par eux. Les
modèles téléchargés par `setup-audio` conservent leurs propres licences.
