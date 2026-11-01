# GameUP Türkiye İç Değerlendirme

> Bu puanlar resmi jüri puanı değildir; yalnızca bu audit kanıtlarına dayalı iç değerlendirmedir.

| Kriter | Puan | Kanıt | Güçlü taraf | Eksik / öneri |
|---|---:|---|---|---|
| Odak Tema | 8/10 | Gerçek storm/flood görev akışı | İklim riski oynanış state’ine bağlanmış | Müdahale sonucu tamamlanıp gösterilmeli |
| Takım / Motivasyon | N/A | Repo kanıtı yok | — | Ekip hikâyesi ve motivasyon materyali ayrıca hazırlanmalı |
| Yaratıcılık | 7/10 | İklim + pixel city + defense sim | Eğitimsel tema oyun göreviyle birleşiyor | Cause-effect daha görünür olmalı |
| Özgünlük | 7/10 | Sünger Kent ve hastane erişimi | Yerel/insan etkisi odaklı hedef | Savunma sonuçları görülmeden ayrışma sınırlı |
| Zaman Yönetimi | N/A | Zaman çizelgesi yok | — | Hackathon kararları ve scope kanıtı yok |
| Sunum | 6/10 | HUD ve diyaloglar | Kısa demo için net görev zinciri | Softlock ve UI yoğunluğu canlı sunum riski |
| Etkili İletişim | 7/10 | Mira/Aras/EKO metinleri | Problem ve hedef açıklanıyor | Metinler kısaltılmalı; değerler tutarlı olmalı |
| Oyun Tasarımı | 5/10 | İlk 4 görev gerçek etkileşimli | Pusula ve görev yapısı anlaşılır | P0 softlock, bölüm sonucu erişilemiyor |
| Oynanabilirlik | 5/10 | Hareket ve ilk görevler geçti | Desktop/mobile temel input çalışıyor | Tam bölüm tamamlanamadı |
| Teknik İşlevsellik | 7/10 | 36 unit, build, desktop/mobile E2E | Deterministic sim, test altyapısı | Save/chapter/recovery ve server lifecycle kapsamı eksik |

## Rekabetçi analiz

- Ayırt edici yön: iklim etkisini soyut puan yerine hastane erişimi ve şehir altyapısı üzerinden göstermeye çalışması.
- En güçlü mekanik: görev pusulası + zamanla ilerleyen lokal taşkın state’i.
- En zayıf deneyim: oyuncunun storm sonrası çözüm alanına fiziksel erişememesi.
- Web uygulaması mı oyun mu?: İlk dört görevde gerçek hareket/collision/interaction olduğu için oyun hissi var; softlock sonrası bu his kırılıyor.
- İlk 30 saniyede etkileyici olan: güçlü başlık/tema, pixel city, karakter seçimi ve dünya HUD’ı.
- Jürinin ilgisini kaybettirebilecek nokta: demo yapan kişi bölüm 5’te ilerleyemezse savunma ve sonuç mekanikleri gösterilemiyor.
- Sunum öncesi zorunlu: P0 softlock, state değer tutarsızlığı, kısa ve güvenilir chapter completion demo.

