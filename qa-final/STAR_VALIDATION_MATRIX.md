# Yıldız doğrulama matrisi

| Sonuç | Gerçek strateji | Bakiye | Flood kanıtı | Durum |
|---:|---|---:|---|---|
| 0 | Fırtına başladı, savunma kurulmadı | 100 Kr | Pik >30 cm; simülasyon sonunda kayıp ekranı | PASS |
| 1 | Fırtına sırasında Sünger Kent kuruldu | 72 Kr | Geçici kapanma/başarılı kurtarma; sonuç 1 yıldız | PASS |
| 2 | Fırtına öncesi Sünger Kent + Erken Uyarı + Kıyı Seti | 12 Kr | Yol açık kaldı, verimsiz bütçe nedeniyle 2 yıldız | PASS |
| 3 | Fırtına öncesi yalnız Sünger Kent | 72 Kr | Pik 26.5 cm, kapanma yok | PASS |

Her senaryoda bölüm sonuç ekranı ve `.result-stars .earned` sayısı assertion ile kontrol edildi.
