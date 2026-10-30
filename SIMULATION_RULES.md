# Simülasyon kuralları

Mevcut [motor](src/simulation.ts) korunmuştur. Bilimsel olarak doğrulanmış afet tahmini değildir. Hasar, güvenlik ve dayanıklılık soyut oyun puanlarıdır; kişi sayısı, para kaybı veya gerçek su yüksekliği değildir.

Sabit tehlike: 88 mm/saat yağış. Başlangıç bölge hasarı = 88 × maruziyet × kırılganlık. Başlangıç güvenliği = 100 − başlangıç hasarı × 0.52.

| Savunma | Maliyet | Hasar | Güvenlik |
| --- | ---: | --- | --- |
| Erken Uyarı Ağı | 18 | Değişmez | +22 |
| Sünger Kent | 28 | Tüm bölgeler ×0.82 | Değişmez |
| Kıyı Seti | 42 | Kıyı ×0.48; diğerleri ×0.96 | Değişmez |
| Güvenli Dönüşüm | 36 | Tüm bölgeler ×0.90 | +12 |

Hasar çarpanları birlikte uygulanır; sonuç bölge bazında yuvarlanır. Güvenlik 0–100 arasıdır. Hasar 100'ü aşabilir. Taşkın işareti hasar ≥58 koşuludur. Şehir metrikleri dört bölgenin yuvarlanmış aritmetik ortalamasıdır. Dayanıklılık = max(0, round(100 − hasar×0.62 + güvenlik×0.28)).

Bütçe 100 kredidir. Arayüz tekrarlı satın almayı ve bütçe aşımını engeller. Seçim sırası sonucu değiştirmez. Güvenlik, savunma sonrası hasardan tekrar hesaplanmaz: erken uyarı insan güvenliğini iyileştirir, binayı kurtarmaz. Sünger Kent için eski veri açıklamasındaki “+4” hesaplamada uygulanmıyordu; yeni kart gerçek hesaplamayı gösterir. Motor değiştirilmedi.

Her iki koşuda yağış, başlangıç bölgeleri, maruziyet ve kırılganlık aynıdır. SVG su alanı hasara bağlıdır, hidrodinamik simülasyon değildir. Motorda bulunmayan yan etki cezaları eklenmedi; mevcut sınırlılıklar kartlarda açıklanır.

Örnek: uyarı + sünger + set = 88 kredi. Ortalama hasar 96→64, güvenlik 50→72, dayanıklılık 54→80; kıyı hasarı 112→44. Risk tamamen ortadan kalkmaz.
