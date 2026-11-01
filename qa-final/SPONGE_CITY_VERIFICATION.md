# Sünger Kent doğrulaması

Şehir simülasyonu eğitim amaçlı, deterministik ve sadeleştirilmiş bir su bütçesi modelidir; mühendislik CFD tahmini değildir.

`runCompleteSpatialSimulation([])` ve `runCompleteSpatialSimulation(['sünger'])` aynı yağış girdisi ve başlangıç koşullarıyla çalıştırıldı.

| Ölçüm | Savunmasız | Sünger Kent | Fark |
|---|---:|---:|---:|
| Hastane yolu pik derinliği | 34.8 cm | 26.5 cm | −8.3 cm |
| 30 cm üzeri süre | 1.80 sn | 0 sn | −1.80 sn |
| Final yol derinliği | 2.9 cm | 0 cm | −2.9 cm |
| Tutulan su | 0 cm | 13.19 cm | +13.19 cm |
| Tutma alanı pik depolaması | 0 cm | 0.54 cm | finite capacity |

Sonuç: Sünger Kent bağlı yamaç havzasından sınırlı miktarda su tutar ve hastane koridorundaki geçirgen omuzları devreye alır. Hazırlık önceden yapılırsa yol kritik eşiği aşmaz; fırtına sırasında geç kurulursa üç adımlık devreye alma gecikmesi nedeniyle geçici kapanma hâlâ mümkündür.

Kütle bütçesi kontrolü: toplam yağış girdisi savunmasız ve müdahaleli koşulda aynıdır (`1884.02 cm`). Savunmasız koşulda infiltrasyon/drenaj/çıkış toplamı `1882.17 cm`; Sünger Kent koşulunda `1883.74 cm`. Yuvarlama ve hücre içi saklama nedeniyle küçük fark, simülasyonun su derinliği yuvarlamasından kaynaklanır.

Tarayıcı kanıtları `artifacts/` altında oluşturuldu:

- `sponge-before-construction.png`
- `sponge-after-construction.png`
- `sponge-recovery.png`
- `sponge-chapter-result.png`
