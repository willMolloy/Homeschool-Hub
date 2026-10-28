# S1-37 — Show the engine version in the app footer

**Depends on:** S1-17, S1-07  
**Size:** XS

## Goal
The footer shows `Engine 0.1.0` (from the bundled engine) and warns if the API reports a different engine version.

## Context
The engine is shared code. If the web bundle and the API ever run different engine versions (a stale PWA cache, for example), the numbers could disagree. A visible version makes that easy to catch.

## Steps
1. Import `ENGINE_VERSION` from `@hh/engine` in the footer component.
2. Read `engineVersion` from `/api/health` once on load.
3. If they differ, show a small banner: 'App update available — reload.' with a Reload button (`location.reload()`).

## Done when
- [x] Footer shows the version. Faking a different API version (in a test) shows the banner.

## Tests
- render test: same version → no banner; different → banner

## Out of scope
- Automatic service-worker update flow (later).
