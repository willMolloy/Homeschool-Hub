# S1-21 — Add PNG app icons for installability

**Depends on:** S1-01  
**Size:** XS

## Goal
The PWA passes Chrome's installability check on Android and shows a proper home-screen icon on iOS.

## Context
`apps/web/public/manifest.webmanifest` currently lists only an SVG icon, which isn't enough for Android install prompts or iOS. `public/sw.js` is a placeholder (no offline caching yet, which is deliberate until the logging design is piloted).

## Steps
1. Make 192×192 and 512×512 PNGs (+ a 512 maskable with safe padding) from `icon.svg` and put them in `public/icons/`.
2. Add them to the manifest `icons` array (one with `purpose: 'maskable'`).
3. Add `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` (180×180) and `<meta name="theme-color">` to `index.html`.
4. Run `npm run build -w @hh/web && npm run preview -w @hh/web` and check Chrome DevTools → Application → Manifest shows no errors.

## Done when
- [ ] DevTools shows the app as installable.
- [ ] Adding to the home screen on an iPhone shows the icon.

## Tests
- Manual check above (record the result in the PR).

## Out of scope
- Offline caching / service worker strategy (pending pilot results).
- Push notifications.
