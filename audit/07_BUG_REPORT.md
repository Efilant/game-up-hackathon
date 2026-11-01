# Bug Raporu

## BUG-P0-001 — Fırtına sonrası oyuncu softlock oluyor

- Severity: P0 — bölüm tamamlanmasını engelliyor
- Sistem: Player movement / flood collision / quest progression
- Tekrarlama: Yeni oyun → Mira → menfez → Aras → gözlem → fırtınanın başlamasını bekle → W/A ile Sünger Kent’e çıkmayı dene.
- Beklenen: Oyuncu güvenli kuzey patikasından savunma alanına ulaşmalı.
- Gerçek: `data-flood-depth=36.5`, yol kapalı; oyuncu mevcut flooded-road collision alanından ilerleyemiyor. Hedef 23 m görünmeye devam ediyor.
- Kanıt: `screenshots/17_defense_selection_unreached.png`, `18_defense_construction_unreached.png`.
- İlgili dosyalar: `src/playerMovement.ts`, `src/navigation.ts`, `src/ExplorableWorld.tsx`.
- Muhtemel neden: `canPlayerOccupy()` flooded-road zone’u oyuncunun çıkış hareketi için de tamamen katı kabul ediyor.
- Öneri: Flooded area girişini kapatırken güvenli çıkış waypoint/corridor’larını geçirilebilir tut; veya oyuncuyu gözlem etkileşiminden sonra güvenli tarafa taşı. Bunu route graph ile aynı traversability modeline bağla.
- Doğrulama: Henüz düzeltilmedi.

## BUG-P1-002 — Taşkın derinliği metinleri uyuşmuyor

- Severity: P1
- Sistem: Weather/flood HUD/dialogue
- Tekrarlama: Fırtına gözlem etkileşimini aç.
- Beklenen: Tüm UI aynı simulation depth değerini göstermeli.
- Gerçek: HUD `36.5 cm`, EKO storm metni `38.5 cm`.
- Kanıt: `screenshots/15_flooded_hospital_road.png`.
- İlgili dosya: `src/ExplorableWorld.tsx`.
- Muhtemel neden: Diyalog metninde sabit değer, HUD’da simülasyon state’i kullanılıyor.
- Öneri: Sabit sayıları kaldır; tek formatter/canonical state kullan.
- Doğrulama: Henüz düzeltilmedi.

## BUG-P1-003 — Savunma, recovery ve chapter result normal akışta doğrulanamıyor

- Severity: P1
- Sistem: Quest 5–7 / defense / chapter completion
- Tekrarlama: BUG-P0-001 sonrası görev 5’e geç.
- Beklenen: Sünger Kent inşa edilir, su azalır, yol açılır, Mira’ya dönülür.
- Gerçek: Hedefe erişilemedi; üç ekran `unreached` olarak kaydedildi.
- Kanıt: `17_defense_selection_unreached.png`, `18_defense_construction_unreached.png`, `19_after_intervention_unreached.png`.
- İlgili dosyalar: `src/ExplorableWorld.tsx`, `src/spatialSimulation.ts`.
- Öneri: P0 softlock düzeltildikten sonra gerçek browser acceptance test ekle.
- Doğrulama: NOT VERIFIED.

## BUG-P2-004 — Bağımsız mobile E2E koşusunda preview server bağlantısı koptu

- Severity: P2 — test/CI güvenilirliği
- Sistem: Playwright webServer lifecycle
- Tekrarlama: `npx playwright test --project=mobile` ilk audit koşusu.
- Beklenen: 8 test aynı preview server ile tamamlanmalı.
- Gerçek: İlk 3 test geçti, sonraki 5 test `net::ERR_CONNECTION_REFUSED` aldı.
- Kanıt: `logs/playwright-mobile.log`; retry `logs/playwright-mobile-retry.log` 8/8 geçti.
- Muhtemel neden: Preview server’ın koşular arası kapanması veya test runner lifecycle yarışı; ürün runtime hatası olarak doğrulanmadı.
- Öneri: CI’da her project için izole server portu veya `reuseExistingServer:false`; server health check ve retry ekle.
- Doğrulama: Retry ile geçti, kök neden kesinleşmedi.

## BUG-P2-005 — Mobile dialogue acceptance coverage eksik

- Severity: P2
- Sistem: Mobile touch navigation / dialogue
- Gerçek: Mobil joystick ile hareket görüldü; hedef yarıçapına girip diyalog açma bu audit’te tamamlanamadı.
- Kanıt: `screenshots/22_mobile_dialogue_not_reached.png`.
- Öneri: Touch route helper ve mobile dialogue E2E acceptance testi ekle.
- Doğrulama: NOT VERIFIED.

