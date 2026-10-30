# Test raporu — 31 Ekim 2026

## Sonuçlar

- npm test: **2 dosya / 7 test geçti**. Orijinal 5 test korundu; uygun savunma alt kümelerinin deterministik olması ve erken uyarının fiziksel hasarı değiştirmemesi için 2 regresyon testi eklendi.
- npm run build: **geçti** (TypeScript + Vite). [dist/](dist/) üretim çıktısı hazır. JS 253,43 kB; gzip 80,72 kB; CSS 31,00 kB.
- npm run test:e2e: **9/9 geçti, 29 saniye**. Gerçek Chromium, normal click; force-click, DOM click veya oyun state enjeksiyonu yok.
- Masaüstü 1440×900, mobil 390×844 ve animasyonları açık masaüstü olmak üzere üç proje.
- Menü → ayarlar → hakkında → giriş → stres → rol değişimi → üç savunma seçimi → tekrar → final → yeniden başlama tamamlandı.
- Konuşma portreleri yüklendi (naturalWidth > 0). Bölge düğmeleri, bütçe engeli ve dört sinyal kulesi doğrulandı.
- Finalde aynı bölgenin gerçek hasarının azaldığı doğrulandı. Akışta console error/pageerror listesi boş.
- Ana ekranlarda document genişliği viewport'u aşmadı. Mobil uzun ekranlar dikey kaydırılır.
- Ses: ilk etkileşim öncesi AudioContext açılmadı. Native AnalyserNode ile müzik sinyali, yalnız efekt kanalındaki yağmur, sıfır seviye ve mute durumunda sessizlik ölçüldü. Beş sahnenin farklı temel frekansları çalışan osilatörlerden doğrulandı.
- AudioContext yokken oyunun başlaması geçti. Fiziksel hoparlörden insan dinleme testi yapılmadı.

## Görüntüler

Gerçek Chromium üretim önizlemesinden full-page PNG'ler. Uzun sayfalarda yükseklik viewport'tan büyüktür. Entegre tarayıcının önceki hatalı ölçekli görüntüleri bu teslimin kanıtı değildir.

| Sahne | Masaüstü | Mobil |
| --- | --- | --- |
| Menü | [Görüntü](artifacts/menu-desktop.png) | [Görüntü](artifacts/menu-mobile.png) |
| Hikâye | [Görüntü](artifacts/story-desktop.png) | [Görüntü](artifacts/story-mobile.png) |
| Stres | [Görüntü](artifacts/stress-desktop.png) | [Görüntü](artifacts/stress-mobile.png) |
| Plan | [Görüntü](artifacts/plan-desktop.png) | [Görüntü](artifacts/plan-mobile.png) |
| Tekrar | [Görüntü](artifacts/replay-desktop.png) | [Görüntü](artifacts/replay-mobile.png) |
| Final | [Görüntü](artifacts/final-desktop.png) | [Görüntü](artifacts/final-mobile.png) |

## Değişen dosyalar

- Uygulama: [App.tsx](src/App.tsx), [main.tsx](src/main.tsx), [styles.css](src/styles.css).
- Yeni katmanlar: [Cinema.tsx](src/Cinema.tsx), [CityScene.tsx](src/CityScene.tsx), [cinema.css](src/cinema.css), [audio.ts](src/audio.ts).
- Test/yapılandırma: [invariants.test.ts](src/invariants.test.ts), [e2e/](e2e/), [playwright.config.ts](playwright.config.ts), [vitest.config.ts](vitest.config.ts), [package.json](package.json), [package-lock.json](package-lock.json), [.vscode/tasks.json](.vscode/tasks.json).
- Belgeler: [README](README.md), [tasarım](GAME_DESIGN.md), [mimari](ARCHITECTURE.md), [kurallar](SIMULATION_RULES.md), bu rapor, [dağıtım](DEPLOYMENT.md).

[Motor](src/simulation.ts) ve [orijinal testler](src/simulation.test.ts) değiştirilmedi. Mevcut karakter dosyaları kullanıldı.

## Sınırlar

Chromium test edildi; gerçek iPhone/Safari ve Firefox test edilmedi. Portre girişleri ve atmosfer animasyonlu; ayrı yüz ifadesi sprite'ları, göz kırpma, dudak senkronu ve seslendirme yok. Su görseli oyun hasarını temsil eder, fiziksel taşkın çözümü değildir. Üretim paketi hazır; halka açık adrese yayın yapılmadı. Alt dizin dağıtımı için yollar uyarlanmalıdır. Kullanıcının görsellerinin yayın hakları bağımsız doğrulanmadı; harici müzik kullanılmadı.
