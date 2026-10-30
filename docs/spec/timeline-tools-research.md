# Timeline View: Tools and Design Direction

> Copied from the shared Page https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/3f0a3869-f09a-4df5-b7ff-317a49259f2c on 2026-10-30; the repo copy is the working reference until go-live, when docs/spec/ will be removed.

_What to use to build and style the year timeline, why, and what to build first. It costs $0 in licenses, works with the current React 18 + Vite app, and is plain enough to vibe-code._

## Changelog

### 2026-10-28

-   Detail sheet: checked what the shadcn Drawer wraps today. The Base UI flavor (the default) wraps Base UI's own Drawer, and the Radix flavor still wraps Vaul. Chose the shadcn Drawer in its Base UI flavor. Why: Vaul is unmaintained, and you asked for the answer to be verified against the source before picking.
-   Trimmed the v1 stack. Zoom changes crossfade for everyone, with no path morph. v1 zoom levels are Year, Fall and Spring; Month and Week are deferred. Motion, Figma and TanStack Virtual are deferred until a ticket needs one, and each has a named trigger. The bundle budget drops from 60 KB to 40 KB. Why: less to build and review, so the time stays on the timeline itself.
-   Drag preview: a drag now changes only the dragged assignment's lane and the totals strip. Sibling lanes stay still unless a recurring event changes. Removed the idea of affected bars easing. Why: siblings don't actually change, so animating them would suggest an effect that isn't there.
-   Logged the 2 px minimum band thickness as a known distortion, and added a piano question to the test script's debrief on the spec Page. Why: light subjects like piano may read heavier than they are, and the test should measure that rather than assume it.
-   Phones: the adjust sheet (steppers) ships before any drag and may become the main way to edit on phones. Long-press drag comes after it. Why: it's the required non-drag path anyway, and it avoids drag-versus-scroll conflicts.
-   Pilot gate made explicit: only ticket 1 starts before the thickness test passes, and every later ticket is marked gated, not approved. An iterate result sends time to the thickness scale and legend first. Why: a smaller stack shouldn't make later tickets feel approved.
-   Superseded by the milestone-testing bullet below. Effort: added your hours as a range with its assumptions, and converted the sessions saved into calendar weeks. Why: reviewing AI-written code and testing it on a real phone is the real cost.
-   Print: long table cells (Risks' Mitigation, the starter combo's How, and the other long tables) now render as stacked rows, so nothing is cut off in PDF export.
-   Effort reworked for how you'll actually work: you won't review each ticket. The developer agent builds each ticket in minutes, the tester agent reviews every ticket against SOLID and edge cases, and you test the app by hand on a real phone at 6 milestones. Your hours are now per milestone test session plus fix-and-retest rounds: about 14 to 29 hours to a testable version, down from 54 to 90. Why: the per-ticket review estimate no longer matches the process. The tradeoff is that bugs show up later and in batches.

## Pilot gate

> **Only ticket 1 may start before the thickness test passes. Every later ticket is gated, not approved. (warning).** Passing means at least 8 of the 12 parents score Strong by Task 2, and at least 6 of the 8 phone sessions score Strong. A result within one parent of either threshold counts as iterate, not pass. The trimmed stack makes later tickets smaller. It doesn't approve them.

-   Ticket 1 (design tokens and palette script) may start now, because it helps us read the pilot results.
-   Tickets 2 to 6, the adjust sheet and both drag tickets are gated, not approved, until the test passes.
-   If the pilots land in the iterate band (4 to 7 Strong, or the phone rule misses), the time goes to the thickness scale and the legend before any more features. With the smaller stack, the timeline is still the part that matters.
-   Under 4 Strong, or mostly Partial answers, means thickness isn't the differentiator. Follow the spec Page's decision rules and redesign before building anything here.

## Detail sheet component

_Checked Oct 28, 2026 against the shadcn Drawer docs, the shadcn registry source on GitHub, Vaul's repo, and npm._

-   **What the shadcn Drawer wraps today**: It depends on the flavor. The Base UI flavor, the default since July 2026, wraps Base UI's own Drawer (@base-ui/react/drawer). The docs say the drawer now uses Base UI instead of Vaul, and they include a Migrating from Vaul guide. The Radix flavor (and the older new-york-v4 file) still imports vaul.
-   **Vaul's status**: Its README says the repo is unmaintained. The latest npm release is still 1.1.2 from Dec 13, 2024, and the last push to the repo was Oct 3, 2025. It isn't archived or marked deprecated on npm.
-   **Base UI**: @base-ui/react 1.9.0 (Oct 9, 2026), MIT, with React 17, 18 and 19 as peers, so it fits our React 18 app.
-   **Choice**: The shadcn Drawer in its Base UI flavor. Run shadcn@latest add drawer in a project set up with Base UI. On phones you get a bottom sheet with swipe to dismiss and snap points, with no Vaul dependency.
-   **Why not the others**: The Radix-flavor Drawer still depends on unmaintained Vaul. A Sheet (Base UI Dialog with side set to bottom) works, but has no swipe to dismiss or snap points. A custom bottom sheet means writing focus trapping and swipe handling ourselves.
-   **Fallback**: If the Base UI Drawer misbehaves on a test phone, switch to shadcn Sheet with side set to bottom. The steppers inside stay the same.

-   [shadcn/ui Drawer docs (now uses Base UI instead of Vaul)](https://ui.shadcn.com/docs/components/drawer) (ui.shadcn.com)
-   [Base-flavor drawer.tsx (imports @base-ui/react/drawer)](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/drawer.tsx) (github.com)
-   [Radix-flavor drawer.tsx (still imports vaul)](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/radix/ui/drawer.tsx) (github.com)
-   [Base UI Drawer](https://base-ui.com/react/components/drawer) (base-ui.com)
-   [Vaul repo (README: unmaintained)](https://github.com/emilkowalski/vaul) (github.com)
-   [vaul on npm (1.1.2, Dec 2024)](https://www.npmjs.com/package/vaul) (npmjs.com)

## Recommendation

> **Build it ourselves on SVG. Don't adopt a chart or Gantt library..** No library on the market draws thickness as minutes per day or rebalances live, and that's exactly what makes this product different. Bending a library to do it costs more than drawing roughly 200 SVG shapes, and owning the drawing is what lets the view look like ours.

-   **Rendering**: React-rendered SVG for the bars, with an HTML overlay for lane labels, the detail sheet and tooltips
-   **Math**: d3-scale, d3-shape and d3-array for scales, ticks and path strings only. React does all the DOM work.
-   **Gestures**: Native horizontal scrolling, plus one small Pointer Events hook for drag, resize and pinch
-   **Zoom**: Three preset levels in v1: Year, Fall and Spring. Month and Week are deferred. Changing level is a crossfade for everyone, with no path morph. Pinch moves between the same three levels.
-   **Motion**: CSS transitions only in v1: the zoom crossfade, label fades and the sheet. The Motion library is deferred. Reduce-motion is honored with the prefers-reduced-motion media query.
-   **Detail sheet**: The shadcn Drawer in its Base UI flavor, which no longer wraps Vaul. Its steppers are the first edit path to ship and may be the main one on phones.
-   **Styling**: Tailwind v4 and shadcn/ui for the app's chrome, with OKLCH design tokens as CSS variables that the SVG shares
-   **Design**: The prototype Page is the design surface, plus a palette script built on culori. Figma is deferred.
-   **Deferred until a ticket needs it**: Motion: when a ticket needs spring physics or gesture-linked animation, most likely drag settle after long-press drag ships. Figma: when someone else designs with us, or we need frames the prototype can't show. TanStack Virtual: when Month or Week zoom ships and the daily view misses the 300-node or 60 fps budget on a test phone.
-   **License cost**: $0. Every recommended piece is MIT or ISC.

Why this fits you: AI tools write React, SVG, d3 scales and Tailwind very well. Every layer is a pure function or a plain component you can unit-test the same way you'd test a Java service, and there's no framework-specific state to fight.

## Comparison

_Versions and licenses were checked on npm on Oct 28, 2026. Sizes are full-package figures from Bundlephobia; the tree-shaken d3 imports we'd use are much smaller._

**View: Rendering**

-   **SVG, drawn by React** (0 KB): Use it. One path per lane keeps the year view under about 200 nodes, and you get hit-testing, ARIA and crisp text for free. The prototype already works this way. Version: browser. License: free.
-   **SVG marks + HTML overlay** (0 KB): Use it. Sticky lane labels, the detail sheet and tooltips are HTML on top of the SVG, so text stays sharp and accessible. Version: browser. License: free.
-   **Canvas 2D** (0 KB): Keep in reserve. It's faster at thousands of marks, but you have to build hit-testing and screen-reader support yourself. Our mark count doesn't need it. Version: browser. License: free.
-   **WebGL (PixiJS 8.22)** (258 KB): Skip. It's built for games. @pixi/react needs React 19, and the app is on React 18. Version: 8.22.0. License: MIT.

**View: Chart libs**

-   **d3-scale, d3-shape, d3-array (math only)** (16 KB + 6 KB (full)): Use it. It's stable, done, and AI tools know it very well. Use it only for scales, ticks and path strings. React draws everything. Version: 4.0.2 / 3.2.0. License: ISC.
-   **visx** (11 KB (shape)): Optional. These are thin React wrappers around d3. They're fine for axes, but plain d3 math is easier to reason about. Version: 4.0.0 (Jun 2026). License: MIT.
-   **Recharts** (146 KB): Skip. It's built for charts, not lanes with drag-to-resize. Version: 3.10.1. License: MIT.
-   **Nivo** (varies): Skip. Same chart-shaped problem, and its last core release was in May 2025. Version: 0.99.0. License: MIT.
-   **ECharts** (359 KB (full)): Skip. It's heavy, draws to canvas, and is hard to make look like our own design. Version: 6.1.0. License: Apache-2.0.
-   **Konva / react-konva** (55 KB + 44 KB): Only if we ever move to canvas. react-konva 19.x requires React 19. Version: 10.9 / 19.3. License: MIT.
-   **vis-timeline** (119 KB): Skip. It's an events-on-a-line widget with imperative DOM and no concept of thickness. Version: 8.5.6. License: Apache-2.0 or MIT.

**View: Gantt libs**

-   **Frappe Gantt** (14 KB): Skip. Its bars are fixed-height task bars, so it can't show thickness as minutes per day. Version: 1.2.2. License: MIT.
-   **SVAR React Gantt** (99 KB): Skip. It's built around project tasks and dependencies, and we'd fight it. Version: 2.8.2. License: MIT core. PRO is $749 per developer (no SaaS) or $1,899 per app (SaaS allowed)
-   **DHTMLX Gantt** (large): Skip. It's an enterprise project-management model. Version: 10.0.3. License: MIT Community since v10. PRO from $799, with SaaS use by request for an extra fee.
-   **Bryntum Gantt** (large): Skip. A paid consumer app needs the OEM license, so the cost doesn't fit. Version: 7.3.8. License: $940 per developer, which doesn't cover paid SaaS. Paid apps need an OEM subscription; the Complete bundle is about $11,000 a year at 50 customers.

**View: Gestures & motion**

-   **Pointer Events (our own hook)** (0 KB): Use it. One usePointerDrag hook with setPointerCapture covers drag, resize and two-finger pinch. tldraw dropped use-gesture for the same approach in 2026. Version: browser. License: free.
-   **@use-gesture/react** (9 KB): Fallback. It works, but there's been no release in about 2.5 years and it's flagged as unmaintained. Version: 10.3.1. License: MIT.
-   **d3-zoom** (15 KB): Skip. It takes over the DOM transform and fights React state. Version: 3.0.0. License: ISC.
-   **react-zoom-pan-pinch** (15 KB): Skip. It CSS-scales the whole element, which blurs text and defeats semantic zoom. Version: 4.2.0. License: MIT.
-   **Motion (formerly Framer Motion)** (57 KB full, much less with LazyMotion): Deferred from v1. CSS transitions cover the zoom crossfade and the sheet. Add it only when a ticket needs spring physics or gesture-linked animation, most likely drag settle once long-press drag ships. Version: 14.7.1. License: MIT.
-   **react-spring** (20 KB): Fine, but Motion has better docs and more examples that AI tools have learned from. Version: 10.1.2. License: MIT.
-   **vaul (drawer)** (18 KB): Avoid. Its README says the repo is unmaintained, and there's been no release since Dec 2024. shadcn's Base UI Drawer no longer uses it, but the Radix-flavor Drawer still does. Version: 1.1.2 (Dec 2024). License: MIT.
-   **Base UI Drawer (via shadcn)** (per component): Use it for the bar detail sheet. It's what the shadcn Drawer wraps in the Base UI flavor, and it supports React 17 to 19. Version: @base-ui/react 1.9.0. License: MIT.

**View: Styling & color**

-   **Tailwind CSS** (build-time): Use it for the app's chrome. Its palette is OKLCH out of the box and AI tools write it fluently. It needs Safari 16.4 or newer. Version: 4.3.3. License: MIT.
-   **shadcn/ui** (only what you add): Use it for the detail sheet (its Base UI Drawer), popover, dialog and tooltip. It has defaulted to Base UI since July 2026. Radix is still supported, but the Radix Drawer still wraps Vaul, so set the project up with the Base UI flavor. Version: CLI v4. License: MIT (copied into the repo)
-   **Radix Primitives** (per component): Good alternative underneath shadcn. Version: radix-ui 1.8.1. License: MIT.
-   **React Aria Components** (per component): Best keyboard and screen-reader behavior, but wordier. Consider it for the keyboard resize control. Version: 1.22.1. License: Apache-2.0.
-   **Open Props** (tokens): Nice, but redundant once Tailwind is in. Version: 1.7.23. License: MIT.
-   **Plain CSS + CSS variables (current)** (0 KB): Keep it for the timeline's own SVG, so its colors and line weights come from the same tokens. Version: -. License: free.
-   **culori** (22 KB (dev-only)): Use it in a build script that generates the OKLCH subject palette and checks its contrast. Version: 4.0.2. License: MIT.

## Architecture

_Diagram: Engine → View model → Layout → Render → Interaction_

-   **1. Engine** (packages/engine): The existing pure plan. It doesn't change, and its rate is never stored. Tested with the existing 128+ tests.
-   **2. View model** (timeline/model.ts): Turns plans into lanes (subject, then child sub-lanes), with minutes per day on a daily grid at every zoom level. Weekly smoothing repeats the week's average on each day, so weekly and daily views share one grid and always agree. Tested with Vitest and the fixture family.
-   **3. Layout** (timeline/layout.ts): Pure function of (model, zoom, width) that returns lane y-positions, band path strings, event and break rectangles, the Today x-position, tick labels and label placement. Tested with Vitest snapshots of the numbers, not pixels.
-   **4. Render** (timeline/Timeline.tsx): Draws in a fixed back-to-front order: breaks, gridlines, bands, event strips, the Today line, then the selection. The HTML overlay holds sticky lane names and the bottom sheet. Tested with Playwright screenshots at 360 px and 1280 px.
-   **5. Interaction** (timeline/usePointerDrag.ts, useZoom.ts): A drag produces a draft change. While dragging, it replans only the dragged assignment and redraws only its lane and the totals strip: subtract the old contribution, add the new one. Sibling lanes don't move unless a recurring event changes. On release it commits the draft. The adjust sheet and the keyboard produce the same draft. Tested with Vitest for the reducer and Playwright for touch.

## Performance on mid-range phones

-   **DOM size, year view** (under 300 SVG nodes): One filled path per lane, not a rect per day. 20 lanes × 365 days is still 20 to 60 paths.
-   **DOM size, Fall or Spring** (under 300 SVG nodes): A term shows about 18 to 20 school weeks with daily detail, still one path per lane. Draw the visible window plus one screen on each side if needed. No virtualization library in v1.
-   **Live drag preview** (under 8 ms per frame): A full replan took 1.6 ms for the 14-assignment sample family and 4.3 ms for 42 assignments, measured with Node on my computer. Phones are several times slower, so during a drag replan only the dragged assignment and update only its lane and the totals strip (subtract its old contribution, add the new one). Nothing else re-renders.
-   **Scrolling** (60 fps): Use native overflow-x scrolling with touch-action: pan-x pan-y on the view and touch-action: none only on drag handles. Don't re-render React on scroll; update one CSS variable with requestAnimationFrame.
-   **Zoom change** (under 250 ms): Crossfade (opacity) between two memoized layouts, one per level. With reduce-motion on, swap instantly. There's no path interpolation, so paths don't need matching point counts.
-   **Bundle** (under 40 KB gzip added (was 60 KB with Motion)): Import d3 modules by name and add shadcn components one at a time, with the Base UI Drawer for the sheet. No Motion and no virtualization library in v1. Recheck the budget whenever a deferred library is added.

Count marks, not data points. SVG slows down at thousands of separate shapes, not at long paths, so this design stays far below where SVG gets into trouble.

## Accessibility

-   Every drag needs a non-drag alternative (WCAG 2.2, 2.5.7). The adjust sheet is that alternative, and it ships first: tap a bar to get steppers for the end date and minutes per day, plus the same thicken-or-push-end choice a drag offers. On phones it may become the main way to edit. Long-press drag comes after it.
-   Each lane is a focusable group with a label like "Literature, Frank: 22 minutes a day this week, ends Dec 18." Arrow keys move between weeks and Enter opens the sheet.
-   Offer a "Table" view of the same view model, which screen readers can navigate. The debug table we have now becomes that view.
-   Never use color alone. Lane names stay visible, breaks get a hatch pattern, and events get an icon plus a short label.
-   Touch targets are at least 24 px (WCAG 2.5.8), and drag handles have an invisible 44 px hit area.
-   Zoom changes crossfade for everyone. With reduce-motion on, the crossfade and label fades become instant swaps.

## Design direction

### Visual style

#### Calm, printed-planner feel

-   Soft paper background, filled bands, no outlines and no gradients
-   Bands are symmetric around the lane's center line, so a thicker band reads as more work at a glance
-   Overlapping assignments stack inside the band with a 1 px paper-colored gap, not a dark divider
-   Breaks are a light diagonal hatch across all lanes. Events are thin strips with an icon at the top of the lanes.
-   Today is a single ink-colored line with a pill label. It's the only high-contrast mark on screen.

#### Style sketch

_(Sketch omitted)_

### Bar labels

-   At Year zoom and other zoomed-out levels, bars carry no assignment names. Lane names alone keep the overview clean.
-   Past a zoom threshold (Fall or Spring in v1), the assignment name, such as Treasure Island, is drawn inside its bar and cut off with an ellipsis when it doesn't fit.
-   Show a label only when the visible part of the bar fits about 4 characters plus the ellipsis. Otherwise hide it, so there are no lone letters or bare dots.
-   The label is clipped to the part of the bar on screen and sticks to the bar's left edge in view, so it stays readable while you scroll a long bar.
-   Text is light or dark depending on which has more contrast against the bar color, and it must meet WCAG AA (4.5:1). If neither does, put the label on a small backing pill.
-   Text is measured with a cached canvas `measureText` (one shared context, cached per string and font). Use SVG `getComputedTextLength` only as a fallback, so labels never force a layout pass during scrolling.
-   Labels fade in and out as you cross the zoom threshold (about 150 ms). With reduce-motion on, they simply appear and disappear.
-   The full name is always one tap away in the detail sheet, and it's always part of the bar's accessible label, whether or not it's drawn.

### Color

-   Generate a 10-hue subject palette in OKLCH with lightness and chroma held fixed and the hue evenly spaced, so no subject looks louder than another
-   Each child's sub-lane is a lighter or darker step of the subject's hue, not a new color
-   Check the palette with a colorblindness simulator and against Okabe–Ito and Paul Tol's palettes, and keep labels on the bars so color is never the only cue
-   Define light and dark themes as CSS variables, which Tailwind v4 and the SVG both read

### Typography

-   One variable font (system UI, or a self-hosted Inter Variable) at 3 sizes: 12 px for lane labels, 14 px for body text, 20 px for headings
-   Use `font-variant-numeric: tabular-nums` for minutes and dates, so numbers don't jitter while you drag
-   Use sentence case and short labels ("22 min/day", "Ends Dec 18")

### Motion principles

-   Motion explains change: while you drag one bar, only its lane and the totals strip change. Sibling lanes stay still unless a recurring event changes, so nothing hints at an effect that isn't there.
-   Keep it fast: 150 to 250 ms ease-out CSS transitions. Zoom levels crossfade, with no path morphing and no springs in v1.
-   Nothing moves on its own: no looping or attention-grabbing animation
-   Respect reduce-motion everywhere with the `prefers-reduced-motion` media query

### Inspiration

-   [Mobbin: real mobile app screens (calendar and planner flows)](https://mobbin.com) (mobbin.com)
-   [Apple Human Interface Guidelines: charts](https://developer.apple.com/design/human-interface-guidelines/charts) (developer.apple.com)
-   [Refactoring UI: practical visual design for developers](https://www.refactoringui.com) (refactoringui.com)
-   [OKLCH color picker](https://oklch.com) (oklch.com)
-   [Paul Tol's colorblind-safe schemes](https://personal.sron.nl/~pault/) (sron.nl)
-   [Okabe–Ito palette (Color Universal Design)](https://jfly.uni-koeln.de/color/) (jfly.uni-koeln.de)
-   [Observable Plot gallery: streamgraph and area forms](https://observablehq.com/@observablehq/plot-gallery) (observablehq.com)
-   [Figma Starter plan (free, deferred until needed)](https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview) (help.figma.com)

## Risks

-   **Drag conflicts with scrolling on phones**: Why it matters: a horizontal drag on a bar and a horizontal scroll look the same to the browser. Mitigation: the adjust sheet ships first and may be the main edit path on phones. When drag comes, it starts only from a visible handle or after a 300 ms long-press. Everywhere else, scrolling stays native.
-   **Live preview stutters**: Why it matters: a full replan on a slow phone can take longer than one frame. Mitigation: replan only the dragged assignment, update only its lane and the totals strip, throttle with requestAnimationFrame, and move the engine to a Web Worker if needed.
-   **Thin bands disappear at year view**: Why it matters: piano at 15 min/day can render under 2 px. Mitigation: a 2 px minimum visible thickness, scaled with the exaggerated curve the pilots tested. That floor has its own cost, logged below.
-   **The 2 px minimum overstates light subjects**: The floor makes light subjects such as piano at 15 min/day look heavier than they are, closer to reading than the minutes justify. Accepted for now and measured: the spec Page's debrief asks parents how much time the piano band takes each day compared with reading, and records whether they over-read it. If many do, fix it in the thickness scale or the legend before building new features.
-   **Label collisions on a 360 px screen**: Why it matters: lane names, event labels and the Today pill fight for space. Mitigation: sticky HTML lane labels, abbreviated event labels, and a layout function that assigns label slots.
-   **Crossfade hides what changed between zoom levels**: Why it matters: with no morph, a parent switching from Year to Fall can lose their place. Mitigation: anchor the zoom on Today or the selected bar, and keep the Today line and selected lane in the same spot across the crossfade.
-   **Tailwind v4 browser floor**: Why it matters: it needs Safari 16.4 or newer, which rules out older iPhones. Mitigation: fine for 2027 users. Check analytics after the beta.
-   **Staying on React 18**: Why it matters: react-konva and @pixi/react already require React 19. Mitigation: we don't use them. Plan a React 19 bump after the timeline ships.
-   **Vibe-coded drift**: Why it matters: AI tools tend to reach for Recharts or a Gantt library. Mitigation: put "no chart or Gantt libraries in the timeline" in each ticket's out-of-scope list and in the repo's AI rules file.

## First 6 tickets

_Each is one PR. Only ticket 1 is approved to start. Tickets 2 to 6 and everything after them are gated, not approved, until the thickness test passes (see Pilot gate)._

1.  **Design tokens and palette script (approved to start)**: A `scripts/palette.ts` using culori that writes OKLCH subject colors plus light and dark CSS variables to `tokens.css`, with a contrast check in its test
2.  **Timeline view model (gated, not approved)**: `timeline/model.ts`: plans in, lanes out (subject, then child), with weekly and daily series on one daily grid. Tests use the sample family.
3.  **Layout function (gated, not approved)**: `timeline/layout.ts`: pure (model, zoom, width) to path strings, rectangles, ticks and the Today x-position. Number-based tests at 360 px and 1280 px.
4.  **Static SVG timeline at year zoom (gated, not approved)**: `Timeline.tsx` draws breaks, bands, event strips and Today from the layout, with sticky HTML lane labels. Playwright screenshots on a phone and a desktop.
5.  **Zoom presets with crossfade (gated, not approved)**: A Year, Fall or Spring segmented control. Month and Week are deferred. Pinch maps to the same three levels, and the change is a crossfade for everyone (an instant swap under reduce-motion). Keep Today and the selection anchored across the change.
6.  **In-bar assignment labels (gated, not approved)**: Above the zoom threshold, draw the name inside the bar with an ellipsis. Show it only if about 4 characters plus the ellipsis fit, and keep it pinned to the bar's left edge in view. Pick light or dark text by AA contrast, measure text with cached `measureText`, and fade it with the zoom crossfade (instant under reduce-motion). The full name stays in the sheet and the ARIA label. Unit-test the fit and truncation rules in the layout layer.

After these, and also gated, not approved: the adjust sheet first (tap a bar for steppers; it's the non-drag edit path, ships before any drag, and may be the main edit path on phones), then drag-to-resize with live preview (a handle on desktop, long-press on phones), then drag-to-move. Each is its own ticket with its keyboard and sheet equivalent. If the pilots land in the iterate band, none of these start: the time goes to the thickness scale and legend first.

## Effort and your hours

_Estimates, not measurements. The developer agent builds each ticket in minutes and the tester agent reviews every ticket against SOLID and edge cases. Your hours are hands-on testing on a real phone at milestones, plus fix-and-retest rounds._

You don't review tickets. You test the app by hand on a real phone at each milestone, file what you find, and retest the fixes. A test session covers a fixed checklist for that milestone on an iPhone and a mid-range Android, plus notes the developer agent can act on. A fix-and-retest round means rechecking only what was fixed, plus a quick look at what's next to it. All of this is the cost if the pilots pass; only ticket 1 is approved now.

-   **1. Timeline group** (2–4 hrs): Tokens, view model, layout, the static year view and in-bar labels. A 1.5–2 hr session (bands, Today line, breaks, events, labels and lane names at 360 px and on a desktop), plus 1–2 retest rounds of 0.5–1 hr.
-   **2. Zoom** (2.5–5.5 hrs): Year, Fall and Spring, pinch, and the crossfade. A 1.5–2.5 hr session (pinch versus scroll, keeping your place across a zoom, reduce-motion), plus 2–3 retest rounds of 0.5–1 hr, because gesture bugs rarely clear in one pass.
-   **3. Adjust sheet** (1.5–4 hrs): Tap a bar, steppers, thicken or push the end date, and the keyboard path. A 1–2 hr session, plus 1–2 retest rounds of 0.5–1 hr.
-   **4. Drag (resize, then move)** (3–7 hrs): Long-press versus scroll, the live preview touching only its own lane and the totals strip, and the release. A 2–3 hr session, plus 2–4 retest rounds of 0.5–1 hr. This is the milestone most likely to run long.
-   **5. App shell and This Week** (2–4.5 hrs): Navigation, settings, sign-in screens, the This Week list and checking things off. A 1.5–2.5 hr session, plus 1–2 retest rounds of 0.5–1 hr.
-   **6. Testable-version pass** (2.5–4 hrs): One end-to-end run of a parent's real tasks on both phones before calling it testable. A 2–3 hr session, plus 1 retest round of 0.5–1 hr.
-   **Total to a testable version** (14–29 hrs): At 6–8 hrs a week, the hours alone fit in about 2 to 5 weeks. In practice, plan on about 3 to 6 calendar weeks, at roughly one milestone a week including its retest rounds. Not included: the pilot sessions, an iterate round on the scale and legend, or a retest with new parents.

-   Assumes 6–8 focused hours a week for this project, with each test session done in one sitting.
-   Assumes the tester agent catches most logic and edge-case bugs before you see a build, so your sessions mostly find touch, feel and layout problems that only show up on a real phone.
-   Each retest round is 0.5–1 hr. A milestone that needs more rounds than listed adds that much per round, and drag and zoom are the likeliest to.
-   Calendar time is now set by milestone testing and pilot scheduling, not by review. Building and per-ticket review take minutes, so the real waits are your next free test slot and getting parents booked for the pilots.
-   The tradeoff: bugs surface later and in batches. A problem you find at the drag milestone may come from several tickets back, so fixes are harder to pin down and one milestone can need several rounds. To soften that, keep each milestone small, ask the tester agent for a short per-ticket note on what changed, and test against the same checklist every time.

## Reusable templates and code

No template does our thickness bands, but about half the surrounding work can be copied. The best savings are the app shell and This Week page from shadcn, the band math from the visx streamgraph, and drag-handle and pinch patterns we copy into our own hook. Gantt and timeline libraries are useful to read, not to install.

### What to reuse

_Stars, licenses, releases and React support were checked on GitHub and npm on Oct 28, 2026. Each link loaded that day; Dribbble blocks automated checks, so those two were confirmed through search._

**View: Timeline repos**

-   **visx examples (airbnb/visx)** (React 18: Yes (^18 or ^19)): Copy the streamgraph example's band code, switching offset="wiggle" to silhouette so child sub-lanes stack symmetrically on the subject's centerline. Borrow the brush example for an optional year overview strip, and the areas example for curve choices. Health: 21.1k stars, MIT, v4.0.0 Jun 11 2026, last push Jun 22 2026. Risk: @visx/zoom is built on use-gesture, which is unmaintained, so copy the math rather than installing it.
-   **dnd-timeline (samuelarbibe)** (React 18: Yes (built on dnd-kit core, React 16.8+)): Borrow the pattern: headless hooks for time-to-pixel math, item drag and edge-resize handles, which map onto draggable end dates. We could adopt it outright for drag if our own hook stalls. Health: 252 stars, MIT, v3.1.1 May 2026, last push Aug 24 2026. Risk: Small project with one maintainer. It assumes fixed-height rows, so we render the bands ourselves.
-   **react-calendar-timeline (namespace-ee)** (React 18: Yes (^18 or ^19)): Borrow the pattern for the sticky lane sidebar kept in sync with a scrolling date header, and its interactjs resize handles. Health: 2.2k stars, MIT, 0.30.0-beta, last beta Jul 24 2026. Risk: Still in beta, and items are fixed-height boxes, so it would fight variable thickness. Don't install it.
-   **gantt-task-react (MaTeMaTuK)** (React 18: Yes (^18)): Reference only: its small SVG bar and drag-handle components are easy to read. Health: 1.1k stars, MIT, archived, last release 0.3.9 Jul 2022. Risk: Archived, so nothing to depend on.
-   **Frappe Gantt** (React 18: Not React (plain SVG)): Visual reference for the two-tier date header and its Day, Week and Month view switcher. Health: 6.2k stars, MIT, 1.2.2 Feb 2026, last push Jun 18 2026. Risk: Fixed-height bars and imperative DOM.
-   **SVAR React Gantt** (React 18: Yes (18+)): Visual reference only for how it configures zoom scales. Health: 215 stars, MIT core, 2.8.2 Oct 27 2026. Risk: PRO features are paid, and it's built around tasks and dependencies.
-   **vis-timeline** (React 18: Not React): Visual reference for zoom and pan feel on its examples page. Health: 2.6k stars, Apache-2.0 or MIT, 8.5.6 Oct 26 2026. Risk: Imperative, needs moment.js, and has no concept of thickness.
-   **Schedule-X** (React 18: Yes (16 to 19)): Possible ready-made week grid if This Week ever becomes a calendar. Health: 2.6k stars, MIT, React wrapper 4.1.0 Jan 2026. Risk: It's an events calendar, not assignment lists, and some plugins are in a paid premium tier.
-   **Planby** (React 18: No (requires React 19)): Nothing. Excluded. Health: 1.7k stars, custom license, 2.1.0 Aug 2026. Risk: React 19 only, and the license isn't standard open source.

-   [visx streamgraph example](https://airbnb.io/visx/streamgraph) (airbnb.io)
-   [visx streamgraph source](https://github.com/airbnb/visx/tree/master/packages/visx-demo/src/sandboxes/visx-streamgraph) (github.com)
-   [visx brush example](https://airbnb.io/visx/brush) (airbnb.io)
-   [visx areas example](https://airbnb.io/visx/areas) (airbnb.io)
-   [dnd-timeline](https://github.com/samuelarbibe/dnd-timeline) (github.com)
-   [dnd-timeline demo](https://dnd-timeline-demo.vercel.app) (vercel.app)
-   [react-calendar-timeline](https://github.com/namespace-ee/react-calendar-timeline) (github.com)
-   [gantt-task-react (archived)](https://github.com/MaTeMaTuK/gantt-task-react) (github.com)
-   [Frappe Gantt](https://frappe.io/gantt) (frappe.io)
-   [SVAR React Gantt](https://svar.dev/react/gantt/) (svar.dev)
-   [vis-timeline examples](https://visjs.github.io/vis-timeline/examples/timeline/) (visjs.github.io)
-   [Schedule-X](https://schedule-x.dev) (schedule-x.dev)

**View: App shell & This Week**

-   **shadcn/ui blocks and Vite install** (React 18: Yes (code is copied into the repo)): Copy the sidebar block for the app shell, the Base UI Drawer for the bar detail sheet (not the Radix flavor, which still wraps Vaul), plus Card, Checkbox, Calendar and Tabs for This Week. Health: 126.8k stars, MIT, last push Oct 27 2026. Risk: Low. Newer components drop forwardRef, which only matters if we pass refs to them on React 18.
-   **shadcn-admin (satnaing)** (React 18: Built on React 19, copy works on 18): Copy its layout files (sidebar, header, theme toggle, settings pages, auth screens). Don't fork the whole app. Health: 16.2k stars, MIT, v2.2.1 Nov 2025, last push Sep 10 2026. Risk: Uses React 19 and TanStack Router, so we copy files and adapt imports rather than fork.
-   **big-calendar (lramos33)** (React 18: Yes (React 18.2)): Borrow the week and agenda layouts for the This Week page. Health: 1.1k stars, MIT, last push Aug 11 2026. Risk: Next.js and Tailwind 3, so classes need porting to v4.
-   **Origin UI event-calendar** (React 18: Built on React 19): Borrow its week view and drag-between-days pattern for moving a day's work. Health: 294 stars, MIT, last push Dec 12 2025. Risk: React 19 and quiet since December 2025.
-   **TailAdmin free React dashboard** (React 18: Built on React 19): Visual reference for dashboard cards. Health: 1.3k stars, MIT, last push Oct 28 2026. Risk: Its own component style, not shadcn, so mixing would look inconsistent.

-   [shadcn/ui blocks](https://ui.shadcn.com/blocks) (ui.shadcn.com)
-   [shadcn/ui sidebar blocks](https://ui.shadcn.com/blocks/sidebar) (ui.shadcn.com)
-   [shadcn/ui install for Vite](https://ui.shadcn.com/docs/installation/vite) (ui.shadcn.com)
-   [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/drawer) (ui.shadcn.com)
-   [shadcn-admin](https://github.com/satnaing/shadcn-admin) (github.com)
-   [shadcn-admin live demo](https://shadcn-admin.netlify.app) (netlify.app)
-   [big-calendar](https://github.com/lramos33/big-calendar) (github.com)
-   [big-calendar live demo](https://big-calendar.vercel.app) (vercel.app)
-   [Origin UI event-calendar](https://github.com/origin-space/event-calendar) (github.com)
-   [TailAdmin free React dashboard](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard) (github.com)

**View: Code references**

-   **Variable-thickness bands: d3 area plus stack silhouette** (React 18: Yes (math only)): Copy the pattern area().y0(cy - w/2).y1(cy + w/2) with curveStepAfter for daily detail and curveMonotoneX for weekly smoothing. stackOffsetSilhouette centers stacked child sub-lanes on the subject centerline. Health: d3-shape 3.2.0, ISC. Risk: Smooth curves can overshoot. Monotone curves don't.
-   **d3-zoom with React** (React 18: Yes (math only)): Borrow transform.rescaleX to turn a pinch or slider into a new date scale that React renders. Health: d3-zoom 3.0.0, ISC, docs plus a Qiita walkthrough. Risk: Attaching d3-zoom itself takes over pointer events, which the page above already rules out.
-   **Touch pinch-zoom on SVG** (React 18: Browser API): Copy the two-pointer distance logic into usePointerDrag. Health: MDN Pinch zoom gestures guide. Risk: Needs touch-action: none only on the pinch area, or it breaks native scrolling.
-   **Virtualized horizontal scroller** (React 18: Yes (16 to 19)): Use horizontal: true to render only the visible months at daily zoom. Health: TanStack Virtual 3.14.23 Oct 26 2026, 7.2k stars, MIT. Risk: Deferred. v1 has no Month or Week zoom, so add it only when one of those ships and the daily view misses the 300-node or 60 fps budget on a test phone.
-   **Drag handles** (React 18: Yes): Borrow dnd-timeline's resize-handle pattern. useMove gives the same handle keyboard arrows for free. Health: dnd-timeline hooks, plus React Aria useMove (react-aria 3.53.1, Apache-2.0) Risk: Import only useMove to keep the bundle small.
-   **Text truncation in SVG** (React 18: Yes): Copy the binary-search ellipsis function with a <title> fallback. pretext measures text without touching the DOM. Health: IDV Guide snippet, MDN getSubStringLength, pretext 1.0.0 (MIT, 50.9k stars) Risk: pretext is new. The cached canvas measureText already planned is enough to start.

-   [d3-shape stacks and offsets](https://d3js.org/d3-shape/stack) (d3js.org)
-   [d3-shape areas](https://d3js.org/d3-shape/area) (d3js.org)
-   [d3-zoom (rescaleX)](https://d3js.org/d3-zoom) (d3js.org)
-   [Using d3-zoom inside React](https://qiita.com/_likr/items/a7dd9cce7afc460eb0ef) (qiita.com)
-   [Pinch zoom gestures with Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures) (developer.mozilla.org)
-   [TanStack Virtual fixed example](https://tanstack.com/virtual/latest/docs/framework/react/examples/fixed) (tanstack.com)
-   [React Aria useMove](https://react-spectrum.adobe.com/react-aria/useMove.html) (react-spectrum.adobe.com)
-   [Wrapping and truncating SVG labels](https://www.interactive-data-visualization.com/core-rendering-engines-tradeoffs/text-and-label-rendering/wrapping-and-truncating-svg-axis-labels/) (interactive-data-visualization.com)
-   [getSubStringLength](https://developer.mozilla.org/en-US/docs/Web/API/SVGTextContentElement/getSubStringLength) (developer.mozilla.org)
-   [pretext text measurement](https://github.com/chenglou/pretext) (github.com)

**View: Design inspiration**

-   **Figma: Gantt chart kit (48 charts)** (React 18: n/a): Visual reference for week, month, quarter and year axis tiers and the Today line. Health: Free for personal and commercial use. Risk: Project-style fixed bars, so borrow only the axes and spacing.
-   **Figma: Project timeline (Gantt chart)** (React 18: n/a): Visual reference for lane labels and color by group. Health: Free community file. Risk: Same fixed-bar model.
-   **Figma: Project Management Views kit, Timeline and Workload** (React 18: n/a): Visual reference: its workload view is the closest to showing effort, not just dates. Health: Free community file. Risk: SaaS look, so we'd soften it toward the printed-planner feel.
-   **Dribbble: TaskMeister timeline view** (React 18: n/a): Visual reference for a calm timeline with soft rounded bars. Health: Shot. Risk: Desktop-only layout.
-   **Dribbble: Retasks calendar and timeline** (React 18: n/a): Visual reference for a responsive timeline that also works on phones. Health: Shot. Risk: Visual only.
-   **Everie** (React 18: n/a): Interaction reference: swimlanes, zoom anchored at the pointer, Today button, drag-to-resize bars. Health: Free web app. Risk: A shipping product, so take ideas, not assets.

-   [Gantt chart kit](https://www.figma.com/community/file/1664252300854320099) (figma.com)
-   [Project timeline (Gantt chart)](https://www.figma.com/community/file/1195850074518926318) (figma.com)
-   [Project Management Views kit: Timeline and Workload](https://www.figma.com/community/file/1682156426881617787) (figma.com)
-   [TaskMeister timeline view](https://dribbble.com/shots/21667288-TaskMeister-Timeline-View-Task-Management-Dashboard) (dribbble.com)
-   [Retasks calendar and timeline](https://dribbble.com/shots/16349171-Calendar-Timeline-for-Retasks-Lazarev) (dribbble.com)
-   [Everie timelines](https://everie.app/) (everie.app)

### Starter combo

-   **App shell, settings, sign-in screens** (Most of an AI session): Start from: the shadcn/ui Vite install, sidebar block and shadcn-admin layout files. How: copy components.
-   **This Week page and bar detail sheet** (About half an AI session): Start from: shadcn Card, Checkbox and the Base UI Drawer, plus big-calendar's week layout. How: copy components and borrow the layout.
-   **Thickness bands and child sub-lanes** (A few hours): Start from: the visx streamgraph with d3 area and stackOffsetSilhouette. How: copy the pattern.
-   **Drag end dates and pinch-zoom** (A few hours, mostly touch debugging): Start from: dnd-timeline resize handles, the MDN pinch guide and React Aria useMove. How: borrow the patterns into usePointerDrag. Gated with the drag tickets.
-   **In-bar names with ellipsis** (About an hour): Start from: the IDV Guide truncation snippet. How: copy the function.
-   **Axis tiers, Today line, spacing** (Fewer design rounds): Start from: the Figma Gantt chart kit and Everie. How: visual reference only, viewed in the browser. No Figma work is planned.
-   **Virtualized scroll** (Deferred): Start from: TanStack Virtual. How: not in v1. Add it only when Month or Week zoom ships and the daily view misses its budget on a test phone.

Estimate: these cut the AI's work on the timeline view by roughly 25–30% and on the shell plus This Week by about half. That's about one to one and a half AI sessions out of the five or six left before a testable version. Reuse mainly cuts developer and tester time. Well-tested shadcn components and proven patterns also mean fewer bugs reach your milestone tests, so the shell, This Week and band milestones should land near the low end of their retest ranges under Effort. In calendar time the saving is small, because milestone testing and pilot scheduling set the pace. The timeline's own look and replan logic stay custom, since that's the product.

## Sources

-   [Count the marks, not the library stars (SVG vs Canvas)](https://romaincoupey.com/posts/svg-vs-canvas-charts/) (romaincoupey.com)
-   [SVG vs Canvas charts: what actually matters (2026)](https://apexcharts.com/blog/svg-vs-canvas-charts/) (apexcharts.com)
-   [visx v4.0.0 release](https://github.com/airbnb/visx/releases/tag/v4.0.0) (github.com)
-   [Bryntum Gantt pricing](https://bryntum.com/store/gantt/) (bryntum.com)
-   [Bryntum OEM pricing](https://bryntum.com/oem-pricing/) (bryntum.com)
-   [DHTMLX Gantt pricing and editions](https://dhtmlx.com/docs/products/dhtmlxGantt/) (dhtmlx.com)
-   [DHTMLX Gantt Community Edition under MIT](https://dhtmlx.com/blog/meet-dhtmlx-gantt-community-edition-mit-license/) (dhtmlx.com)
-   [SVAR React Gantt pricing](https://svar.dev/react/gantt/pricing/) (svar.dev)
-   [use-gesture health report](https://inspect.software/software/pmndrs/use-gesture) (inspect.software)
-   [tldraw replaces use-gesture with Pointer Events](https://github.com/tldraw/tldraw/pull/8392) (github.com)
-   [Motion: reduce bundle size (LazyMotion)](https://motion.dev/docs/react-reduce-bundle-size) (motion.dev)
-   [Motion: useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) (motion.dev)
-   [Vaul repo (README: unmaintained)](https://github.com/emilkowalski/vaul) (github.com)
-   [shadcn/ui Drawer: now uses Base UI instead of Vaul](https://ui.shadcn.com/docs/components/drawer) (ui.shadcn.com)
-   [shadcn registry: Base-flavor drawer.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/drawer.tsx) (github.com)
-   [shadcn/ui: Base UI as the default (July 2026)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) (ui.shadcn.com)
-   [Tailwind CSS browser compatibility](https://tailwindcss.com/docs/compatibility) (tailwindcss.com)
-   [OKLCH browser support](https://caniuse.com/mdn-css_types_color_oklch) (caniuse.com)
-   [WCAG 2.2 Understanding 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) (w3.org)
-   [Figma plans and pricing](https://www.figma.com/pricing/) (figma.com)
