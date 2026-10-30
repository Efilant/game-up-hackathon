# Mimari

React + TypeScript + Vite; backend veya harici çalışma zamanı servisi yok.

- [simulation.ts](src/simulation.ts): mevcut saf deterministik motor; bu geliştirmede değiştirilmedi.
- [App.tsx](src/App.tsx): mevcut ekran akışı, diyalog, bütçe seçimi ve ses ayarları.
- [Cinema.tsx](src/Cinema.tsx): menü, bağlamsal karakter rehberi, strateji, tekrar ve karşılaştırmalı final.
- [CityScene.tsx](src/CityScene.tsx): izometrik SVG; bölge inceleme, hasara bağlı su alanı, seçili yatırımlar.
- [audio.ts](src/audio.ts): etkileşimle açılan Web Audio; ayrı müzik/efekt/master kanalları, beş motif, katman geçişi, kaynak temizliği.
- [styles.css](src/styles.css): korunan temel stiller. Sonra yüklenen [cinema.css](src/cinema.css) sinematik katman, mobil ve azaltılmış hareket kuralları.
- [e2e/](e2e/): gerçek Chromium tıklamaları, bütçe, varlıklar, ses sinyali, taşma, önce/sonra ve yeniden başlatma.

Sunum bileşenleri hesaplama yapmaz; motor çıktısını gösterir. Ses gürültüsü rastgele olabilir ama sonuç değişmez. Ses API yokluğunda oyun sessiz çalışır. Sahne müziği 1,2 saniyede karışır; eski kaynaklar durdurulup ayrılır.
