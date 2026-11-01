# Test ve Build Sonuçları

## Unit / static

| Komut | Sonuç |
|---|---|
| `npm test -- --run` | 7 test dosyası, 36 test geçti |
| `npm run lint` | TypeScript noEmit geçti |
| `npm run build` | Vite production build geçti; 2040 module transform |

Loglar: `logs/unit-tests.log`, `logs/typecheck.log`, `logs/build.log`.

## Playwright

| Project | Sonuç |
|---|---|
| desktop | 7 passed, 1 skipped |
| desktop-motion | 7 passed, 1 skipped |
| mobile retry | 8 passed |
| mobile first isolated run | 3 passed, 5 failed — `ERR_CONNECTION_REFUSED` |

Skip edilen test, desktop project’te mobile joystick testidir; koşul gereği beklenen skip’tir. Mobil retry’de joystick dahil tüm 8 test geçti.

Yeni `weather-flood.spec.ts` desktop/mobile retry akışında ilk dört görevi, staged weather state’ini, >30 cm flood depth’i ve road closure’ı doğruluyor; savunma/chapter completion’ı özellikle doğrulamıyor çünkü gerçek oyun akışında P0 softlock bulundu.

## Console / network

- Yerel screenshot akışında page error veya console error kaydedilmedi.
- Canlı smoke test HTTP 200, title/menu bulundu, console/page error yok.
- Mobile ilk koşusundaki bağlantı hatası uygulama console hatası değil, Playwright web server erişim hatasıdır.

## Sınırlamalar

- 360×740 ayrı test edilmedi.
- Video kaydı üretilmedi; bu ortamda audit için video capture pipeline kurulmadı.
- Canlı bundle commit eşlemesi HTML’den çıkarılamadı.

