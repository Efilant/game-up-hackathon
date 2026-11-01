# ŞEHRİN YARINI — Legacy Tactical Mode Removal Report

Tarih: 2026-11-01  
Kapsam: Oyuncuyu eski taktik ekran zincirinden çıkarıp tek, oynanabilir 2.5D RPG akışında tutmak.

## Karar

**Legacy taktik mod kaldırma kapsamı: GO.**

Oyuncu artık eski `BAŞLAT → intro → stres testi → plan → replay → sonuç` zincirine girmiyor. Ana giriş tek akışa indirildi:

`YENİ OYUN → karakter / oyun ritmi → ŞEHRE GİR → keşfedilebilir RPG dünyası`

Kayıtlı oyun için:

`DEVAM ET → doğrudan RPG dünyası`

Bu rapor, tam yarışma tesliminin bütün içerik ve cihaz matrisinin yeniden koşulduğu anlamına gelmez. Aşağıdaki eksik/atlanan kontroller ayrıca belirtilmiştir.

## Önceki sorun

`App.tsx` birden fazla ekran durumu taşıyordu: intro, stress, reversal, plan, replay ve results. Eski `GameMenu` içindeki `BAŞLAT` bu akışa giriyor, oyuncunun asıl dünyaya ulaşması için ayrı bir `ŞEHRE İN` yolunu takip etmesi gerekiyordu. Bu durum iki farklı oyun varmış hissi yaratıyor ve RPG oynanışını ana deneyim olmaktan çıkarıyordu.

## Uygulanan değişiklikler

- `src/App.tsx`
  - `Screen` yalnızca `menu | credits | world` olarak sadeleştirildi.
  - Eski intro/stres/reversal/plan/replay/results rotaları ve bunların state sahipliği kaldırıldı.
  - `YENİ OYUN` doğrudan karakter kurulum penceresini açıyor.
  - Kurulumdan sonra oyun doğrudan `ExplorableWorld` içinde başlıyor.
  - `DEVAM ET` kayıtlı RPG dünyasına doğrudan dönüyor.
- `src/Cinema.tsx`
  - Menüye `YENİ OYUN`, `DEVAM ET`, `BÖLÜMLER`, `ROZETLERİM`, `AYARLAR` ve `HAKKINDA` akışı bırakıldı.
  - Eski `Strategy`, `SecondStorm` ve `CityMemory` sunum bileşenleri kaldırıldı.
  - Yeni oyun kurulumunda kadın/erkek kahraman ve rahat/macera ritmi korunuyor.
- `src/ExplorableWorld.tsx`
  - Eski `TAKTİK HARİTA` HUD düğmesi kaldırıldı.
  - Oyuncunun çözüm keşfi, araştırması ve planlaması için mevcut `ŞEHİR PLANI` korunuyor.
  - `P` kısayolu ile plan günlüğü açılabiliyor.
- `e2e/helpers.ts` ve E2E senaryoları
  - Eski `ŞEHRE İN` girişleri yeni gerçek kullanıcı akışına taşındı.
  - Karakter seçimi ve macera modu gerçek tıklamalarla doğrulanıyor.
- `e2e/unified-rpg-entry.spec.ts`
  - Yeni menü, karakter kurulumu, ilk RPG doğuşu, görev HUD’ı, mobil görünüm ve kayıt devam akışı için kanıt ekranları üretir.

## Korunan ortak sistemler

Bu temizlik simülasyon modelini veya oynanabilir şehir akışını yeniden yazmadı. Aşağıdaki sistemler aynı RPG dünyasında kullanılmaya devam ediyor:

- WASD/ok tuşları ve mobil joystick hareketi
- pusula ve görev ilerlemesi
- dört çözümün keşfi/araştırılması
- Şehir Koruma Planı, bütçe ve plan onayı
- yağmur, su birikimi, hastane yolu ve Sünger Kent etkisi
- rozetler, kayıt/yükleme ve bölüm sonucu
- gerçek oyun içi kahraman seçimi

## Gerçek test kanıtı

### Geçen kontroller

- `npm run lint` — geçti.
- `npm run build` — geçti; production bundle üretildi.
- `npm test -- --run` — **13 test dosyası / 54 test geçti**.
- `e2e/game.spec.ts --project=desktop` — geçti.
  - `YENİ OYUN` menüde mevcut.
  - `ŞEHRE İN` ve `TAKTİK HARİTA` oyuncu arayüzünde yok.
  - Kurulumdan sonra gerçek RPG canvas’ı açılıyor.
- `e2e/unified-rpg-entry.spec.ts --project=desktop` — **3 geçti, 1 mobil varyant atlandı**.
  - yeni menü ve karakter kurulum kanıtı;
  - doğrudan RPG doğuşu;
  - kayıtlı oyuna taktik fallback olmadan devam.
- `e2e/mobile-360.spec.ts`, `e2e/visual-acceptance.spec.ts`, `e2e/player-movement.spec.ts --project=mobile` — **4 geçti, 1 desktop-only test atlandı**.
  - 360×740 yerleşim;
  - mobil HUD okunabilirliği;
  - klavye/joystick hareketi ve hedef alanına ulaşma.
- Kritik desktop gameplay paketi — **7 geçti, 1 mobil varyant atlandı**.
  - bölüm tamamlama;
  - 0/2/3 yıldız senaryoları;
  - klavye etkileşimi;
  - yağmur/sel akışı;
  - dört şehir bölgesi.

### Atlanan veya bu turda yeniden koşulmayanlar

- Desktop çalıştırmalarında mobile-only testler bilinçli olarak atlandı; bunların ayrı mobile çalıştırması yukarıda raporlandı.
- Dört çözümün tüm tekil/kombinasyonlu fırtına matrisi bu refactor turunda yeniden koşulmadı; önceki gerçek kanıtlar `PLAYER_CHOICE_OVERHAUL_REPORT.md` içinde kayıtlı.
- `artifacts/06_rpg_flood_simulation.png` ve `artifacts/07_chapter_result.png` önceki gerçek oyun yakalamalarının teslim isimleriyle kopyalanmış halidir; bu refactor’ın yeni çekimi değildir.

## Ekran kanıtları

- [01_new_main_menu.png](artifacts/01_new_main_menu.png)
- [02_character_selection.png](artifacts/02_character_selection.png)
- [03_rpg_first_spawn.png](artifacts/03_rpg_first_spawn.png)
- [04_rpg_quest.png](artifacts/04_rpg_quest.png)
- [06_rpg_flood_simulation.png](artifacts/06_rpg_flood_simulation.png)
- [07_chapter_result.png](artifacts/07_chapter_result.png)
- [08_mobile_main_menu.png](artifacts/08_mobile_main_menu.png)
- [09_mobile_rpg.png](artifacts/09_mobile_rpg.png)

## Sonuç

Oyuncu açısından eski taktik mod artık giriş noktası veya oynanabilir rota değil. Uygulama tek RPG dünyasına giriyor; planlama ve simülasyon, bu dünyanın içindeki `ŞEHİR PLANI` ile devam ediyor.

Bu kapsam için **GO**. Yarışma paketinin genel teslim kararı ise, özellikle çözüm bazlı fırtına matrisi ve final ekranlarının yeniden çekim gereksinimleri tamamlandıktan sonra verilmelidir.
