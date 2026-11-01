# Gerçek Oynanış Test Raporu

Test ortamı: yerel Vite, Chromium headless, 1440×900; ayrıca Playwright 390×844 mobil.

| Adım | Sonuç | Kanıt / gözlem |
|---|---|---|
| Ana menü | PASS | `screenshots/01_main_menu.png` |
| Kadın karakter seçimi | PASS | `screenshots/02_hero_selection_female.png` |
| Erkek karakter seçimi | PASS | `screenshots/03_hero_selection_male.png` |
| Dünya spawn ve kamera | PASS | `screenshots/04_town_spawn.png` |
| WASD / arrow / diagonal | PASS | `screenshots/05_female_hero_movement.png`, `06_male_hero_movement.png`; E2E hareket testleri |
| Mira’ya ulaşma | PASS | `08_mira_npc_interaction.png` |
| Mira diyaloğu ve görev 2 | PASS | `09_mira_dialogue.png` |
| Drenaj incelemesi | PASS | `10_drain_inspection_dialogue.png` |
| Aras diyaloğu | PASS | `11_aras_dialogue_open.png` |
| Sakin hava / overcast | PASS | `12_calm_weather.png`, görev 4 öncesi HUD |
| Yağmur başlangıcı | PASS | `13_rain_start_dialogue.png`, `LIGHT_RAIN` |
| Heavy/extreme rain | PASS | `14_heavy_rain.png`, `15_flooded_hospital_road.png` |
| Hastane yolunun kapanması | PASS | HUD `KAPALI (36.5 cm)` |
| Sünger Kent’e ulaşma | FAIL | Oyuncu flood collision alanından çıkamıyor; `17_defense_selection_unreached.png` |
| Savunma inşası | NOT VERIFIED | Normal akışta hedefe erişilemedi |
| Müdahale sonrası toparlanma | NOT VERIFIED | Savunma kurulamadı |
| Chapter 1 sonucu | NOT VERIFIED | Zafer ekranına gerçek akışla ulaşılmadı |
| Save/continue | PARTIAL | Kod ve temel save mantığı mevcut; kritik storm sonrası devam E2E’si yok |
| Mobil gameplay | PASS | `21_mobile_gameplay.png`, joystick movement E2E |
| Mobil dialogue | NOT VERIFIED | `22_mobile_dialogue_not_reached.png`; touch rotası hedef yarıçapına giremedi |

## Oynanış değerlendirmesi

İlk dört görev, oyuncunun gerçek dünyada yürümesini ve E etkileşimini gerektiriyor; bu bölüm web uygulaması hissinden daha oyunvari. Fırtına görsel olarak etkili ve hedef HUD anlaşılır. Ancak görev 5’te güvenli patika anlatılmasına rağmen fiziksel collision modeli oyuncuyu aynı taşkın çukurunda tutuyor. Bu, bölümün çözümünü imkânsızlaştırdığı için ilk bölüm deneyimini kritik biçimde kesiyor.

