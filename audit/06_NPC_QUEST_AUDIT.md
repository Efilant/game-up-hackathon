# NPC ve Quest Audit’i

## Quest sıralaması

Kod ve HUD şu sırayı kullanıyor:

1. Mira’yı Bul
2. Menfezi İncele
3. Aras ile Konuş
4. Fırtınayı Gözlemle
5. Savunma İnşa Et
6. Sonucu Kontrol Et
7. Mira’ya Geri Dön

Bu sıra gerçek akışta ilk dört adım için doğrulandı. Hedefler ve compass etiketleri değişiyor; altın yol/footprint bulunmadı.

## NPC gözlemi

- Mira ve Aras gerçek canvas NPC’leri olarak render ediliyor.
- Mira görevi başlatıyor; Aras risk planı ve savunma yönlendirmesi veriyor.
- Ambient citizens canvas’ta spawn oluyor ve hareket ediyor.
- Hava/flood speech pool’ları mevcut; audit ekranlarında vatandaş balonları görüldü.
- Citizens `pointInFloodedRoadZone` üzerinden derin sudan kaçınmaya çalışıyor.

## Tasarım değerlendirmesi

Mira ve Aras’ın diyalogları görev yönlendirmesi açısından işlevsel. EKO, teknik durumu ve hedefi tekrar ediyor; ancak acil durumda metin uzunluğu HUD ve modal yoğunluğunu artırıyor. Savunma sonucu görülmediği için oyuncunun vatandaş davranışı ve altyapı değişimi üzerinden nedenselliği anlayıp anlamadığı doğrulanamadı.

## Riskler

- `ambientCitizens.ts` içinde konuşma seçimi için `Math.random()` kullanılıyor; aynı replay’de aynı konuşma garantisi yok.
- Ambient citizens oyuncunun kritik navigasyon yolunda görsel kalabalık yaratabiliyor.
- Citizen collision/evacuation davranışı uzun süreli extreme storm altında ayrı bir acceptance test ile doğrulanmalı.

