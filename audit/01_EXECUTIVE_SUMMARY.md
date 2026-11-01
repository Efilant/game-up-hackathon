# Yönetici Özeti

## Durum sınıfları

### VERIFIED

- Oyun yerel olarak açılıyor; Vite build başarılı.
- Kadın ve erkek kahraman seçimi, sprite/HUD değişimi ve temel hareket çalışıyor.
- WASD, ok tuşları, key release ve mobil joystick testleri mevcut Playwright senaryolarında doğrulandı.
- Mira → drenaj → Aras → taşkın gözlemi görev zincirinin ilk dört adımı gerçek girdilerle ilerliyor.
- Compass yönü, mesafe ve hedef etiketi güncelleniyor; altın rota çizgisi görünmüyor.
- Clear/overcast/light rain/heavy rain/extreme storm fazları ve lokal hastane yolu taşkını gerçek tarayıcıda görüldü.
- Unit test, typecheck ve production build başarılı.

### PARTIALLY VERIFIED

- Vatandaşlar gerçek ekranda görünüyor ve yağmur/fırtına konuşma balonları üretebiliyor; ancak bağımsız vatandaş davranış matrisi ve uzun süreli kaçış yolları tam doğrulanmadı.
- Save/load kodu mevcut; fırtına sonrası kritik devam senaryosu ve savunma sonrası persistence tamamlanamadığı için tam oyun kaydı doğrulanmadı.
- Canlı deploy ana menü smoke testinden geçti; canlı bundle’ın yerel commit ile aynı olduğu kanıtlanmadı.

### FAILED / NOT VERIFIED

- Fırtına sonrasında oyuncu flooded-road collision alanından çıkamıyor; Sünger Kent’e normal kontrolle ulaşılamıyor.
- Savunma inşası, müdahale sonrası toparlanma ve Chapter 1 zafer ekranı normal akışla doğrulanamadı.
- Mobile dialogue screenshot normal touch akışıyla üretilemedi.
- Reduced-motion, 360×740 ve tüm erişilebilirlik kriterleri ayrı ayrı doğrulanmadı.

## İlk beş öncelik

1. Oyuncunun taşkın alanından güvenli patikaya çıkabilmesini sağla; görev 5 softlock’unu kaldır.
2. Simülasyon, HUD ve diyalogdaki su derinliği kaynaklarını tek state’ten okut; 36,5/38,5 cm farkını gider.
3. Savunma kurulunca su, yol durumu ve hava fazının görünür biçimde değiştiğini göster; ardından bölüm sonunu gerçek girdilerle test et.
4. Desktop/mobile Playwright web server yaşam döngüsünü kararlı hale getir; ilk mobile koşusundaki `ERR_CONNECTION_REFUSED` tekrarını önle.
5. 360×740, mobile dialogue, save/load ve canlı deploy smoke testlerini sürekli CI senaryolarına ekle.

