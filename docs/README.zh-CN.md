# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **简体中文**

描述你想要的音乐，Claude 就会写出 MIDI：按你的风格、调性与和弦，写出每个声部的每一个音符。
每个声部都放在 Logic Pro 的独立音轨上，因此可以用**你自己的软件乐器**（Alchemy、Kontakt、Serum 等）演奏，并且完全可编辑。

> "Lo-fi，84 BPM，Am7 – Fmaj7 – C – G，钢琴、贝斯和鼓，8 小节"
> "一首 3 分钟的原创合成波歌曲"
> "把 ~/Desktop/mysong.wav 转成 MIDI" · "把它改编成爵士版"

使用你自己的 Claude 账号（Claude Code 或 Claude Desktop）运行。音频在你的 Mac 本地处理。没有服务器，也没有额外费用。

## 功能

- **作曲**：Claude 按你指定的风格、调性、速度和乐器，写出原创声部或任意长度的完整歌曲。
- **音频 → MIDI**：把歌曲分离成分轨（人声、贝斯、吉他、钢琴、其他、鼓），并把每一轨扒成独立的 MIDI 音轨。
- **翻唱/改编**：保留歌曲的旋律与和声，用新的风格重新编曲。
- **母带处理**：为 Spotify、Apple Music 和 YouTube 处理你在 Logic 中导出的音频（-14 LUFS，≤ -1 dBTP，24 位 WAV），并给出响度报告。
- **混音与杜比全景声指南**：Claude 会指导你在 Logic 中完成初始混音、全景声（空间音频）设置和 ADM BWF 导出。

## 安装

需要 macOS、Logic Pro、Node.js 18+，以及 Claude Code 或 Claude Desktop。

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

把 `skills/logic-composer` 复制到 `~/.claude/skills/`，即可使用作曲指南。

**Claude Desktop**：在 `claude_desktop_config.json` 中加入：

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**音频功能（可选）**：需要 Python 3.11。

```bash
npm run setup-audio
```

它会把约 2–3 GB 的开源工具和模型下载到你的 Mac（不是从本仓库下载）。如需安装到其他位置（例如外置硬盘），请设置 `LOGIC_AI_AUDIO_HOME`。

文件保存在 `~/Music/Logic AI Composer`（可用 `LOGIC_AI_COMPOSER_DIR` 修改）。如果你的 Logic Pro 应用名称不同，请设置 `LOGIC_APP`。

## 使用你自己的歌曲

不要把歌曲作为聊天附件上传：附件会发送到 Claude 的服务器，工具无法读取。
请把文件从访达拖进 Claude Code 的输入框（会自动粘贴路径），或写出它的位置，例如"桌面/mysong.wav"。音频不会离开你的 Mac。

因为使用最高质量的模型，分离一首 4 分钟的歌曲大约需要 10 分钟。

## 工具

| 工具 | 功能 |
|---|---|
| `chord_notes` | 和弦符号 → 音符（`Am7`、`Fmaj7`、`C/E`、`G7sus4` 等） |
| `scale_notes` | 音阶的音（大调、小调、调式、五声音阶、布鲁斯、希贾兹） |
| `write_midi` | 把各声部写入多轨 `.mid` 并在 Logic Pro 中打开 |
| `audio_to_midi` | 歌曲 → 分轨 → 多轨 MIDI，并返回速度、调性和用于改编的全部音符 |
| `master_audio` | 为流媒体处理混音母带，并给出处理前后的响度报告 |

内部实现：
- 人声用 BS-RoFormer 分离；
- 在去掉人声的伴奏上，鼓和贝斯用 Demucs `htdemucs_ft` 分离，吉他和钢琴用 `htdemucs_6s` 分离；
- 有音高的声部用 Spotify 的 Basic Pitch 扒谱，鼓用分频段起音检测；
- 母带处理使用 Spotify 的 Pedalboard，响度用 pyloudnorm 测量（ITU-R BS.1770）。

## 成本

分离、扒谱和母带处理都在你的 Mac 上运行，不消耗 Claude token。只有 Claude 读取或写入音符时才会消耗 token。大致为：

- 读取一次扒谱结果：1.5 万–5 万 token；
- 一首改编或一首新的 3 分钟歌曲：4 万–8 万 token。

使用 Claude 订阅不会产生额外费用，只计入你套餐的使用额度。

## 原创性与版权

Claude 写歌时，会根据你描述的风格创作新的音符。它不会搜索或复制录音，也不会凭记忆写出受版权保护的旋律。
风格、速度和常见和弦进行不受保护，但可辨识的旋律受保护。

你可以把 Mac 上的任何音频文件扒谱或改编，例如用来学习或练习一首歌。如何使用结果由你决定，就像使用任何 DAW 或打谱软件一样。
发行他人歌曲的翻唱或分享其扒谱，可能需要获得版权方的许可。

## 许可证

MIT。Logic Pro 和 Dolby Atmos 是其所有者（Apple Inc.、Dolby Laboratories）的商标。本项目与它们无关，也未获得它们的认可。`setup-audio` 下载的模型遵循各自的许可证。
