# FELAKET BENİM

**Önce sistemi zorla. Sonra onu kurtar.**

Türkçe, kısa anlatı ve strateji tabanlı iklim dayanıklılığı oyunu. 2045'te aynı aşırı yağış senaryosunu önce savunmasız hâliyle çalıştırır, sonra sınırlı bütçeyle korumaya çalışırsın.

## Çalıştırma

```bash
npm install
npm run dev
```

Üretim derlemesi: `npm run build` · Testler: `npm test` · Üretim önizleme: `npm run preview`

Yerel adres: http://localhost:5173/ (sunucu açıkken).

Gerçek Chromium testi: `npx playwright install chromium`, ardından `npm run build && npm run test:e2e`. Masaüstü ve mobil ekran görüntüleri [artifacts/](artifacts/) içine yazılır. [Test raporu](TEST_REPORT.md), [mimari](ARCHITECTURE.md), [dağıtım](DEPLOYMENT.md).

## Tasarım ve model

Kıyı Mahallesi, Eski Merkez, Yamaç Evleri ve Sanayi Koridoru farklı maruziyet ve kırılganlık katsayılarına sahiptir. Oyuncu 100 krediyi dört savunma arasında dağıtır. Aynı 88 mm/saat yağış tekrar çalıştırılır ve önce/sonra karşılaştırması gösterilir.

Ses, harici dosyaya ihtiyaç duymayan Web Audio API sentezleriyle sağlanır: her ekranın ayrı motifi, ayrı müzik/efekt seviyesi ve sessize alma kontrolü vardır. Tarayıcı autoplay kısıtını aşmak için ses ilk kullanıcı etkileşiminden sonra başlatılır; ses cihazı yokluğu oyunu engellemez. SVG/CSS çizimler projeye aittir. Model gerçek dünya iklim tahmini değildir.

Karakter varlıkları [`public/assets/characters/`](./public/assets/characters/) altında bulunur. Diyaloglarda `mira-portrait.png`, `aras-portrait.png` ve `eko-portrait.png` gerçek görsel kaynak olarak kullanılır; posterler ve cast konsepti referans/gelecek içerik içindir.
