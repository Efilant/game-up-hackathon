# Şehrin Yarını asset manifesti

## Uygulamada kullanılan kullanıcı görselleri

Bu dosyalar `/Users/elif/Downloads/set` klasöründen kopyalandı ve uygulamada `public/assets/achievements/` altında kullanılıyor:

- `Uyum Ustası.jpeg` → `uyum-ustasi.jpeg`
- `Meraklı Kaşif.jpeg` → `merakli-kasif.jpeg`
- `Hastane Kahramanı.jpeg` → `hastane-kahramani.jpeg`
- `Su Koruyucusu.jpeg` → `su-koruyucusu.jpeg`
- `Toplum Dostu.jpeg` → `toplum-dostu.jpeg`
- `Üç Yıldız Efsanesi.jpeg` → `uc-yildiz-efsanesi.jpeg`

Bu görseller kullanıcı tarafından sağlandı; özgün lisans/provenans bilgisi teslim edilen klasörde bulunmadığı için dağıtımdan önce hak sahipliği doğrulanmalıdır.

## Yerel özgün SVG’ler

Kullanıcı tarafından sağlanan ana logo artık PNG olarak kullanılıyor. `İlk Adım` rozeti, `Şehir Kaşifi` rozeti, yıldızlar, kilit ikonu ve bölüm kartı illüstrasyonları kaynak klasörde ayrı dosya olarak bulunmadığı için aşağıdaki yardımcı dosyalar proje içinde özgün, basit pixel-art SVG olarak oluşturuldu:

- `public/assets/branding/sehrin-yarini-logo.png` — kullanıcı tarafından sağlanan “Şehrin Yarını — Doğaya Dönüş” logosu.
- `public/assets/branding/sehrin-yarini-mark.svg`
- `public/assets/branding/sehrin-yarini-favicon.svg`
- `public/assets/achievements/ilk-adim.svg`
- `public/assets/achievements/sehir-kasifi.svg`
- `public/assets/ui/star-gold.svg`, `star-empty.svg`, `lock.svg`
- `public/assets/chapters/*.svg`

Merkezi manifest: `src/branding.ts` içindeki `BRAND_ASSETS`.
