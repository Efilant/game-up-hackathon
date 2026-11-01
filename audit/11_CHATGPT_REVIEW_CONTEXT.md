# Bağımsız ChatGPT İncelemesi İçin Context

## Oyun nedir?

FELAKET BENİM, GameUP Türkiye 2026 iklim temalı bir pixel-art şehir oyunu. Oyuncu Deniz veya Barış olarak şehirde yürür, Mira ve Aras ile konuşur, hastane yolundaki drenaj/flood riskini izler ve Sünger Kent gibi savunmalarla altyapı kararları vermelidir.

## Doğrulanmış özellikler

- React + TypeScript + Vite uygulaması.
- Canvas tabanlı dünya, DOM HUD/dialog/compass.
- WASD/arrow/diagonal movement, camera follow, obstacle collision, mobile joystick.
- Compass navigation; golden trail kaldırılmış.
- Quest 1–4 gerçek input ile tamamlanabiliyor.
- CLEAR/OVERCAST/LIGHT_RAIN/HEAVY_RAIN/EXTREME_STORM state’leri ve localized flood görünüyor.
- Unit/build/desktop/mobile test altyapısı mevcut.

## Kritik unresolved bug

Fırtına sonrasında `pointInFloodedRoadZone` oyuncunun bulunduğu gözlem alanından güvenli patikaya çıkışı da engelliyor. Bu nedenle görev 5 hedefi görünse de oyuncu Sünger Kent’e ulaşamıyor. Savunma kurulamadığı için recovery ve chapter result gerçek gameplay ile doğrulanmadı.

## Başka reviewer’ın özellikle kontrol etmesi gereken sorular

1. Flood collision güvenli kaçış koridorunu neden kapatıyor?
2. UI ve EKO metinleri tek canonical water depth kaynağından mı besleniyor?
3. Defense state gerçekten çevresel görünümü ve NPC davranışını değiştiriyor mu?
4. Save/load storm tick ve weather phase’i güvenli biçimde devam ettiriyor mu?
5. 360×740 ve touch dialogue akışı gerçekten sunulabilir mi?
6. Canlı bundle, `5bbf36c...` commit’iyle aynı mı?

## Kanıt haritası

- İlk görev ve kontrol: `03_GAMEPLAY_TEST_REPORT.md`, `screenshots/05_*`, `06_*`, `08_*`, `09_*`.
- Weather/flood: `05_WEATHER_FLOOD_AUDIT.md`, `screenshots/12_*`–`16_*`.
- Softlock: `07_BUG_REPORT.md`, `screenshots/17_*_unreached.png`–`19_*_unreached.png`.
- Testler: `10_TEST_RESULTS.md`, `logs/`.
- Mimari: `02_PROJECT_ARCHITECTURE.md`.

Bu context, başarı iddialarını yalnızca VERIFIED kanıtlarla sınırlar. Savunma/recovery/chapter completion şu paket için VERIFIED değildir.

