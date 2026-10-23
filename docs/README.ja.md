# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · **日本語** · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

作りたい音楽を言葉で伝えると、Claude が MIDI を書きます。スタイル、キー、コードに合わせて、すべてのパートのすべてのノートを書きます。
各パートは Logic Pro の別トラックに入るので、**手持ちのソフトウェア音源**（Alchemy、Kontakt、Serum など）で鳴らせて、自由に編集できます。

> 「Lo-fi、84 BPM、Am7 – Fmaj7 – C – G、ピアノ・ベース・ドラム、8 小節」
> 「3 分のオリジナル シンセウェイブ曲」
> 「~/Desktop/mysong.wav を MIDI にして」・「ジャズ風カバーにして」

ご自身の Claude アカウント（Claude Code または Claude Desktop）で動きます。音声処理は Mac 上でローカルに行われます。サーバーも追加料金もありません。

## できること

- **作曲**：指定したスタイル・キー・テンポ・楽器で、オリジナルのパートや任意の長さの曲を Claude が書きます。
- **オーディオ → MIDI**：曲をステム（ボーカル、ベース、ギター、ピアノ、その他、ドラム）に分離し、それぞれ別の MIDI トラックに採譜します。
- **カバー**：メロディとハーモニーを保ったまま、新しいスタイルにアレンジします。
- **マスタリング**：Logic のバウンスを Spotify・Apple Music・YouTube 向けにマスタリングし（-14 LUFS、≤ -1 dBTP、24bit WAV）、ラウドネスのレポートを出します。
- **ミックスと Dolby Atmos のガイド**：Logic での初期ミックス、Atmos（空間オーディオ）の設定、ADM BWF の書き出しを Claude が案内します。

## インストール

必要なもの：macOS、Logic Pro、Node.js 18 以上、Claude Code または Claude Desktop。

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

作曲ガイドを使うには `skills/logic-composer` を `~/.claude/skills/` にコピーします。

**Claude Desktop**：`claude_desktop_config.json` に次を追加します。

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**オーディオ機能（任意）**：Python 3.11 が必要です。

```bash
npm run setup-audio
```

約 2〜3 GB のオープンソースのツールとモデルを Mac にダウンロードします（このリポジトリからではありません）。外付けディスクなど別の場所に入れるには `LOGIC_AI_AUDIO_HOME` を設定してください。

ファイルは `~/Music/Logic AI Composer` に保存されます（`LOGIC_AI_COMPOSER_DIR` で変更可）。Logic Pro のアプリ名が異なる場合は `LOGIC_APP` を設定してください。

## 自分の曲を使う

曲をチャットに添付しないでください。添付ファイルは Claude のサーバーに送られ、ツールからは読めません。
Finder からファイルを Claude Code の入力欄にドラッグする（パスが貼り付けられます）か、場所を書いてください（例：「デスクトップ/mysong.wav」）。音声が Mac の外に出ることはありません。

最高品質のモデルを使うため、分離には時間がかかります。所要時間は Mac によって異なり、Apple シリコン搭載 Mac では 4 分の曲で数分〜約 10 分、古い Mac や Intel Mac ではそれ以上かかります。

## ツール

| ツール | 機能 |
|---|---|
| `chord_notes` | コード表記 → ノート（`Am7`、`Fmaj7`、`C/E`、`G7sus4` など） |
| `scale_notes` | スケールの音（メジャー、マイナー、モード、ペンタトニック、ブルース、ヒジャーズ） |
| `write_midi` | パートをマルチトラックの `.mid` に書き出し、Logic Pro で開く |
| `audio_to_midi` | 曲 → ステム → マルチトラック MIDI。テンポ、キー、カバー用の全ノートも返す |
| `master_audio` | ミックスをストリーミング向けにマスタリングし、前後のラウドネスを報告 |

内部の仕組み：
- ボーカル、ドラム、ベースは Demucs `htdemucs_ft`、ギターとピアノは `htdemucs_6s` で分離します。
- 音程のあるパートは Spotify の Basic Pitch、ドラムは帯域ごとのオンセット検出で採譜します。
- マスタリングには Spotify の Pedalboard を使い、ラウドネスは pyloudnorm（ITU-R BS.1770）で測定します。

## コスト

分離・採譜・マスタリングは Mac 上で動き、Claude のトークンを使いません。トークンを使うのは Claude がノートを読み書きするときだけです。目安：

- 採譜結果を読む：1.5〜5 万トークン
- カバーまたは新しい 3 分の曲：4〜8 万トークン

Claude のサブスクリプションなら追加料金はかからず、プランの利用上限にカウントされるだけです。

## オリジナリティと著作権

Claude は曲を書くとき、伝えられたスタイルから新しいノートを作曲します。録音を探したりコピーしたりせず、著作権のあるメロディを記憶から書き出すこともしません。
スタイル、テンポ、よくあるコード進行は保護されませんが、聞き覚えのあるメロディは保護されます。

Mac にある音声ファイルは、曲の研究や練習などのために、どれでも採譜・カバーできます。結果をどう使うかは、ほかの DAW や楽譜ソフトと同じく利用者次第です。
他人の曲のカバーを公開したり採譜を共有したりするには、権利者のライセンスが必要な場合があります。

## ライセンス

MIT。Logic Pro と Dolby Atmos は各所有者（Apple Inc.、Dolby Laboratories）の商標です。本プロジェクトはそれらの企業と提携しておらず、承認も受けていません。`setup-audio` でダウンロードされるモデルには、それぞれのライセンスが適用されます。
