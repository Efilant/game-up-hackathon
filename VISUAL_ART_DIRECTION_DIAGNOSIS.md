# ŞEHRİN YARINI — Görsel Art Direction Teşhisi

İnceleme tarihi: 2026-11-01  
İncelenen ana akış: `ExplorableWorld` + `pixelWorldRenderer`

## Öncelikli sorunlar

- Harita 2200×1500 koordinatında geniş, tek renkli çim alanları kullanıyor; dekor yoğunluğu çoğunlukla birkaç bina ve ağaçtan oluşuyor.
- Ana yollar 100 px’lik düz bantlar olarak çizildiği için şehir dokusunu bölüyor ve “plan/şema” hissi veriyor.
- Eski Merkez, yamaç, hastane, sanayi ve liman arasında zemin geçişleri keskin dikdörtgenler; kaldırım, bordür ve ara sokak bağlantıları zayıf.
- Hastane ve araştırma istasyonu okunabilir olsa da çevrelerinde işlevsel küçük ölçekli prop kümeleri az.
- Evler ve fabrika blokları belirgin silüetlere sahip, fakat cephe varyasyonu, çatı kenarı, pencere derinliği ve ön/arka plan katmanları sınırlı.
- Oyuncu sprite’ı küçük ve koyu zeminlerde kolayca kaybolabiliyor; yer gölgesi var ama seçilebilirlik konturu yeterince güçlü değil.
- HUD; görev kartı, pusula, durum grubu ve minimap ile ekranın üst katmanlarını yoğunlaştırıyor. Bilgi korunurken panellerin daha şeffaf ve kısa olması gerekiyor.
- Yağmur ve sel state’i mevcut, ancak sahneye “önce/sonra” farkını veren yol kenarı su çizgileri, küçük yansımalar, sığınan vatandaşlar ve sıcak ışık kontrastı artırılabilir.

## Tasarım yönü

Bu turda görev, simülasyon ve hareket sistemleri korunur. Görsel değişiklikler aynı koordinatları ve etkileşim noktalarını kullanarak; sıcak toprak/teal su/amber ışık paleti, mahalle bazlı dekor kümeleri, daha dar algılanan yollar, zemin dokusu, küçük şehir props’ları, oyuncu konturu ve daha hafif HUD katmanları üzerinden yapılır.
