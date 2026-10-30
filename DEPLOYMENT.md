# Yerel çalıştırma ve dağıtım

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Üretim önizlemesi: http://127.0.0.1:4173/. Geliştirme: npm run dev, http://localhost:5173/. Terminal sunucusu açık kalmalıdır.

[dist/](dist/) üretim çıktısıdır. Çift tıklama yerine HTTP üzerinden sunulmalıdır. Netlify, Cloudflare Pages veya benzeri statik hostta build komutu npm run build; yayın klasörü dist. Backend ve API anahtarı yoktur. Bu teslimde internete dağıtım yapılmadı.

Varlık yolları /assets/... olduğundan alan adı köküne dağıtım hazırdır. Alt dizinli GitHub Pages için önce Vite base ve varlık yolları birlikte uyarlanmalıdır.

E2E: npx playwright install chromium ve npm run test:e2e. Testler geçici üretim sunucusunu başlatır. Ses ilk etkileşimden sonra açılır. Karakterler yereldir; harici müzik veya Google Fonts isteği yoktur. Kullanıcının sağladığı karakter görsellerinin kamusal kullanım haklarını yayın öncesi varlık sahibi doğrulamalıdır.
