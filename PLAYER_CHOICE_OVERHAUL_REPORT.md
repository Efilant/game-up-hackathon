# ŞEHRİN YARINI — Player-Driven Climate Strategy Review

Tarih: 2026-11-01  
Kapsam: Oyuncunun iklim çözümünü kendi araştırıp seçmesi, planlaması ve simülasyon sonucunu görmesi.

## Sonuç özeti

Oyuncu artık tek bir savunmaya zorlanmıyor. Dört çözüm sahada keşfedilebiliyor, Şehri Koruma Planı günlüğünde ayrı ayrı incelenebiliyor, bütçeye ve hedef bölgeye göre seçilebiliyor ve yalnızca plan onaylandıktan sonra simülasyona uygulanıyor.

Karar: **KOŞULLU GO**.

Oyuncu seçimi akışı ve mevcut 0/2/3 yıldız regresyonları doğrulandı. Final tesliminden önce 9 adımlı yeni görev metnine tam geçiş, mobilde çözüm günlüğünün gerçek dokunmatik E2E testi ve dört savunmanın ayrı ayrı gerçek fırtına sonuçlarının ekran kanıtları tamamlanmalıdır.

## 1. Çekirdek oyun döngüsü

| Aşama | Oyuncu girdisi | Gerekli durum | Anlık geri bildirim | Geçiş / başarı | Başarısızlık |
|---|---|---|---|---|---|
| Keşfet | WASD, oklar, joystick | Dünya açık, hedef pusulası görünür | Yakın saha işareti, keşif bildirimi, HUD ilerlemesi | Çözüm `DISCOVERED` olur | Harita dışına veya suya geçiş engellenir |
| İncele | E, basılı tutma veya plan günlüğündeki `İNCELE` | Saha keşfedilmiş veya gerçek NPC/menfez etkileşimi | Diyalog, progress bar, çözüm açıklaması | Çözüm `AVAILABLE` olur | E erken bırakılırsa işlem iptal edilir |
| Karşılaştır | ŞEHİR PLANI düğmesi | En az bir çözüm araştırılmış | Fayda, maliyet, etkili bölge ve sınır aynı kartta görünür | Oyuncu geçici plan oluşturur | Kilitli çözüm seçilemez; bütçe aşımı uyarılır |
| Seç | `PLANA EKLE` / `PLANDAN ÇIKAR` | Çözüm `AVAILABLE` veya `BUILT` | Plan maliyeti ve kalan bütçe canlı güncellenir | Pending plan hazır olur | 100 Kr üstü plan onaylanamaz |
| İnşa et | `PLANI ONAYLA` | Plan bütçeye uygun | Onay bildirimi, aktif plan HUD/canvas state’i | Plan simülasyona yazılır; `BUILT` durumu | Boş plan seçilebilir; bu durumda fiziksel savunma kurulmaz |
| Simüle et | Fırtınayı gözlemle, dünyada hareket et | Onaylanmış plan, sabit zamanlı model | Yağmur, su derinliği, yol durumu ve ölçüm toast’ları değişir | Hidrolik etkiler modelden okunur | Uyarı tek başına su derinliğini azaltmaz; kıyı seti iç yolu doğrudan korumaz |
| Değerlendir | Hastane yolu denetimi, Mira’ya rapor | Simülasyon tamamlanmış | Ölçülen su seviyesi, yol geçişi ve sonuç ekranı | Görev 7/7 ve yıldız hesabı | Yol kritik seviyede kalırsa bölüm başarısız olabilir |
| Ödüllendir | Sonuç ekranı / tekrar oynama | Sonuç kaydedilmiş | Yıldızlar, rozetler, replay ve bölüm sonucu | Save/load ile korunur | Eksik koşullar gerçek sonuçta gösterilir |

Önceki belirsizlik, adım 5’te doğrudan “Sünger Kent kur” yönlendirmesiydi. Bu metin kaldırıldı ve adım `Savunma Planını Oluştur` olarak genelleştirildi. Mevcut 7 adımlı save uyumluluğu korundu; önerilen 9 adımlı görev yapısına henüz tam migrasyon yapılmadı.

## 2. Oyuncuya sunulan çözümler

Kaynak maliyetleri `simulation.ts` içindeki mevcut savunma kayıtlarından okunur; çözüm günlüğü ayrı bir kopya maliyet tutmaz.

| Çözüm | Maliyet | Etkili alan | Gerçek sınır |
|---|---:|---|---|
| Sünger Kent | 28 Kr | Yamaç havzası, hastane yolu su yükü | Kapasitesi sınırlıdır; aşırı yağışta dolabilir |
| Menfez İyileştirmesi | 36 Kr | Hastane yolu ve drenaj hattı | Toplam yüzey suyunu yok etmez; konuma bağlıdır |
| Taşkın Bariyeri | 42 Kr | Liman ve kıyı mahallesi | Hastane yolu taşkınını doğrudan çözmez |
| Erken Uyarı Ağı | 18 Kr | Mahalle güvenliği ve tahliye hazırlığı | Su derinliğini veya fiziksel hasarı azaltmaz |

Durumlar kodda ayrı tutulur: `LOCKED → DISCOVERED → AVAILABLE → BUILT`. `discoveredSolutions`, `investigatedSolutions`, `pendingPlan` ve `activeDefenses` birbirinden ayrıdır. Saha yaklaşımı yalnızca keşfeder; plan günlüğündeki `İNCELE` veya gerçek etkileşim kullanılabilirlik durumunu açar.

## 3. Uygulanan değişiklikler

- `src/solutionRegistry.ts`: dört çözümün tipli merkezi kaydı, keşif yöntemi, maliyet, fayda, sınır ve bölge kapsamı.
- `src/solutionRegistry.test.ts`: dört seçenek ve durum geçişleri için birim testleri.
- `src/ExplorableWorld.tsx`: saha keşfi, çözüm incelemesi, Şehri Koruma Planı, pending plan, bütçe onayı, save/load alanları, generic görev adımı ve çözüm bazlı geri bildirim.
- `src/saveMigration.ts`: save version 4 ve yeni alanlar için geriye dönük güvenli varsayılanlar.
- `src/cinema.css`: masaüstü ve dar ekranlar için plan günlüğü/çözüm kartları.
- `e2e/player-choice-overhaul.spec.ts`: gerçek WASD ile Mira etkileşimi, bütçe seçimi ve dört çözüm sahasının keşfi.

Plan günlüğünün görsel sunumu da referans ekranına yaklaştırıldı: koyu teal defter yüzeyi, altın ayraç/çerçeve, büyük serif başlık, bulanık şehir arka planı, dört çözüm için ayrı code-native illüstrasyon ve seçili plan için altın vurgu eklendi. Bu görseller işlevsel state’ten beslenir; seçili kart, bütçe ve keşif sayısı gerçek state ile değişir.

EKO artık oyuncunun yerine karar vermiyor; etkileri ve sınırları açıklıyor. Oyuncu ister tek bir çözüm, ister bütçeye sığan kombinasyon, ister savunmasız bir plan onaylayabiliyor. Sonuç yine simülasyonun gerçek verilerinden üretiliyor.

## 4. Gerçek test kanıtı

### Geçen kontroller

- `npm run lint` — geçti.
- `npm test -- --run` — **13 dosya / 54 test geçti**.
- `npm run build` — geçti; production bundle üretildi.
- `e2e/player-choice-overhaul.spec.ts --project=desktop` — **2/2 geçti**.
  - Çözüm günlüğü 0/4 durumundan açıldı.
  - Mira’ya gerçek WASD ile gidildi; Erken Uyarı Ağı araştırıldı.
  - 100 Kr bütçeden 18 Kr planlanıp onaylandı.
  - Dört saha gerçek hareketle keşfedildi.
  - 54 Kr’lik Erken Uyarı + Menfez İyileştirmesi karşılaştırması görüntülendi.
- Kritik regresyon E2E — **5 geçti, 1 atlandı**:
  - bölüm tamamlama geçti;
  - 3 yıldız hazırlık senaryosu geçti;
  - 2 yıldız strateji senaryosu geçti;
  - 0 yıldız başarısızlık senaryosu geçti;
  - klavye menfez etkileşimi geçti;
  - bu çalıştırmada mobil varyant, desktop project seçildiği için atlandı.

### Üretilen ekran kanıtları

- [01_solution_discovery.png](artifacts/01_solution_discovery.png)
- [02_all_solutions_discovered.png](artifacts/02_all_solutions_discovered.png)
- [03_planning_journal.png](artifacts/03_planning_journal.png)
- [04_strategy_comparison.png](artifacts/04_strategy_comparison.png)
- [05_budget_selection.png](artifacts/05_budget_selection.png)

Önceki gerçek oynanış kanıtları arasında [star_0_failure.png](artifacts/star_0_failure.png), [star_2_strategy.png](artifacts/star_2_strategy.png), [star_3_prepared.png](artifacts/star_3_prepared.png), [sponge-before-construction.png](artifacts/sponge-before-construction.png), [sponge-after-construction.png](artifacts/sponge-after-construction.png) ve [sponge-recovery.png](artifacts/sponge-recovery.png) bulunur.

## 5. Açık kalan noktalar

1. Görev akışı save uyumluluğu için 7 adımda kaldı; attachment’taki 9 adımlı metinsel yapı birebir uygulanmadı.
2. Çözüm günlüğü mobil CSS ile responsive olsa da bu turda mobil dokunmatik seçim için ayrı gerçek E2E koşulmadı.
3. Dört seçeneğin her birini tek başına ve tüm kombinasyonları gerçek fırtına akışında tekrar oynatıp ayrı ekran kanıtına bağlayan kapsamlı matris henüz tamamlanmadı.
4. Erken Uyarı ve Taşkın Bariyeri bilinçli olarak hastane yolu su derinliğini tek başına düşürmez. Bu, başarısızlık değil, çözüm sınırının oyuncuya açıklanmasıdır; ancak final sunumunda bu ayrım net gösterilmelidir.

## 6. Final önerisi

Bir sonraki kısa kalite geçişinde yalnızca şu işler yapılmalı:

- mobilde `ŞEHİR PLANI` açma, kart inceleme, seçim ve onay için gerçek dokunmatik E2E;
- 0/1/2/3 yıldız için çözüm bazlı gerçek sonuç matrisi;
- 9 adımlı görev metnine geçilecekse save migration ve eski kayıt testi;
- final sunumuna yalnızca gerçek sonuç ekranlarını koymak.

Yeni büyük özellik eklemek yerine bu dört doğrulama tamamlandığında oyuncu seçimi akışı yarışma teslimi için daha güvenilir olacaktır.
