# ŞEHRİN YARINI — Complete Real Player Gameplay QA Report

## Sürüm ve kapsam

Test edilen sürüm `5bbf36c` (`codex/phase3-weather-flood`), çalışma tarihi 2026-11-01. Kaynak çalışma ağacı önceden mevcut kullanıcı değişiklikleri içeriyordu; bu QA çalışması commit üretmedi ve bu değişiklikleri korudu.

## Sonuç özeti

| Alan | Sonuç | Kanıt |
|---|---|---|
| TypeScript/lint | PASS | `npm run lint` |
| Unit/invariants | PASS | 11 dosya, 50 test |
| Build | PASS | `npm run build` |
| Kadın kahraman gerçek bölüm | PASS | `chapter-completion.spec.ts`, 1 yıldız normal kurtarma |
| Erkek kahraman gerçek bölüm | PASS | `male-hero-completion.spec.ts` |
| 0 yıldız | PASS | `star-zero-failure.spec.ts` |
| 2 yıldız | PASS | `star-two-strategy.spec.ts`, 12 Kr bakiye |
| 3 yıldız | PASS | `star-three-prepared.spec.ts`, 72 Kr bakiye |
| Hava/flood | PASS | `weather-flood.spec.ts` |
| Mobil 390×844 | PASS | `player-movement.spec.ts`, 3 test |
| Mobil 360×740 | PASS | `mobile-360.spec.ts` |
| Şehir bölgesi sürekliliği | PASS | `city-districts.spec.ts`, dört gerçek geçiş |
| Bölge keşif rozeti | PASS | `ŞEHİR KAŞİFİ`, save kaydı ve HUD keşif sayacı |
| Logo/rozet/bölüm asset yükleme | PASS | `branding-assets.spec.ts`, desktop + mobile gerçek browser doğrulaması |
| Sonuç yıldız görselleri | PASS | Gerçek hesaplanan 0/1/2/3 yıldız koşulları ve pixel-art SVG’ler |
| Replay/menü/future chapters | PARTIAL | Menü ve mevcut replay akışı test edildi; dünya sonuç ekranından tam yeniden oynama ve kilitli bölümlerin tüm varyantları ayrıca doğrulanmadı |
| Her rozet için ayrı bildirim | PARTIAL | Rozet kalıcılığı ve bildirim altyapısı var; tek koşuda bildirim kuyruğunun tüm rozetleri ayrı ayrı gösterdiği doğrulanmadı |

## Gerçek oyuncu senaryoları

Kadın kahraman Mira ile görev zinciri; Mira, drenaj menfezi, Aras, gözlem noktası, fırtına, Sünger Kent, hastane yolu ve Mira raporu sırasıyla oynandı. Erkek kahraman Barış aynı zinciri ayrı koşuda tamamladı. Hareketler tutulmuş `WASD`, çapraz girişler, engel çevresinden dönüş ve `E` etkileşimiyle yapıldı.

Şehir sürekliliği koşusunda oyuncu aynı dünya üzerinde Eski Merkez, Yamaç Evleri, Kıyı Mahallesi ve Sanayi Koridoru arasında yürüdü. Bölge etiketi, kamera, keşif kaydı ve `ŞEHİR KAŞİFİ` rozeti doğrulandı.

Branding koşusunda ana menü logosu, responsive rozet koleksiyonu, kilitli/kazanılmış rozet durumları, bölüm seçim görselleri, gerçek unlock toast’ı ve hesaplanan yıldız SVG’leri tarayıcıda yüklendi. Resmi logo dosyası kaynak klasörde bulunmadığından yerel özgün SVG logo kullanıldığı `BRANDING_INTEGRATION_REPORT.md` ve `ASSET_CREDITS.md` içinde belirtilmiştir.

## Hava, taşkın ve Sünger Kent

Savunmasız koşulda hastane yolu pik suyu 34.8 cm ve eşik üzeri süre 1.80 sn oldu. Fırtına öncesi hazırlanmış Sünger Kent koşulunda pik 26.5 cm, eşik üzeri süre 0 sn oldu. Simülasyon deterministik, hücre bazlı, sonlu depolamalı ve toparlanma fazlıdır; mühendislik CFD tahmini değildir. Ayrıntılı kütle bütçesi `../SPONGE_CITY_VERIFICATION.md` içindedir.

## Kanıt dosyaları

`screenshots/` altında 0, 2 ve 3 yıldız sonuçları, Sünger Kent öncesi/sonrası/toparlanma ve 360×740 ekran görüntüleri bulunur. `logs/` altında çalışma sürümü bilgisi vardır. Video kanıtı üretilemediği için `videos/README.md` bu durumu açıkça belirtir.

## Son karar

Hareket, görev akışı, flood ölçümü, savunma farkı ve 0/2/3 yıldız sonuçları gerçek browser girdileriyle doğrulandı. Tam kalite sertifikası için PARTIAL olarak işaretlenen replay/future-chapter ve çoklu rozet bildirim kuyruğu ayrıca tamamlanmalıdır.
