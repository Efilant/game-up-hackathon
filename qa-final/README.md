# ŞEHRİN YARINI — Complete Gameplay QA

Bu paket gerçek tarayıcı girdileriyle yapılan son doğrulama kanıtlarını içerir. Testler Playwright Chromium üzerinde, `WASD`, `E`, kahraman seçimi, gerçek hareket ve dokunmatik joystick girdileriyle çalıştırıldı.

- Test edilen kaynak: `5bbf36c`, branch `codex/phase3-weather-flood`
- Çalışma tarihi: 2026-11-01
- Unit: 50/50 geçti
- Desktop gameplay: kadın, erkek, 0/2/3 yıldız, hava-taşkın geçti
- Mobile: 390×844 hareket/joystick geçti; 360×740 yerleşim/taşma geçti
- Branding: gerçek logo/fallback, 8 rozet, bölüm kartları, yıldız görselleri ve mobil koleksiyon geçti
- Ana rapor: `FINAL_QA_REPORT.md`
- Bölge regresyon raporu: `CITY_DISTRICT_REGRESSION_REPORT.md`
- Branding raporu: `BRANDING_INTEGRATION_REPORT.md`
- Final görsel inceleme: `../FINAL_VISUAL_REVIEW.md` ve `../final-visual-review/`
- Yıldız matrisi: `STAR_VALIDATION_MATRIX.md`
- Açık noktalar: `REMAINING_ISSUES.md`

Branding kanıtları: `BRANDING_INTEGRATION_REPORT.md` ve `screenshots/branding-*.png`. Kaynak sette resmi logo dosyası bulunmadığı için kullanılan logo yerel özgün SVG fallback’tir; kullanıcı-provided rozet görselleri ve yerel SVG ayrımı `ASSET_CREDITS.md` içinde kayıtlıdır.
