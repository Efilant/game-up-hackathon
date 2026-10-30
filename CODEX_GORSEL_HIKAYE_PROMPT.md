# CODEX — FELAKET BENİM / GÖRSEL, KARAKTER VE HİKÂYE GELİŞTİRME TALİMATI

Mevcut `/Users/elif/felaket_benim` projesi üzerinde çalış. Sen kıdemli oyun yönetmeni, React/TypeScript geliştiricisi, anlatı tasarımcısı, UI/UX tasarımcısı ve QA mühendisisin. Kullanıcı kod yazmıyor; uygulama, entegrasyon, test, hata düzeltme ve dosya düzenini sen gerçekleştir.

## Değişmez koşullar
- Oyunu sıfırdan yazma. Mevcut `src/simulation.ts` dosyasını, hesaplama doğruluğunu, menü→anlatı→stres testi→rol değişimi→planlama→ikinci simülasyon→Şehrin Hafızası akışını koru.
- Mevcut çalışan özellikleri ve testleri bozma. Her önemli adımdan sonra `npm test` ve `npm run build` çalıştır.
- Amaç bir dashboard'u renklendirmek değil; görsel atmosferi, karakterleri, hikâye sahneleri, oynanabilir şehir haritası ve sahnelere bağlı sesleri bulunan **premium 2D indie oyun demosu** ortaya çıkarmak.
- **Türkçe** arayüz; klavye, mobil ve dokunmatik erişim; alt yazılı diyaloglar; `prefers-reduced-motion`; ses kapalı çalışabilme; responsive ve erişilebilir kontrast.
- Kesinlikle sahte buton, kırık görsel, boş bileşen, doğrulanmamış 'test geçti' iddiası veya telif durumu belirsiz müzik kullanma.

## Sağlanan görseller — doğrudan projeye bağla
Bu talimatla birlikte `public/assets/characters/` klasöründe şu dosyalar bulunur:
- `mira-portrait.png` — MİRA oyun içi görseli
- `aras-portrait.png` — ARAS oyun içi görseli
- `eko-portrait.png` — EKO oyun içi görseli
- `mira-poster.png`, `aras-poster.png`, `eko-poster.png` — tam karakter posterleri
- `cast-concept.png` — 3 karakterin ortak görsel referansı

Bu kaynakları gerçekten bileşenlerde kullan; dış görüntü URL'leri kullanma. Posterlerde karakter adı/metin bulunduğundan diyalog ekranında **portrait** sürümlerini göster; karakter isimlerini HTML/CSS ile tek kez yaz. Görsellerin güvenli kırpılması için `object-fit`, `object-position`, overflow kontrolü kullan; yüzleri kesme. `loading` ve uygun `alt` ekle. Tek ve tutarlı stil: çizgi roman/indie konsept illüstrasyonu, lacivert yağmurlu atmosfer, MİRA turkuaz, ARAS turuncu, EKO camgöbeği-mor.

## Karakter tasarım incili
**MİRA — iklim bilimci:** 28-32 yaşlarında, koyu omuz hizasında saç, açık-gri/turkuaz saha montu, sırt çantası, tablet. Meraklı, bilimsel, vicdanlı; bilmediğini biliyormuş gibi söylemez. Rolü iklim tehlikesi (hazard), maruziyet (exposure) ve kırılganlık (vulnerability) ayrımını oyun sırasında doğal biçimde öğretmek. Duygu durumları: sakin, endişeli, umutlu.

**ARAS — şehir mühendisi:** 30'lu yaşlar, kısa koyu saç, hafif sakal, turuncu detaylı teknik ceket, şehir planları. Pratik ve güvenilir ama kaynak kısıtlarını gizlemez. Rolü maliyet/fayda ve savunma önlemlerinin yan etkilerini göstermek. Duygu durumları: analitik, baskı altında, rahatlamış.

**EKO — simülasyon zekâsı:** siyan/mor kristal form, karanlık ekran-yüz, sade parlayan gözler, minik yüzen parçalar. İlk başta nötr ve gizemli, zamanla oyuncuyu karar sorumluluğuna götüren sıcak ama kendini abartmayan anlatıcı. Rolü simülasyon adımlarını aktarmak; sahne geçişinde animasyonla tepki vermek. Gerçek LLM/API zorunlu değil. Duygular: merak, kritik uyarı, destek.

Karakterler konuşurken görsel seçili karaktere geçsin; konuşma kartı, isim, kısa rol, 1-3 cümle diyalog, 'Devam et' ve isteğe bağlı atla/geri seçenekleri olsun. Typewriter efekti varsa 'ilerle' ile yazıyı hızlandırıp sonraki satıra geçiş güvenli olsun. Alt yazı zorunlu; seslendirme opsiyonel.

## Dramaturji ve sahneler
1. **ANA MENÜ:** `FELAKET BENİM` logosu, alt başlık 'Önce sistemi zorla. Sonra onu kurtar.', 2045 yağmurlu şehir silüeti, yavaş parallax; Oyna / Ayarlar / Hakkında ve çalışır ses ayarları. Arayüz HUD'a benzemesin. İlk etkileşim sonrası ses çalmaya başlasın.
2. **GİRİŞ — KONTROL ODASI:** EKO simülasyonu tanıtır. MİRA tehlikenin doğal olabileceğini, felakete dönüşmesinde kent kırılganlığının önemini belirtir. ARAS dört bölgeyi tanıtır.
3. **STRES TESTİ:** Aynı koşullardaki aşırı yağış senaryosu. Görselde yağmur, su baskını, risk alanları; dört bölge etkileşimi çalışır; sonuç metninde neden-sonuç göster. Bilimsel ölçüm gibi sunulmayan, açıklanmış oyun endeksleri.
4. **ROL DEĞİŞİMİ / DÖNÜM NOKTASI:** EKO 'Artık hangi bölgelerin neden zarar gördüğünü biliyorsun. Peki aynı şehri koruyabilir misin?' der. Kısa görsel geçiş, sessizlik/tek vuruş ses, sonra planlamaya geçiş.
5. **PLANLAMA:** 100 kredi ve dört savunma seçeneği. ARAS önlemlerin maliyetini, MİRA kimi koruduklarını ve nerede hâlâ risk kaldığını açıklar. Seçim yapılınca haritada görünür kurulum işareti oluşsun. İleri butonu ancak geçerli seçimde aktif olsun.
6. **TEKRAR TEST:** Aynı yağış, aynı başlangıç koşulları, sadece yatırım etkisi farklı. Sıcak renkli/soğuk renkli geri bildirimler anlamlı, yalnız renge dayanmayan etiketler.
7. **ŞEHRİN HAFIZASI:** Önce/sonra şehir görselleri aynı bakış açısında; risk, altyapı, can güvenliği ve bütçe endeksleri; karakterlerin sonuçlara göre değişen kısa cümleleri; yeniden dene butonu. Yalnız sahte iki resim değil, hesaplama sonuçlarını yansıtan dinamik görünüm.

Üç anlamlı sonuç metni oluştur: başarılı dirençlilik, kısmi başarı, yüksek kalıntı risk. Bunlar gerçek hesaplanmış değerlerden türesin. Yüksek puanla her şeyi çözmüş gibi iddia etme.

## Ses ve müzik
Beş sahne için ayrı özgün *enstrümantal* müzik motifi veya loop: menü (gizem), giriş (keşif), stres testi (gerilim), planlama (düşünme), final (sonuca göre umutlu/temkinli). Yağmur, gök gürültüsü, buton, harita seçimi, yatırım, rol dönüşü gibi SFX ekle. Web Audio ile programatik özgün ses üretimi kabul edilebilir; sesler çalmıyor gibi yapan sahte düğme kabul edilmez. `Music volume`, `SFX volume`, mute birbirinden bağımsız çalışsın. Tarayıcı autoplay politikası uyarınca kullanıcı etkileşimi öncesi ses başlatma. Sesli anlatım varsa altyazı ile senkron olsun, ancak opsiyonel.

## Grafik, mimari ve performans
İllüstrasyonları `assets/characters/` altından import/URL üzerinden kullan. İlk ekranı ağırlaştırmamak için lazy-load uygula, gerekli yerlerde PNG optimizasyonu yap. SVG şehir haritası üzerinde bölgelerin etkileşimli hit area'larını koru. Görselde parçacık/yağmur/pulse/panel geçişleri CSS/SVG ile yap; düşük cihazlarda efekti azalt. Oyun state'ini tek kaynakta tut; mevcut simülasyon motorunu görsellerden ayır. 390x844 mobil ve 1440x900 masaüstünde tasarım dengeli olmalı. Metinlerin görsel üstünde okunaklı olması için gradient overlay ve uygun yerleşim kullan.

## Kritik kabul testleri
- `npm test`, `npm run build` başarılı; sonuçları gerçekten çalıştır ve raporla.
- E2E: Oyna→giriş→ilk test→rol değişimi→savunma→ikinci test→final bütünlüğü.
- E2E: Mobilde menü butonları engellenmeden tıklanır; yatay taşma yok; oynanış bitirilebilir.
- E2E: Sağlanan 3 görsel yüklenir, `naturalWidth > 0`; kırık resim yok.
- E2E: Müzik/SFX/mute kontrolleri durum değiştirir; sessiz modda hata oluşmaz.
- Aynı savunmalar ve parametrelerle aynı sonuç, farklı savunmalarla anlamlı farklı sonuç; erken uyarı fiziksel hasarı sihirli biçimde azaltmaz.
- Tarayıcı console/error izleme, hatasız yapı; etkileşim engelleyen dekoratif katmanların `pointer-events` kontrolü.
- README, GAME_DESIGN, TEST_REPORT, gerekirse ARCHITECTURE dosyalarını güncelle.

## Öncelik ve teslim
**P0 (zorunlu):** Karakter görsellerini gerçek oyuna entegre et, ana menüyü yenile, diyaloglar ve hikâye, orijinal ses, tam akış ve finali koru. **P1:** Ek karakter duyguları, mikro animasyonlar, daha güçlü şehir görsel durumu. **P2:** Seslendirme, ek afet türü, daha büyük şehir. P0 bitmeden P1/P2'ye geçme.

Başlangıçta var olan dosyaları oku ve kısa plan çıkar, **sonra gerçekten kodu değiştir**. 'Tamamlandı' demeden Playwright ekran görüntüleri üret: `artifacts/menu-desktop.png`, `artifacts/story-desktop.png`, `artifacts/plan-mobile.png`, `artifacts/final-desktop.png`. Gerekirse test araçlarının erişemediği şeyleri dürüstçe 'doğrulanamadı' olarak işaretle. En sonda değişen dosyalar, test sonuçları, ekran görüntüleri, kalan eksikler ve çalıştırma komutlarıyla kısa teslim raporu ver.
