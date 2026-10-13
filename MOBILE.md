# Using 2A Prints Accounting on phones and tablets

The app is an installable web app (PWA) — same data, same login, works on Android and iPhone/iPad.

## Hosting it (once)
Pick ONE:
- **GitHub Pages (recommended, automatic):** repo Settings > Pages > Source = "GitHub Actions".
  `.github/workflows/deploy-web.yml` then publishes the app on every `vX.Y.Z` tag, at
  `https://kingzizou.github.io/2A-Accounting-releases/`.
- **Any web host / Netlify / Cloudflare Pages:** upload the contents of `2A-Prints-Accounting-web-1.0.12.zip`
  (index.html + manifest.webmanifest + sw.js + icons/) to the site root. It must be served over **https**.

## Installing on a phone
- **Android (Chrome):** open the link > menu (⋮) > **Install app** / Add to Home screen.
- **iPhone / iPad (Safari):** open the link > Share > **Add to Home Screen**.

It then opens full-screen with its own icon. New versions arrive automatically the next time it's opened online.

## Notes
- Needs an internet connection for data (everything lives in Supabase); the app shell itself opens offline.
- Print / Save as PDF on a phone uses the phone's own print sheet — choose **Save as PDF** there.
- Store apps (Google Play / App Store) are not built from this project.
