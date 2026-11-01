# ŞEHRİN YARINI — Official 120-Second Trailer Production Report

Tarih: 2026-11-01  
Çıktı: `trailer/renders/SEHRIN_YARINI_OFFICIAL_TRAILER_2MIN.mp4`

## Karar

**KOŞULLU GO — teknik teslim hazır, insan seslendirmesi bekliyor.**

120 saniyelik H.264/AAC teslim dosyası üretildi ve metadata ile doğrulandı. Ancak doğal insan Türkçe ses kaydı bulunmadığı için anlatım macOS `Yelda` sistem sesiyle geçici olarak üretildi. Yarışma/jüri tesliminden önce aynı metin insan sesiyle yeniden kaydedilip yalnızca ses katmanı değiştirilmelidir.

## Gerçek içerik

- 00:00–00:30: mevcut oyundan alınmış altı gerçek ekranın 30 fps görsel teaser kurgusu.
- 00:30–02:00: Chromium’da gerçek oyun girdileriyle alınmış 89,44 saniyelik kayıt; son 0,56 saniye, görüntü icat etmeden son gerçek karenin güvenli pad’iyle 90 saniyeye tamamlandı.
- Seçim, karakter kurulumu, hareket, NPC etkileşimi, menfez yönelimi ve Şehir Planı açma akışı kayıt script’iyle normal tarayıcı etkileşimleri üzerinden yürütüldü.
- Oynanışta state enjeksiyonu, sahte skor, sahte zafer veya uydurma özellik kullanılmadı.
- Resmî logo `trailer/graphics/official-logo.png` içinde arşivlendi; ana menü ekranı da oyunun gerçek logo kullanımını gösteriyor.

## Teknik doğrulama

| Kontrol | Sonuç |
|---|---|
| Final süre | 120,000 s |
| Görüntü | H.264, 1920×1080, yuv420p |
| Kare hızı | 30/1 sabit |
| Ses | AAC, 48 kHz, stereo, 192 kb/s |
| 30 saniyelik teaser | 30,000 s |
| 90 saniyelik gameplay segmenti | 90,000 s |
| Türkçe altyazı | `trailer/subtitles/trailer_tr.srt` ayrı teslim edildi |
| Ses yatağı | FFmpeg ile yerel prosedürel üretim; ticari parça kullanılmadı |

FFmpeg kurulumu macOS Homebrew üzerinden yapıldı. Sistem FFmpeg build’inde `drawtext`/`subtitles` filtresi bulunmadığı için altyazılar MP4’e gömülmedi; zaman kodları korunmuş SRT olarak paketlendi. Bu, video oynatıcısında altyazı seçimine veya son insan seslendirmesi sırasında burn-in işlemine uygundur.

## Kanıt dosyaları

- `trailer/raw/real-gameplay-90s.webm` — gerçek Chromium kaydı.
- `trailer/graphics/real-*.png` — gerçek oyun ekranları.
- `trailer/captures/preview_5s.png`, `preview_20s.png`, `preview_35s.png`, `preview_50s.png`, `preview_70s.png`, `preview_90s.png`, `preview_110s.png`, `preview_118s.png` — finalden çıkarılmış kareler.
- `trailer/scripts/edit_timeline.json` — zaman çizelgesi.
- `trailer/scripts/shot_manifest.md` — plan/kanıt manifestosu.
- `trailer/scripts/render_trailer.sh` — tekrarlanabilir render komutu.
- `trailer/audio/credits.md` — ses kaynağı ve lisans/provenance notları.

## Çalıştırılan kontroller

- Gerçek browser capture script’i: geçti; `REAL_GAMEPLAY_CAPTURE` çıktısı üretildi.
- Raw capture metadata: 1920×1080, VP9, 25 fps, 89,440 s.
- Rendered teaser metadata: 1920×1080, H.264, 30 fps, 30,000 s.
- Rendered gameplay metadata: 1920×1080, H.264, 30 fps, 90,000 s.
- Final metadata: 1920×1080, H.264/AAC, 30 fps, 120,000 s.
- Preview frame extraction: 8/8 kare üretildi.
- `npm run lint`: geçti (`tsc --noEmit`).
- `npm test -- --run`: geçti — 13 test dosyası, 54 test.
- `npm run build`: geçti — Vite production bundle üretildi.

## Bilinçli sınırlamalar

1. Bu paket tam sinematik kamera animasyonu değil; ilk 30 saniye gerçek ekran görüntülerinden oluşan kontrollü teaser’dır.
2. Seslendirme stüdyo insan kaydı değildir. Yelda TTS yalnızca teknik kurgu ve zamanlama doğrulaması içindir.
3. Ham gameplay kaydı 25 fps ve 89,44 saniyeydi; final teknik şartı için kare tekrarından oluşan 0,56 saniyelik pad kullanıldı.
4. Final MP4’te gömülü altyazı yoktur; ayrı SRT teslim edilmiştir çünkü bu makinedeki FFmpeg build’i altyazı filtreleriyle derlenmemiştir.

## Son öneri

Teknik olarak video teslim edilebilir. İnsan ses kaydı ve son altyazı tercihi tamamlanmadan “nihai yayın master’ı” olarak işaretlenmemelidir. Ses kaydı değiştiğinde `bash trailer/scripts/render_trailer.sh` komutu final MP4’ü yeniden üretir.
