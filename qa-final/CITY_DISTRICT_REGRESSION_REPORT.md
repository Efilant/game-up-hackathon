# CITY DISTRICT REGRESSION REPORT

## İnceleme sonucu

Orijinal Git geçmişinde (`b6014ac`) şehir dört bölgeyi ayrı bir oynanabilir dünya olarak değil, `CityScene.tsx` içindeki taktik/simülasyon SVG haritası olarak gösteriyordu. `5bbf36c` ile eklenen RPG dönüşümünde `ExplorableWorld.tsx` ve `pixelWorldRenderer.ts` yeni hastane görev dünyasını oluşturdu; eski `CityScene` dört bölgeyi korudu ancak dünya renderer'ına taşımadı. Bu nedenle isimler ve strateji haritası görünürken gerçek oyuncu alanı hastane-merkez koridoruna daralmıştı. Eski sürümü geri almak yerine, mevcut RPG dünyasına güvenli bir katman eklendi.

## Geri yüklenen yapı

| Bölge | Dünya alanı | Görsel kimlik | Gerçek hareket testi |
|---|---|---|---|
| Kıyı Mahallesi | `x:0–800, y:820–1500` | Deniz, dalga, rıhtım, iskele, konteyner/ambar, tekne | PASS |
| Eski Merkez | `x:0–800, y:0–820` | Kaldırım meydanı, tarihî çarşı, evler, park dokusu, saat kulesi | PASS |
| Yamaç Evleri | `x:800–2200, y:0–820` | Teras yeşilliği, konut şeridi, hastane, drenaj koridoru | PASS |
| Sanayi Koridoru | `x:800–2200, y:820–1500` | Fabrika blokları, servis avluları, boru hattı, trafo/enerji işaretleri | PASS |

## Değiştirilen dosyalar

- `src/cityDistricts.ts`: ortak dünya koordinatları, sınırlar, landmark ve palet tanımları.
- `src/pixelWorldRenderer.ts`: dört bölgenin prosedürel pixel-art arka planları ve bölge işaretleri.
- `src/ExplorableWorld.tsx`: mevcut bölge HUD etiketi, normal yürüyüşle keşif kaydı, save/load ve `ŞEHİR KAŞİFİ` rozeti.
- `src/ambientCitizens.ts`: Kıyı ve Sanayi bölgelerine dört ambient vatandaş.
- `src/chapterProgress.ts`: dört bölge ziyaretine bağlı `ŞEHİR KAŞİFİ` rozeti.
- `src/cinema.css`: mevcut bölge HUD görünümü.
- `e2e/city-districts.spec.ts`: gerçek klavye yürüyüşü ve ekran görüntüsü kanıtı.
- `src/cityDistricts.test.ts`: kaynak koordinat ve bölge kapsamı testleri.

## Gerçek oynanış kanıtı

`city-districts.spec.ts` testinde oyuncu tek canvas/world yüzeyinde şu rotayı yürüdü:

`Eski Merkez → Yamaç Evleri → Kıyı Mahallesi → Sanayi Koridoru`

Her geçişte `data-current-district`, HUD konumu ve keşif kaydı kontrol edildi. Dört bölge `localStorage` içindeki görev kaydına yazıldı ve `city_explorer` rozeti açıldı. Harita açmak veya teleport kullanmak testi geçirmedi.

Kanıtlar:

- `screenshots/district_old_town.png`
- `screenshots/district_hillside_hospital.png`
- `screenshots/district_coastal_harbor.png`
- `screenshots/district_industrial.png`
- `screenshots/district_transitions.png`
- `screenshots/district_compass_navigation.png`

## Hastane bölümü regresyonu

Hastane görevi korunmuştur. Kadın ve erkek kahraman testleri, Mira → menfez → Aras → fırtına → savunma → hastane yolu → sonuç akışını gerçek tarayıcı girdileriyle geçti. Flood simülasyonu, yıldızlar, rozetler ve mobil joystick testleri de geçti.

## Kalan sınırlamalar

- Kıyı, Merkez ve Sanayi bölgeleri şu an keşif/ambient alanıdır; tamamlanmış ayrı görev bölümleri değildir.
- Yeni bölgelerdeki landmark etkileşimleri bağlamsal keşif seviyesindedir; gelecek iklim görevleri için `Yeni görevler yakında!` içerikleri ayrıca eklenebilir.
- Kamera mevcut dünya sınırlarında çalışır; bölge geçişleri scene swap veya teleport değildir.
