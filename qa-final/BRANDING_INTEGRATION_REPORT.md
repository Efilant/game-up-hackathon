# ŞEHRİN YARINI — Branding integration report

Çalışma tarihi: 2026-11-01

## Asset sonucu

Altı kullanıcı-provided rozet görseli gerçek uygulama ekranlarına bağlandı: Meraklı Kaşif, Uyum Ustası, Su Koruyucusu, Hastane Kahramanı, Toplum Dostu ve Üç Yıldız Efsanesi.

Kaynak klasörde ayrı resmi logo, İlk Adım ve Şehir Kaşifi dosyaları bulunmadı. Bu üç parça için proje içinde özgün SVG fallback/artwork üretildi; bu durum `ASSET_CREDITS.md` içinde açıkça belirtiliyor. Uygulama, tüm görselleri `src/branding.ts` içindeki merkezi `BRAND_ASSETS` manifestinden yüklüyor.

## Gerçek ekran entegrasyonları

- Ana menü: tam logo, compact marka, marka metadata ve favicon.
- Geçiş/loading curtain: tam logo.
- Pause, chapter result, credits: compact/tam marka kullanımı.
- Bölüm seçimi: üç gerçek bölüm kartı görseli; Bölüm 2/3 kilitli ve açılmıyor.
- Rozetlerim: 8 rozetlik responsive grid, gerçek ikon, açıklama, kilit overlay’i, kazanılma tarihi ve kalıcılık.
- Rozet bildirimi: gerçek koşul sonrası ikonlu, kısa ve erişilebilir toast.
- Sonuç ekranı: hesaplanan `0/1/2/3` değerine göre earned/empty pixel-art yıldız SVG’leri.

## Doğrulama

- `branding-assets.spec.ts`: desktop ve mobile gerçek browser ekranlarında logo, 8 rozet, 3 bölüm görseli ve image naturalWidth doğrulandı.
- `city-districts.spec.ts`: Şehir Kaşifi rozeti gerçek dört bölge yürüyüşünden sonra açıldı ve bildirim ekran görüntüsü alındı.
- `star-three-prepared.spec.ts`: gerçek üç yıldız sonucu ve yıldız SVG’leri doğrulandı.
- `npm run lint`: PASS
- `npm test -- --run`: 50/50 PASS
- `npm run build`: PASS

## Kanıt ekran görüntüleri

`branding-menu-desktop.png`, `branding-badges-locked-desktop.png`, `branding-badges-locked-mobile.png`, `branding-chapters-desktop.png`, `branding-badge-unlock.png` ve `star_3_prepared.png` gerçek uygulamadan alınmıştır. 0/1/2 yıldız senaryoları mevcut gameplay QA paketinde ayrıca yer alır.
