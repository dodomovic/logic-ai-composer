# Logic AI Composer

[English](../README.md) · **Türkçe** · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

İstediğin müziği anlat, Claude MIDI'sini yazsın. Her partinin her notası senin
istediğin tarzda, tonda ve akorlarda yazılır. Her parti Logic Pro'da ayrı bir
kanala gelir. Böylece **kendi software enstrümanlarınla** (Alchemy, Kontakt,
Serum…) çalar ve her notası düzenlenebilir.

> "Lo-fi, 84 BPM, Am7 – Fmaj7 – C – G, piyano, bas ve davul, 8 ölçü"
> "3 dakikalık özgün bir synthwave şarkı"
> "~/Desktop/sarkim.wav dosyasının MIDI'sini çıkar" · "Bunun caz cover'ını yap"

Kendi Claude hesabınla çalışır (Claude Code ya da Claude Desktop). Ses işlemleri
Mac'inde yerel olarak yapılır. Sunucu yok, ek ücret yok.

## Neler yapar

- **Beste**: Claude, istediğin tarzda, tonda, tempoda ve enstrümanlarla özgün
  partiler ya da istediğin uzunlukta tam şarkılar yazar.
- **Sesten MIDI'ye**: Şarkıyı kanallara ayırır (vokal, bas, gitar, piyano, diğer,
  davul) ve her birini ayrı bir MIDI kanalına çevirir.
- **Cover**: Şarkının melodisini ve armonisini korur, yeni bir tarzda yeniden düzenler.
- **Mastering**: Logic'ten aldığın bounce'u Spotify, Apple Music ve YouTube için
  master eder (-14 LUFS, ≤ -1 dBTP, 24 bit WAV) ve ses seviyesi raporu verir.
- **Mix ve Dolby Atmos rehberi**: Claude, Logic içinde başlangıç mix'ini, Atmos
  (Uzamsal Ses) kurulumunu ve ADM BWF dışa aktarımını adım adım anlatır.

## Kurulum

Gerekenler: macOS, Logic Pro, Node.js 18+ ve Claude Code ya da Claude Desktop.

```bash
git clone https://github.com/<you>/logic-ai-composer.git
cd logic-ai-composer && npm install
```

**Claude Code**

```bash
claude mcp add logic-ai-composer -- node /path/to/logic-ai-composer/src/server.js
```

Besteleme rehberi için `skills/logic-composer` klasörünü `~/.claude/skills/` içine kopyala.

**Claude Desktop**: `claude_desktop_config.json` dosyasına şunu ekle:

```json
{ "mcpServers": { "logic-ai-composer": { "command": "node", "args": ["/path/to/logic-ai-composer/src/server.js"] } } }
```

**Ses özellikleri (isteğe bağlı)**: Python 3.11 gerekir.

```bash
npm run setup-audio
```

Bu komut yaklaşık 2-3 GB'lık açık kaynak araç ve modeli Mac'ine indirir; bu depodan
inmezler. Başka bir yere kurmak için, örneğin harici bir diske, `LOGIC_AI_AUDIO_HOME`
değişkenini ayarla.

Dosyalar `~/Music/Logic AI Composer` klasörüne kaydedilir (değiştirmek için
`LOGIC_AI_COMPOSER_DIR`). Logic Pro uygulamanın adı farklıysa `LOGIC_APP` ayarla.

## Kendi şarkılarını kullanmak

Şarkıyı sohbete ek olarak yükleme: ekler Claude'un sunucularına gider ve araç
onlara erişemez. Dosyayı Finder'dan Claude Code'un yazı kutusuna sürükle (yolu
kendisi yazar) ya da yerini yaz, örneğin "Masaüstü/sarkim.wav". Ses dosyası
Mac'inden hiç çıkmaz.

Ayırma işleminde en kaliteli modeller kullanıldığı için biraz zaman alır. Süre
bilgisayarına göre değişir: Apple Silicon bir Mac'te 4 dakikalık bir şarkı için
birkaç dakikadan 10 dakikaya kadar sürebilir; eski ya da Intel Mac'lerde daha uzun sürer.

## Araçlar

| Araç | Ne yapar |
|---|---|
| `chord_notes` | Akor sembolü → notalar (`Am7`, `Fmaj7`, `C/E`, `G7sus4`, …) |
| `scale_notes` | Bir dizinin notaları (majör, minör, modlar, pentatonik, blues, hicaz) |
| `write_midi` | Partileri çok kanallı bir `.mid` dosyasına yazar ve Logic Pro'da açar |
| `audio_to_midi` | Şarkı → kanallar → çok kanallı MIDI; ayrıca tempo, ton ve cover için tüm notalar |
| `master_audio` | Bounce edilmiş mix'i yayın platformları için master eder, önce/sonra ses seviyesi raporu verir |

Arka planda:
- vokal BS-RoFormer ile ayrılır;
- vokalsiz enstrüman kısmından davul ve bas Demucs `htdemucs_ft` ile, gitar ve piyano `htdemucs_6s` ile ayrılır;
- notalı partiler Spotify'ın Basic Pitch'i ile, davullar frekans bandı bazlı vuruş algılamayla MIDI'ye çevrilir;
- mastering Spotify'ın Pedalboard'u ile yapılır, ses seviyesi pyloudnorm ile ölçülür (ITU-R BS.1770).

## Maliyet

Kanal ayırma, MIDI'ye çevirme ve mastering Mac'inde çalışır ve Claude token'ı
harcamaz. Token yalnızca Claude nota okurken ya da yazarken harcanır. Kabaca:

- bir MIDI çıkarma sonucunu okumak: 15-50 bin token;
- bir cover ya da yeni 3 dakikalık bir şarkı: 40-80 bin token.

Claude aboneliğinle ek ücret ödemezsin; sadece planının kullanım limitinden düşer.

## Özgünlük ve telif

Claude şarkı yazarken anlattığın tarzdan yeni notalar besteler. Kayıt aramaz ya da
kopyalamaz, telifli bir melodiyi de ezberden yazmaz. Tarzlar, tempolar ve yaygın
akor dizileri telifle korunmaz; tanınabilir melodiler korunur.

Mac'indeki her ses dosyasından MIDI çıkarabilir ya da cover yapabilirsin, örneğin
bir şarkıyı çalışmak ya da pratik yapmak için. Sonucu ne yapacağın, her müzik
programında olduğu gibi sana kalmış. Başkasının şarkısının cover'ını yayınlamak ya
da MIDI'sini paylaşmak hak sahibinin iznini gerektirebilir.

## Lisans

MIT. Logic Pro ve Dolby Atmos sahiplerinin (Apple Inc., Dolby Laboratories)
markalarıdır. Bu proje onlarla bağlantılı değildir ve onlar tarafından
desteklenmez. `setup-audio` ile indirilen modeller kendi lisanslarına tabidir.
