# T-02b — Hand-test fixes: contrast, no events in the demo, hidden adjust buttons

**Source:** DeeDee's hand test, 2026-10-28 (steering items 1 and 3, plus "hide the adjust buttons until something is selected")  
**Depends on:** T-02 (none of this touches the timeline code)  
**Size:** S

## Goal
Fix three things DeeDee hit while testing by hand, each with a test that catches it again:
1. Black text on a dark gray background.
2. The demo account could add events. It must not, in the UI or through the API.
3. "End one week later", "End one week earlier" and "Reset" showed before anything was selected. They must be hidden (not just disabled) until an assignment or activity is selected.

## Context
- The app is light-only (T-01: the timeline's dark theme is opt-in via `[data-theme="dark"]`, and nothing sets it). The text colour is a fixed dark `#1b1f24`, but the app never said it was light-only, and native fields (`select`, date, number and text inputs, `textarea`) kept the browser's own colours. With a dark OS or browser theme, those controls can be drawn dark gray while our dark text stays on top of them. A rendered scan of every signed-in screen (headless Chrome, demo login, 390 and 1280 px, light and dark `prefers-color-scheme`, plus Chrome's forced-dark mode) found no other failing text.
- The demo family is the one `db/seed.ts` creates (`demo@example.com`). Its login email is the only marker it has.
- The three adjust buttons exist only in the prototype on the Timeline Tools Page. The app has none yet; they arrive with the adjust sheet (T-07).

## Steps
1. **Contrast.**
   - `:root { color-scheme: light }` in `styles.css` and `<meta name="color-scheme" content="light">` in `index.html`.
   - One base rule gives text-like native fields an explicit text and background colour (checkboxes, radios and sliders are left alone).
2. **Demo can't add events.**
   - `apps/api/src/auth/demo.ts` holds the demo login (`DEMO_LOGIN_EMAIL`, now also the source of `db/seed.ts`'s `DEMO_EMAIL`), `isDemoLogin`, and `assertNotDemo`.
   - `POST /api/events` answers 403 `demo_read_only` ("The demo family can't add events.") for the demo family before reading the body.
   - `GET /api/me` adds `demo: boolean`.
   - `ScheduleList` takes `canAdd` (default true). The Events screen passes `canAdd={!me.demo}`, so the demo sees no "Add event" button at all.
3. **Adjust buttons.** There is nothing to change in the app yet. The rule is written into T-07: the end-earlier, end-later and reset buttons render only once something is selected, with a test. The prototype needs a Page edit, which this repo work can't make (flagged in the report).

## Done when
- [ ] The app declares itself light-only, in CSS and HTML.
- [ ] Every app CSS rule that paints a solid background has text that meets WCAG AA (4.5:1) on it, counting inherited text.
- [ ] The demo family sees no "Add event" button. Other families still do.
- [ ] `POST /api/events` from the demo family returns 403 and saves nothing. Other families still get 201.
- [ ] Editing and archiving existing events still work for the demo (only adding was asked for).
- [ ] T-07 records the hide-until-selected rule.
- [ ] Nothing is added on screen. This fix removes a control for the demo and adds no text, badges or borders (design principles).
- [ ] `bash scripts/check.sh` is green.

## Tests
- `apps/web/test/css-contrast.test.ts`:
  - `color-scheme: light` is declared in CSS and HTML.
  - The base field rule has readable colours.
  - Page text reads on the page.
  - Every solid background in the app CSS passes AA against its own or inherited text. Non-text fills and translucent ones are listed, and the lists may only name selectors that exist.
  - A canary: dark text on dark gray fails.
- `apps/web/test/events-screen.test.tsx`: the demo sees no "Add event" but still sees the list; other families keep the button.
- `apps/api/test/demo-read-only.test.ts`:
  - `isDemoLogin` matches the demo login regardless of case and spaces.
  - `/api/me` reports `demo` correctly.
  - The demo's POST returns 403 with nothing saved; other families get 201.
- `apps/api/test/me.test.ts` now expects `demo: false`.

## Out of scope
- A dark theme for the app.
- Other demo restrictions (editing events, assignments, days off). Only adding events was asked for.
- Changing the prototype Page.
