# S8-02 — Light, dark and system themes

**Source:** ROADMAP.md, "UI refinement and dark mode"; Will: follow the device by default with a Light / Dark / System choice  
**Depends on:** S8-01  
**Size:** S

## Goal
The app follows the device's light or dark setting by default, and Settings offers Light, Dark or System, remembered on that device.

## Steps
1. Remove the global `color-scheme: light` lock; set `color-scheme` from the theme so native fields draw correctly in both.
2. A theme setting (System default) stored in `localStorage` (wrapped in try/catch; falls back to System), applied as `data-theme` on `<html>` before first paint to avoid a flash.
3. Add an **Appearance** row (Light / Dark / System) to Settings.

## Done when
- With the device in dark mode the app is dark; choosing Light or Dark overrides it and survives a reload; no white flash on load in dark mode.

## Tests
- Web: the setting applies `data-theme`; System follows a mocked `prefers-color-scheme`; storage failure falls back to System.

## Out of scope
- Per-family theme sync.
