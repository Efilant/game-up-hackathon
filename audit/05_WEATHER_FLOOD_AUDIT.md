# Hava Durumu ve Taşkın Audit’i

## Gerçek gözlem tablosu

| Faz | Ekranda görülen | Ölçüm / state kanıtı |
|---|---|---|
| CLEAR | Yağmur yok, yol açık | `12_calm_weather.png`, canvas `data-weather-phase=CLEAR`, depth `0.0` |
| OVERCAST | Koyu atmosfer, storm öncesi geçiş | Aras sonrası gözlem noktasında `OVERCAST` görüldü |
| LIGHT_RAIN | Yağmur çizgileri ve hafif su | `13_rain_start_dialogue.png`, `LIGHT_RAIN`, depth `7.3` |
| HEAVY_RAIN | Daha yoğun yağmur, lokal su | `14_heavy_rain.png`, `HEAVY_RAIN`, depth `36.5` |
| EXTREME_STORM | Süper hücre HUD, yoğun yağmur, kapalı yol | `15_flooded_hospital_road.png`, `EXTREME_STORM`, `36.5 cm`, road `KAPALI` |
| RECOVERY | Kodda tanımlı | Normal gameplay’de savunma kurulamadığı için gözlemlenmedi |

## Çalışan taraf

- Storm, görev 4 gözlem etkileşimiyle tetikleniyor.
- Hava fazları zamanla deterministic olarak ilerliyor.
- Flood simülasyonu sabit `0.15 s` adımla güncelleniyor.
- Hastane yoluna lokal polygon/road water görünümü çiziliyor.
- HUD, canvas data attribute’larıyla faz/depth/passability durumunu dışarı veriyor.

## Kritik kusur

`movePlayer()` → `canPlayerOccupy()` → `pointInFloodedRoadZone()` zinciri, yol kritik derinliğe ulaştığında oyuncunun bulunduğu gözlem alanından çıkmasını da engelliyor. Görev metni kuzey patikasını öneriyor; fakat oyuncu zaten taşkın alanında spawn/observation interaction noktasında olduğu için önerilen patikaya yürüyemiyor.

Etkisi:

1. Görev 5 hedefi 23 m uzakta görünür.
2. Compass doğru hedefi gösterir.
3. Oyuncu WASD/joystick girdisi verir, fakat collision nedeniyle konum ilerlemez.
4. E tekrar taşkın gözlem diyaloğunu açabilir; Sünger Kent savunması kurulamaz.
5. Recovery ve Chapter 1 sonucu normal oynanışla erişilemez.

## Değer uyuşmazlığı

`15_flooded_hospital_road.png` aynı anda:

- HUD: `KAPALI (36.5 cm)`
- Storm dialog: `su derinliği 38.5 cm`
- Quest narrative: `38.5 cm’ye ulaştı`

Bu üç kaynaktan biri canonical olmalı; öneri, dialog/narrative sabit metinlerini `spatialState.hospitalRoadWaterDepth` üzerinden üretmektir.

## Neden / katman ayrımı

- Trigger: VERIFIED.
- State transition: VERIFIED.
- Simulation advance: VERIFIED.
- Rendering: VERIFIED.
- Player escape/traversability: FAILED.
- Intervention/recovery: NOT VERIFIED because the escape defect prevents normal progression.

