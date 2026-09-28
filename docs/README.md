# Offer Calculator (com.offerpk.calculator)

Offline-first **scientific calculator** PWA + Capacitor scaffold.  
Vanilla HTML/CSS/JS — **zero build** for the web app itself. Core calc is 100% free offline.

**Version:** `1.0.0-complete`  
**Package id:** `com.offerpk.calculator`  
**App name:** Offer Calculator

## Features

| Area | Detail |
|------|--------|
| Basic | + − × ÷, %, ±, C/CE, backspace, decimal |
| Expression | Formula + result, live preview, order of operations |
| Memory | MC MR M+ M− MS |
| History | `localStorage` capped at 50; tap to reuse; clear |
| Scientific | sin cos tan asin acos atan, log ln, √ x² x^y, π e, ( ), deg/rad, factorial, 1/x |
| Clipboard | Copy result / paste into expression |
| Themes | Light / Dark / OLED + accents (local); rewarded stub unlocks premium + remove banner |
| Feedback | Optional haptic + key sound |
| Layout | Large buttons; portrait + landscape CSS |
| Errors | ÷0 / overflow → friendly message, no crash |
| A11y | aria-labels on keys; scalable text; TalkBack-friendly |
| Wake Lock | Keep-screen-on toggle (Wake Lock API stub OK) |

## Screens

1. **Basic** — standard keypad  
2. **Scientific** — trig / logs / powers  
3. **History** — secondary (banner stub allowed)  
4. **Themes** — secondary (banner stub + rewarded unlock)  
5. **Settings** — angle, sound, haptic, keep-on, privacy link  

**Monetization rules:** Banner **only** on History/Themes — **never** over keypad / never blocks calculate. Prefer one-time remove-ads+themes (rewarded stub) over coin economy. Interstitial rare (e.g. after clearing long history).

## Quick start

```bash
cd /workspace/apps/calculator-app
npm start
# → http://localhost:4180
# or: npm run start:py
# or: npx --yes serve -l 4180 .
```

`file://` works for calc; PWA/service worker needs `http://`.

```bash
npm test          # smoke engine checks
npm run build:web # → www/ + docs/ + dist/calculator-web-windows.zip
```

## Packages

| Artifact | Path |
|----------|------|
| Capacitor `webDir` | `www/` |
| GitHub Pages static | `docs/` (includes `privacy.html`) |
| Windows zip | `dist/calculator-web-windows.zip` → extract → `PLAY-WINDOWS.bat` |
| Privacy | `privacy.html` (+ copy in `docs/`) |

## Capacitor Android path

```bash
npm install
npm run build:web
npx cap add android          # once
npm run cap:sync
npx cap open android         # Android Studio
```

### Play checklist notes (owner signs AAB)

- **Owner signs the AAB** — never commit a keystore, `*.jks`, `key.properties`, or upload keys.
- Target a **recent Android API** (compile/target SDK current Play requirement; Capacitor 6 defaults are fine as a starting point — bump in Android Studio before release).
- `appId` is already `com.offerpk.calculator` in `capacitor.config.json`.
- Set store listing, privacy URL (`privacy.html` / hosted docs), content rating (utility).
- Wire real AdMob IDs in a local/untracked config when ready; stubs ship with `enabled: false`.
- This box may not have JDK/Android SDK — debug/release builds are owner-side.

## Layout

```
index.html          privacy.html
css/styles.css
js/calc.js          # expression engine
js/storage.js       # history / memory / prefs
js/ads.js           # banner / rewarded / interstitial stubs
js/audio.js         # optional sound + haptic
js/ui.js            # screens + keypad wiring
manifest.webmanifest  sw.js  icons/
scripts/build-web.js  scripts/smoke.js
capacitor.config.json
docs/  www/  dist/
```

## Privacy

No personal data collection. Preferences and history stay on-device. See [privacy.html](privacy.html).

## License

MIT
