# Görsel ve UX İncelemesi

## Güçlü taraflar

- Pixel-art tilemap, binalar ve karakter palette’leri tutarlı bir renk dili oluşturuyor.
- HUD’da quest tracker, compass, hava durumu ve hastane yolu status’ü birlikte okunabiliyor.
- Yağmur ekran koordinatında çizildiği için kamera hareketinden bağımsız kalıyor.
- Taşkın ekranı geniş dünya overlay’i yerine hastane yolu çevresinde lokal kalıyor.
- Türkçe görev sıralaması ve hedef etiketleri görünür.

## Sorunlar

| Sorun | Etki | Kanıt / öneri |
|---|---|---|
| HUD, quest tracker, compass ve diyalog aynı anda büyük alan kaplıyor | Oyun alanı ve hedef erişimi daralıyor | `15_flooded_hospital_road.png`; kritik anda UI yoğunluğu yüksek. HUD katmanlarını bağlama göre sadeleştir. |
| Diğer NPC konuşma balonları ekranda kısmen kesilebiliyor | Gürültü ve okunabilirlik sorunu | `15_flooded_hospital_road.png` sol/orta balonlar; bubble culling veya kamera içi clamp ekle. |
| Fırtına diyalogu 38,5 cm derken HUD 36,5 cm gösteriyor | Oyuncu güveni ve simülasyon anlaşılabilirliği bozuluyor | `15_flooded_hospital_road.png`; tek state değerini tüm metinlere bağla. |
| Savunma hedefi görünür ama fiziksel olarak ulaşılamıyor | UX vaat ile kontrol davranışı çelişiyor | `17_defense_selection_unreached.png`; güvenli çıkış koridoru veya flood collision istisnası. |
| Bazı ekranlarda aynı anda çok sayıda teknik etiket var | İlk 30 saniyede okunabilirlik düşüyor | Hava, yol, radar ve quest tracker için önceliklendirilmiş responsive layout. |

## Placeholder / polish değerlendirmesi

Tamamen boş bir prototype değil; binalar, karakter portreleri, canvas NPC’leri ve çevre detayları mevcut. Buna rağmen bazı etkileşim alanları ve çevresel sonuçlar geometrik/oyunsal prototip hissi veriyor. En büyük görsel kalite sorunu asset eksikliği değil, görsel durumun gameplay sonucu ile uyuşmaması: yol kapalı, fakat oyuncu çözüm alanına geçemiyor.

## Erişilebilirlik

- Audio mute kontrolü ve buton aria-label’ları mevcut.
- Klavye hareketi doğrulandı.
- 390×844 mobile E2E retry geçti.
- 360×740, reduced-motion davranışının tüm ekranları, renk kontrast ölçümü, screen reader akışı ve mobile dialogue ayrı doğrulanmadı.

