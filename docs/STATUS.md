# STATUS — Offer Calculator

**Path:** `/workspace/apps/calculator-app`  
**Owner:** Mia Smith  
**Updated:** 2026-09-28 13:11 Asia/Karachi (PKT)  
**Version:** 1.0.0-complete  
**Package:** `com.offerpk.calculator`

## OWNER COMPLETE ✅

- [x] Basic: + − × ÷, %, ±, C/CE, backspace, decimal
- [x] Expression line: formula + result; live preview; order of operations
- [x] Memory: MC MR M+ M− MS
- [x] History: localStorage capped 50; tap reuse; clear history
- [x] Scientific: sin cos tan asin acos atan, log ln, √ x² x^y, π e, (, ), deg/rad, factorial, 1/x
- [x] Copy result / paste into expression
- [x] Themes: light / dark / OLED / accent colors (local); rewarded stub unlocks premium + remove banner
- [x] Optional haptic on key; optional sound
- [x] Large buttons; portrait + landscape CSS
- [x] Errors: ÷0, overflow → friendly message, no crash
- [x] A11y: aria-labels on keys; scalable text; TalkBack-friendly
- [x] Keep-screen-on toggle (Wake Lock API stub OK)
- [x] Floating point sensible display rounding (0.1+0.2 → 0.3)
- [x] Deg/Rad correct for trig (sin(90) deg = 1)
- [x] Core calc 100% offline free
- [x] Banner ONLY on History/Themes — never over keypad / never block calculate
- [x] Rewarded for premium themes + remove-ads (one-time stub); interstitial rare after long history clear
- [x] Screens: Basic | Scientific | History | Themes | Settings
- [x] Static privacy policy (`privacy.html` + `docs/`)
- [x] README: build/run, Capacitor Android path, Play checklist (owner signs AAB; no keystore)
- [x] PWA: manifest + sw.js (`offer-calc-v1-20260928-complete`)
- [x] capacitor.config.json webDir `www`, appId `com.offerpk.calculator`
- [x] scripts: build-web → www + docs; pack Windows zip `dist/calculator-web-windows.zip` + PLAY-WINDOWS.bat
- [x] ads.js stubs (banner/rewarded/interstitial) matching games lane
- [x] Version **1.0.0-complete**; no secrets/keystores; no git push from this agent

## Verified on this box

- `node --check` on `js/*.js`
- `node scripts/smoke.js` — 17/17 (2+2, 0.1+0.2→0.3, sin(90)deg=1, order of ops, ÷0, history/memory)
- Extra: cos(90)=0, tan(45)=1, asin(1)=90 deg
- `npm run build:web` → www/, docs/, dist zip

## Remaining gaps ⏳

- [ ] Real AdMob plugin + production IDs
- [ ] Signed release AAB — **owner signs** (no keystore on box / never commit)
- [ ] `npx cap add android` not necessarily run on this box (scaffold + config ready)
- [ ] iOS Capacitor target

## How to open

```bash
cd /workspace/apps/calculator-app
npm start
# → http://localhost:4180
```

## Packages for parent publish

| Artifact | Path |
|----------|------|
| Source | `/workspace/apps/calculator-app` |
| GitHub Pages | `docs/` |
| Windows zip | `dist/calculator-web-windows.zip` (also in `docs/`) |
| Capacitor webDir | `www/` |

**Do not git push from executor** — parent publishes.
