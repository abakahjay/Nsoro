# Nsoro

**Nsoro** (Twi *nsoromma*, "star") is a photo and video social app: posts you can star,
24-hour Moments, direct messages with voice notes, and voice and video calls.

- Web: https://nsoro-app.onrender.com
- Install: open `/download` on the site (Android APK, Windows installer, or add to the Home Screen on iPhone/iPad/Mac)

## Tech

React 18 + Vite, Chakra UI, Zustand. The API, real-time messaging and call signaling come
from the separate FullBackendd server (`VITE_API_URL`).

## Develop

```bash
npm install
npm run dev     # http://localhost:7005
npm run build
node scripts/generate-icons.mjs   # regenerate every app icon and logo (needs Chrome)
```

The Windows app lives in `desktop/` (`npm install && npm run dist`).
