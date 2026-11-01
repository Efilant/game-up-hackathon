# ŞEHRİN YARINI — GAME DESIGN & PLAYER FEEDBACK REVIEW

**Tarih:** 1 Kasım 2026  
**Kapsam:** Bölüm 1 / Yamaç Hastanesi, mevcut React + TypeScript web oyunu  
**Amaç:** Yeni bir teknoloji veya yeni görev zinciri eklemeden, oyuncunun kararlarını anlamasını, etkileşimlerin gerçek oyun durumuna bağlanmasını ve ilk bölümün oynanabilirlik kanıtını güçlendirmek.

## Karar özeti

Bu çalışma, Describe → Produce → Test → Decide döngüsüyle sınırlı bir gameplay-feedback pass olarak uygulandı. NPC konuşmaları anlık bırakıldı; yalnızca menfez incelemesi ve savunma inşası gibi sonuç doğuran saha işlemlerine basılı-tutma eylemi eklendi. Savunma kartları artık maliyet, etki alanı, sınır ve simülasyon sonrası gerçek yol ölçümünü gösteriyor. İlk kez oynayan oyuncu için kısa bağlamsal saha kılavuzu eklendi.

Tam tarayıcı koşusu tamamlandı: 54 senaryodan 50 PASS, 4 beklenen SKIP. Başarısız senaryo kalmadı; ölçülmemiş alanlar ayrıca belirtilmiştir.

## 1. Core gameplay loop audit

| Aşama | Oyuncu girdisi | Gerekli durum | Anlık geri bildirim | Durum geçişi | Başarısızlık | Başarı ölçütü |
|---|---|---|---|---|---|---|
| **Explore** | WASD/ok tuşları, mobil joystick | Oyun alanı açık, karakter spawn olmuş | Karakter hareketi, kamera, bölge etiketi, pusula yönü | Oyuncu hedef bölgeye yaklaşır | Engel/yanlış rota; görev ilerlemez | Hedef yarıçapına girilir |
| **Investigate** | Menfez yanında `E` basılı tut / mobil eylem düğmesine basılı tut | Görev 2, geçerli drenaj noktası | İlerleme çubuğu, yüzde, “E basılı tut”; erken bırakmada iptal toast’ı | Menfez raporu açılır, görev 3’e geçer | Erken bırakma veya yanlış noktada etkileşim | Kapasite raporu gerçekten tamamlanır |
| **Decide** | Savunma sahasına git, kartı oku, `E` basılı tut | Bütçe ve savunma sahası geçerli | Maliyet, neyi çözdüğü, etkili olduğu yer ve sınırı görünür | Seçilen savunma simülasyon durumuna eklenir | Bütçe yetersizliği veya yanlış savunma seçimi | Oyuncu seçiminin nedenini ve bedelini görebilir |
| **Intervene** | Savunma sahasında `E` basılı tut / mobil basılı tut | Savunma etkin değil, yeterli kredi var | Kurulum toast’ı, ses sinyali, kredi azalması, ölçüm öncesi/sonrası yol suyu | `activeDefenses` ve uzamsal simülasyon güncellenir | Yetersiz bütçe; etkinin sınırlı kalması | Savunma aktif olur ve gerçek simülasyon metriği güncellenir |
| **Observe** | Gözlem noktasında normal `E` | Görev 4, yağmur/fırtına akışı | Yağış/fırtına HUD’ı, su derinliği, alarm ve diyalog | Fırtına başlar; hazırlık durumuna göre görev 5 veya 6 | Kritik su seviyesi, hazırlıksız rota | Fırtına başlangıcı ve ilk su ölçümü raporlanır |
| **Evaluate** | Hastane yolu gözleminde normal `E` | Görev 6, savunma etkisi simüle edilmiş | “GEÇİLEBİLİR” veya eşik ve mevcut cm değeri | Görev 7’ye veya başarısızlık dalına geçiş | Su `30 cm` eşiğinin üzerinde kalır | Ambulans koridoru açık ve ölçüm eşik altında |
| **Reward** | Mira’ya dönüp normal `E` | Görev 7, bölüm sonucu hesaplanmış | Sonuç kartı, yıldızlar, rozetler, final sekansı, ödül kredisi | Bölüm tamamlanır; tekrar oynama mümkün | Sonuç koşulu sağlanmazsa 0 yıldız/failure | 0/1/2/3 yıldız sonucu koşullara göre gösterilir |

### Bulunan kafa karışıklıkları ve giderilenler

- Önceden menfez ve savunma kurulumları tek tuşla anında gerçekleşiyordu; işlem ile sonuç arasındaki bağ görünmüyordu. Artık yalnızca saha işlemlerinde kısa hold-to-interact var.
- Savunma seçiminin nerede işe yaradığı ve nerede yetersiz kaldığı oyuncuya açık değildi. Her savunma için kısa etki/maliyet/sınır kartı ve simülasyon sonrası gerçek yol ölçümü eklendi.
- İlk görevde hareket, etkileşim, pusula, fırtına riski ve yıldızların anlamı tek bir ağır tutorial paneline yüklenmeden kısa “İlk Saha Kılavuzu” ile bağlama yerleştirildi.
- NPC diyalogları bilerek basılı-tutmaya çevrilmedi; konuşma ritmi korunuyor.

## 2. Input / action / feedback matrix

| Eylem | Klavye | Mobil | Geri bildirim | Oyun durumuna etkisi |
|---|---|---|---|---|
| Hareket | WASD / oklar | Joystick sürükleme | Karakter animasyonu, konum, bölge ve pusula | Oyuncu konumu ve hedef mesafesi |
| NPC konuşması | Yakında `E` | Eylem düğmesine dokun | Diyalog paneli ve konuşma toast’ı | Görev adımı ilerleyebilir |
| Menfez inceleme | `E` basılı tut | Eylem düğmesine basılı tut | 900 ms progress bar; bırakınca iptal; tamamlayınca kapasite raporu | Görev 2 → 3 yalnızca meşru tamamlamada |
| Savunma kurma/kaldırma | Saha yanında `E` basılı tut | Eylem düğmesine basılı tut | Maliyet, etki, limit, kredi değişimi, ölçülen cm farkı | `activeDefenses`, bütçe ve simülasyon güncellenir |
| Fırtına gözlemi | Normal `E` | Dokun | Alarm, yağış HUD’ı, su seviyesi diyaloğu | Fırtına fazı ve görev 4 → 5/6 |
| Yol değerlendirmesi | Normal `E` | Dokun | Eşik karşılaştırması, geçilebilirlik ve sonraki hedef | Görev 6 → 7 veya başarısızlık |
| Erken bırakma | `keyup E` | pointerup / pointercancel | `ETKİLEŞİM İPTAL`, ilerleme sıfırlanır | İşlem tamamlanmaz; görev ilerlemez |

## 3. Uygulanan değişiklikler

1. **Seçici hold-to-interact:** Drenaj ve dört savunma sahası için 900 ms süre, gerçek ilerleme yüzdesi, iptal ve tamamlanma akışı. NPC etkileşimleri anlık kaldı.
2. **Mobil eşdeğer:** Pointer down/up/cancel olaylarıyla aynı işlem modeli; mobil düğmede “BASILI TUT” metni ve erişilebilir etiketler.
3. **Karar açıklığı:** Uyarı ağı, Sünger Kent, kıyı seti ve güvenli dönüşüm için kısa Türkçe açıklama kartları.
4. **Kanıta dayalı sonuç:** Kurulumdan sonra hastane yolu su derinliği önce/sonra ve güvenli eşik ile gösteriliyor; Sünger Kent için kapasite ve toparlanma mesajı veriliyor.
5. **İlk oyuncu kılavuzu:** Hareket, E kullanımı, pusula, fırtına tehlikesi, savunma kurma, kazanma ve yıldız/rozet anlamı bağlamsal olarak açıklanıyor.
6. **QA gözlemlenebilirliği:** Canvas üzerinde hold ilerlemesi, aktiflik, hava fazı, yol geçilebilirliği ve Sünger Kent durumu test edilebilir veri öznitelikleriyle görünür.
7. **Güncelleme sahipliği:** Mevcut render loop, hava/simülasyon zamanlaması, input ref’leri ve quest event akışı korunarak yalnızca etkileşim geri bildirimi çevresinde düzenlendi; stabil alt sistemler baştan yazılmadı.

## 4. Actual test process

Her önemli değişiklik için beklenen davranış tanımlandı, minimum değişiklik uygulandı, gerçek tarayıcıda normal oyun girdisiyle oynandı, gözlenen sonuç beklenenle karşılaştırıldı ve ardından regresyon koşusu alındı.

### Otomatik ve gerçek tarayıcı testleri

- `npm run lint` — PASS.
- `npm test -- --run` — 11 dosya, 50 test — PASS.
- `npm run build` — production build — PASS.
- `npx playwright test --project=desktop --project=mobile --project=desktop-motion --workers=1` — **50 PASS, 4 beklenen SKIP**, hata yok. SKIP’ler mobil joystick ve mobil pointer senaryolarının desktop/desktop-motion projelerinde çalıştırılmamasından kaynaklanıyor.
- `npx playwright test e2e/interaction-feedback.spec.ts --project=desktop --project=mobile --project=desktop-motion --workers=1` — 4 PASS, 2 beklenen SKIP.
- Bölüm tamamlama, erkek karakter, 0 yıldız, 2 yıldız, 3 yıldız, hava/sel, dört şehir bölgesi, marka varlıkları, mobil 360px ve görsel smoke senaryoları gerçek browser testleriyle çalıştırıldı.
- Kız karakter akışı mevcut oyun girişleriyle doğrulandı; erkek karakter akışı ayrı E2E senaryosuyla doğrulandı.
- Sel akışı, yağmur fazları, hastane yolunun su derinliği, Sünger Kent’in kapasite/operasyon durumu ve yol geçilebilirliği test edildi.
- Liman, Eski Merkez, Hastane/Yamaç ve Sanayi bölgeleri tek dünya üzerinde gerçek yürüyüş rotalarıyla test edildi.
- Save/migration ve quest state kapsamı mevcut unit testlerle kontrol edildi; ayrıca bu turda yeni bir reload/replay E2E testi eklenmedi.

### Kanıt ekran görüntüleri

Altı seçilmiş gerçek oyun ekranı [`gameplay-feedback-review/`](gameplay-feedback-review/) altında tutuluyor:

1. Klavye ile hold ilerlemesi ve iptal/tamamlanma akışı
2. Mobil hold etkileşimi
3. Sünger Kent sonrası toparlanma
4. RPG pusula navigasyonu ve görev hedefi
5. Dört bölge sürekliliği
6. Üç yıldız final sekansı

## 5. Kalan sorunlar / doğrulanmamış alanlar

- 90 saniyelik jüri videosu bu çalışma ortamında kaydedilmedi. Net çekim sırası [`VIDEO_SHOT_PLAN.md`](VIDEO_SHOT_PLAN.md) içinde hazır.
- Ayrı bir FPS/profiling ölçümü yapılmadı; production build ve gerçek browser E2E geçti, ancak performans sayısal benchmark olarak raporlanmıyor.
- Bölüm 2 ve 3 hâlâ kilitli; bu teslimin kapsamı Bölüm 1.
- Bazı eski/harici branding kaynakları için fallback görsel kullanımı korunuyor; bu gameplay feedback pass’inin konusu değildi.
- Desktop projelerinde mobil joystick testi ve mobil-only pointer testi beklenen şekilde SKIP edilir; bunlar başarısızlık sayılmaz.
- Tam E2E koşusunda başarısız senaryo kalmadı; final log 50 PASS / 4 beklenen SKIP olarak paketlendi.

## 6. Final submission recommendations

- Jüri videosunda sırasıyla: karakter seçimi → Mira görevi → pusula ile menfez → erken bırakma ve tekrar hold → savunma kartı/maliyet → yağmur ve sel → Sünger Kent sonrası ölçüm → yol doğrulama → üç yıldız finali gösterilmeli.
- İlk bölüm tesliminde mevcut görev zincirini ve geri bildirimleri koruyup yeni büyük görev eklememek daha güvenli.
- Final paketinde bu rapor, `release-qa/logs/`, seçilmiş ekran görüntüleri ve üretim ZIP’i birlikte paylaşılmalı.

## Final karar

**GO — Bölüm 1 gameplay-feedback pass’i yarışma teslimine hazır.**

Bu karar; gerçek tarayıcıda kız/erkek akışları, 0/1/2/3 yıldız senaryoları, yağmur-sel-Sünger Kent ölçümleri, dört bölge erişimi, mobil hold etkileşimi, 50/50 unit test, lint, production build ve 50 PASS / 4 beklenen SKIP tam E2E koşusuyla destekleniyor. Video kaydı, sayısal FPS benchmark’ı ve kilitli Bölüm 2/3 bu kararın kapsamı dışında ve teslim paketinde açıkça eksik olarak işaretlendi.
