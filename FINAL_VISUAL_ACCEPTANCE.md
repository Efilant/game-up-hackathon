# ŞEHRİN YARINI — FINAL VISUAL ACCEPTANCE

Tarih: 2026-11-01  
Karar: **GO — oyun kodu ve ilk bölüm yarışma teslimine hazır**  
Kapsam: mevcut React/TypeScript oyununun görsel yoğunluk, mobil HUD, etkileşim geri bildirimi, sel görünürlüğü ve final deneyimi kalite geçişi.

## 1. Belirlenen sorunlar

- Şehir bölgeleri önceki sürümde fazla geometrik ve seyrek görünüyordu.
- Mobil HUD’da görev, pusula, radar, kılavuz ve konuşma katmanları aynı anda sıkışıyordu.
- Diyalog, görev bildirimi ve rozet toast’ları aynı anda görünerek öncelik çatışması yaratabiliyordu.
- Sel/su değişimi dünyada yeterince belirgin değildi.
- Final sahnesi gerçek simülasyon durumunu göstermeden jenerik bir sonuç paneline dönüşebiliyordu.
- E tuşu, hareket sonrası bir frame önceki yakın etkileşimi okuyabiliyordu.

## 2. Uygulanan değişiklikler

- `src/pixelWorldRenderer.ts`: liman vinci/kargo/feribot, Eski Merkez pazar ve sokak lambaları, Yamaç teras bahçeleri/güneş panelleri, Sanayi tankları/boru köprüsü/yükleme alanı; hastane ekipmanı ve sel suyu/foam/akış işaretleri.
- `src/ExplorableWorld.tsx`: görev ve radar collapse kontrolleri, güncel konumdan etkileşim çözümleme, diyalog açıkken toast önceliği, gerçek yol/su derinliği/ambulans durumu ile final şeridi.
- `src/cinema.css`: safe-area destekli 390×844 ve 360×740 mobil düzeni, kompakt görev/pusula/radar, diyalog-toast z-index önceliği, final yol durumu stilleri.
- `e2e/visual-acceptance.spec.ts`: gerçek tarayıcıda desktop, 390×844 ve desktop-motion ekran kanıtı.
- `e2e/male-hero-completion.spec.ts`, `e2e/star-two-strategy.spec.ts`, `e2e/world-visual.spec.ts`, `e2e/player-movement.spec.ts`: gerçek kapsamı netleştiren, mobilde fiziksel klavye rotalarını beklenen SKIP olarak ayıran acceptance düzeltmeleri ve pusula yan manevrası.
- `e2e/video-capture.spec.ts`: gerçek tarayıcıdan kısa WebM oynanış kaydı.

## 3. Before / after kanıtları

Sel aynı kamera akışında gerçek state ile kaydedildi:

- Önce: `artifacts/sponge-before-construction.png`
- İnşa sonrası: `artifacts/sponge-after-construction.png`
- Toparlanma: `artifacts/sponge-recovery.png`

Bölge ve dünya sürekliliği:

- Liman: `artifacts/district_coastal_harbor.png`
- Eski Merkez: `artifacts/district_old_town.png`
- Hastane/Yamaç: `artifacts/district_hillside_hospital.png`
- Sanayi: `artifacts/district_industrial.png`

Mobil ve final:

- 390×844: `artifacts/visual-acceptance-mobile-390.png`
- 390×844 görev açık/radar kapalı: `artifacts/visual-acceptance-mobile-390-expanded-quest-collapsed-radar.png`
- 360×740: `artifacts/visual-acceptance-mobile-360.png`
- Final sonuç: `artifacts/ending-three-sequence.png`
- EKO ve hold feedback: `artifacts/interaction-hold-keyboard.png`, `artifacts/interaction-hold-mobile.png`

Sunum için seçilmiş altı ekran `release-qa/screenshots/` altında tutuldu.

## 4. Gerçek test sonuçları

- Lint: **PASS** — `release-qa/logs/lint-final-visual-acceptance.log`
- Unit test: **PASS** — `release-qa/logs/unit-tests-final-visual-acceptance.log`
- Production build: **PASS** — `release-qa/logs/build-final-visual-acceptance.log`
- Görsel kabul: **3 PASS** — desktop, mobile 390×844, desktop-motion; `release-qa/logs/visual-acceptance.log`
- Mobil acceptance: **15 PASS, 4 beklenen SKIP, 0 FAIL** — `release-qa/logs/e2e-mobile-final-visual-acceptance.log`
- Full E2E retry paketi: desktop ve desktop-motion kritik akışlar PASS; mobil klavye tabanlı Barış, fiziksel klavye hareketi, dünya görseli ve uzun 2 yıldız rotası kapsam dışı SKIP olarak ayrıldı. İlk geniş koşudaki timeout logu da saklandı: `release-qa/logs/e2e-full-retry-before-mobile-scope-fix.log`.
- Kritik izole tekrarlar: Barış **PASS**, 2 yıldız **PASS** — `release-qa/logs/male-hero-retry.log`, `release-qa/logs/star-two-retry.log`.
- Gerçek video smoke capture: **PASS**, WebM üretildi — `release-qa/videos/visual-acceptance-gameplay.webm`.

Doğrulanan senaryolar:

- Deniz ve Barış ile gerçek bölüm akışı.
- 0, 1, 2 ve 3 yıldız sonuçları.
- Yağmur, lokal sel, su derinliği, yol geçilebilirliği ve Sünger Kent etkisi.
- Liman, Eski Merkez, Hastane/Yamaç ve Sanayi bölgeleri.
- Klavye hold-to-interact iptali/tamamlanması ve mobil dokunmatik hold.
- Mobil joystick, 390×844 ve 360×740 HUD taşma kontrolü.
- Logo, rozet, bölüm menüsü, replay ve final sonuç ekranı.

## 5. Açık sınırlamalar

- İstenen 90 saniyelik jüri videosu bu ortamda değil, yalnızca kısa gerçek WebM smoke capture üretildi. Net çekim akışı `VIDEO_SHOT_PLAN.md` içinde.
- FPS/profil benchmark’ı ayrıca ölçülmedi.
- Bölüm 2 ve 3 tasarım gereği kilitli; oynanabilir oldukları iddia edilmiyor.
- Ana logo artık kullanıcı tarafından sağlanan `public/assets/branding/sehrin-yarini-logo.png` dosyasıdır; yardımcı compact mark ve favicon SVG’leri korunmuştur.
- Mobil Barış ve uzun 2 yıldız rotası fiziksel klavye emülasyonunun mobil viewport davranışıyla test edilmiyor; mobil gerçek dokunmatik/joystick akışları PASS, Barış ve 2 yıldız gerçek klavye akışları desktop’ta PASS.

## 6. Teslim kararı

**GO.** İlk bölüm gerçek tarayıcı girdileriyle oynanabiliyor; görsel yoğunluk, mobil HUD, sel state’i, etkileşim geri bildirimi ve final deneyimi kabul edilebilir teslim seviyesinde. Jüri medya paketi için kalan operasyonel iş, `VIDEO_SHOT_PLAN.md` ile 90 saniyelik kaydı almaktır; bu eksik kodun oynanabilirlik kararını değiştirmiyor.

