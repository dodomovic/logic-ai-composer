# Logic AI Composer

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md) · **한국어** · [简体中文](README.zh-CN.md)

원하는 음악을 설명하면 Claude가 MIDI를 씁니다. 원하는 스타일, 키, 코드에 맞춰 모든 파트의 모든 노트를 씁니다.
각 파트는 Logic Pro의 별도 트랙에 들어가므로 **내가 가진 소프트웨어 악기**(Alchemy, Kontakt, Serum 등)로 연주되고, 자유롭게 편집할 수 있습니다.

> "Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, 피아노·베이스·드럼, 8마디"
> "3분짜리 오리지널 신스웨이브 곡"
> "~/Desktop/mysong.wav를 MIDI로 바꿔 줘" · "재즈 커버로 만들어 줘"

내 Claude 계정(Claude Code 또는 Claude Desktop)으로 동작합니다. 오디오 처리는 Mac에서 로컬로 이루어집니다. 서버도 추가 요금도 없습니다.

## 기능

- **작곡**: 요청한 스타일, 키, 템포, 악기로 Claude가 오리지널 파트나 원하는 길이의 완성된 곡을 씁니다.
- **오디오 → MIDI**: 곡을 스템(보컬, 베이스, 기타, 피아노, 기타 악기, 드럼)으로 분리하고 각각을 별도 MIDI 트랙으로 채보합니다.
- **커버**: 곡의 멜로디와 화성은 유지하고 새로운 스타일로 편곡합니다.
- **마스터링**: Logic 바운스를 Spotify, Apple Music, YouTube용으로 마스터링하고(-14 LUFS, ≤ -1 dBTP, 24비트 WAV) 라우드니스 보고서를 제공합니다.
- **믹스와 Dolby Atmos 가이드**: Logic에서 기본 믹스, Atmos(공간 음향) 설정, ADM BWF 내보내기를 Claude가 안내합니다.

## 설치

필요 사항: macOS, Logic Pro, Node.js 18 이상, Claude Code 또는 Claude Desktop.

```bash
git clone https://github.com/dodomovic/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

작곡 가이드를 쓰려면 `skills/logic-composer`를 `~/.claude/skills/`에 복사하세요.

**Claude Desktop**: `claude_desktop_config.json`에 다음을 추가하세요.

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**오디오 기능(선택)**: Python 3.11이 필요합니다.

```bash
npm run setup-audio
```

약 2~3GB의 오픈소스 도구와 모델을 Mac에 내려받습니다(이 저장소에서 받는 것이 아닙니다). 외장 디스크 등 다른 곳에 설치하려면 `LOGIC_AI_AUDIO_HOME`을 설정하세요.

파일은 `~/Music/Logic AI Composer`에 저장됩니다(`LOGIC_AI_COMPOSER_DIR`로 변경 가능). Logic Pro 앱 이름이 다르면 `LOGIC_APP`을 설정하세요.

## 내 곡 사용하기

곡을 채팅에 첨부하지 마세요. 첨부 파일은 Claude 서버로 전송되어 도구가 읽을 수 없습니다.
Finder에서 파일을 Claude Code 입력창으로 드래그하거나(경로가 붙여 넣어집니다) 위치를 적어 주세요(예: "데스크탑/mysong.wav"). 오디오는 Mac 밖으로 나가지 않습니다.

최고 품질 모델을 쓰기 때문에 분리에 시간이 걸립니다. 소요 시간은 Mac에 따라 다르며, Apple 실리콘 Mac에서는 4분짜리 곡에 몇 분에서 약 10분, 오래된 Mac이나 Intel Mac에서는 더 오래 걸립니다.

## 도구

| 도구 | 기능 |
|---|---|
| `chord_notes` | 코드 기호 → 노트(`Am7`, `Fmaj7`, `C/E`, `G7sus4` 등) |
| `scale_notes` | 스케일의 음(메이저, 마이너, 모드, 펜타토닉, 블루스, 히자즈) |
| `write_midi` | 파트를 멀티트랙 `.mid`로 저장하고 Logic Pro에서 엽니다 |
| `audio_to_midi` | 곡 → 스템 → 멀티트랙 MIDI. 템포, 키, 커버용 전체 노트도 반환합니다 |
| `master_audio` | 믹스를 스트리밍용으로 마스터링하고 전후 라우드니스를 보고합니다 |

내부 구성:
- 보컬, 드럼, 베이스는 Demucs `htdemucs_ft`로, 기타와 피아노는 `htdemucs_6s`로 분리합니다.
- 음정이 있는 파트는 Spotify의 Basic Pitch로, 드럼은 대역별 온셋 검출로 채보합니다.
- 마스터링은 Spotify의 Pedalboard를 쓰고, 라우드니스는 pyloudnorm(ITU-R BS.1770)으로 측정합니다.

## 비용

분리, 채보, 마스터링은 Mac에서 실행되며 Claude 토큰을 쓰지 않습니다. 토큰은 Claude가 노트를 읽거나 쓸 때만 사용됩니다. 대략:

- 채보 결과 읽기: 1.5만~5만 토큰
- 커버 또는 새 3분 곡: 4만~8만 토큰

Claude 구독이 있으면 추가 비용은 없고, 요금제 사용 한도에만 반영됩니다.

## 독창성과 저작권

Claude는 곡을 쓸 때 설명한 스타일을 바탕으로 새로운 노트를 작곡합니다. 녹음을 찾거나 복사하지 않으며, 저작권이 있는 멜로디를 기억에서 그대로 쓰지도 않습니다.
스타일, 템포, 흔한 코드 진행은 보호 대상이 아니지만, 알아볼 수 있는 멜로디는 보호됩니다.

Mac에 있는 오디오 파일은 곡을 공부하거나 연습하는 등의 목적으로 무엇이든 채보하거나 커버할 수 있습니다. 결과물을 어떻게 쓸지는 다른 DAW나 악보 프로그램과 마찬가지로 사용자의 몫입니다.
다른 사람의 곡을 커버해 발매하거나 채보를 공유하려면 권리자의 라이선스가 필요할 수 있습니다.

## 라이선스

MIT. Logic Pro와 Dolby Atmos는 각 소유자(Apple Inc., Dolby Laboratories)의 상표입니다. 이 프로젝트는 이들과 제휴하거나 승인받지 않았습니다. `setup-audio`로 내려받는 모델에는 각 모델의 라이선스가 적용됩니다.
