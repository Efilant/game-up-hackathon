# Öncelikli İyileştirme Yol Haritası

## P0 — Sunumdan önce zorunlu

| Problem | Çözüm | Dosyalar | Fayda | Risk | Karmaşıklık |
|---|---|---|---|---|---|
| Storm sonrası softlock | Güvenli çıkış corridor’ı tanımla; flood collision’ı path-aware yap; görev 5 acceptance testi ekle | `playerMovement.ts`, `navigation.ts`, `ExplorableWorld.tsx` | Bölüm tamamlanabilir | Collision/nav davranışı değişir | High |
| Chapter 5–7 doğrulanamıyor | P0 düzeltmesinden sonra gerçek WASD/touch ile tam quest testini zorunlu yap | `e2e/weather-flood.spec.ts` | Demo ve jüri akışı güvenilir olur | Test rotaları kırılabilir | Medium |
| 36,5/38,5 tutarsızlığı | Dialog/narrative tüm depth değerlerini `spatialState` formatter’ından alsın | `ExplorableWorld.tsx` | Oyuncu güveni artar | Metin snapshot’ları değişir | Low |

## P1 — Yüksek değer

| Problem | Çözüm | Dosyalar | Fayda | Risk | Karmaşıklık |
|---|---|---|---|---|---|
| Savunma sonucu görünür değil | Defense sonrası su animation, road reopen event, citizens recovery ve before/after HUD göster | `spatialSimulation.ts`, `pixelWorldRenderer.ts`, `ambientCitizens.ts` | Cause-effect anlaşılır | Görsel/state senkronu | Medium |
| Mobile dialogue eksik | Touch route helper, 390×844 ve 360×740 acceptance testleri | `e2e/`, `ExplorableWorld.tsx` | Mobil sunum güveni | Responsive düzen etkilenebilir | Medium |
| E2E server lifecycle | Project başına izole preview portu/health check | `playwright.config.ts` | Flaky test azalır | CI süresi artar | Low |
| Save/load kritik state | Weather phase, tick, water depth ve defense state’i atomik kaydet/restore et | `ExplorableWorld.tsx`, `spatialSimulation.ts` | Continue güvenilir olur | Eski save migration gerekir | Medium |

## P2 — Polish

- HUD katmanlarını storm severity’ye göre sadeleştir.
- NPC speech bubble’larını viewport içinde clamp et.
- `Math.random()` yerine seeded speech scheduler kullan.
- 360×740 ve reduced-motion görsel review ekle.
- Demo için state bypass kullanmadan, gerçek akışı hızlandıran güvenli tutorial pacing ayarla.

