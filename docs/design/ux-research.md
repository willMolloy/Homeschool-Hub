# Homeschool Hub: UX research and design directions

> **Decision (2026-10-31):** Will chose **Direction 1: Soft Paper**, with the assignment colours slightly stronger (light fills mixed 14% toward their strong tone, dark 10%; all still AA; see the updated `mockups/soft-paper.html`). He's checking with DeeDee. Will then chose (2026-10-31): Option B with tabs **Home · Track work · Schedule** (Schedule has a Week | Year switch), one child at a time with Both, the check-in card until answered, optional subject icons, basic starter subjects only, the placeholder logo, and tighter Year lanes with inline names. Built in Sprint 8 (`tickets/sprint-8-soft-paper/`).

Written 2026-10-31 for Will and DeeDee, as the "audit and direction first" step of Sprint 8 (ROADMAP.md, "UI refinement and dark mode"). Nothing here changes app code. The mockups are static HTML files in [`mockups/`](mockups/); open them in any browser.

**Short version**
- **Navigation:** add a real **Home** screen and cut the bottom bar from five tabs to three labelled ones: **Home · This week · Year**. Kids, Subjects, Assignments, Days off and Events all move into one **Set up** screen, reached from Home and from the Year screen. Settings and Sign out move behind the family button on Home. (Option B below; Option A is a tab-less hub.)
- **Look:** three directions are mocked up: **Soft Paper** (warm cream, a book-like serif), **Pastel Cards** (rounded white cards, friendly rounded type) and **Airy Minimal** (near-white, hairlines, Things-style). I recommend **Pastel Cards**: it matches Will's words most directly ("soft, rounded, warm and friendly, pastel") and gives the pastel subject bars the most room to be the hero.
- **This Week:** each piece of work is one soft pastel bar with one round check button. Tapping the bar opens a small "Update" sheet. Nothing else goes on the row.
- **Decisions needed** are at the end (section 9).

---

## 1. The current app: what makes it feel dated and confusing

I looked at the screenshots in `docs/progress/screens/` (sprint-3a to sprint-5, `s2b-weekly-card-*`, `s2a-*`, `s1-*`, `hardening-*`) at 360 and 390 px.

### What makes it look like 2013
1. **A heavy navy header bar on every screen** ("Homeschool Hub / Demo family" + an outlined "Sign out" button). It takes about 64 px of every phone screen, has no logo, and makes "Sign out" the most visible action in the app.
2. **System fonts and default weights.** Everything is `system-ui` at a few sizes. Headings are just bold body text, so nothing has a voice.
3. **Square-ish, outlined, navy buttons** ("Missed a day?", "Make an adjustment", "Add", "Cancel"). Outline-plus-fill pairs at the same size give two equal-looking choices where one should lead.
4. **Native form controls everywhere:** `<select>`, OS date inputs (`11/16/2026 📅`), checkbox lists and range sliders. They change look per browser and are the strongest "web form" signal.
5. **Grey page, white card, grey border, more cards inside cards.** The last-week card is a bordered box holding pastel boxes holding text, with a tab control on top. Each layer adds a border.
6. **A blue underlined link as a status message** ("Last week isn't checked in yet.").
7. **Text-only tab bar labels with no icons**, and five of them squeezed so that "Subjects" and "Schedule" almost touch. In several screenshots the tab bar floats over content mid-page (a screenshot artefact of `position: fixed`, but on real phones it also hides the last card unless there is enough bottom padding).
8. **Tiny "Engine 0.5.0" footers** and other developer traces.

### What makes it confusing
1. **No home base.** The app opens on "Plan", and the first thing a parent sees is a "Missed a day?" button and a link about last week. There is nothing that says "this is your year, here is this week".
2. **The tab names overlap in meaning.** *Plan*, *Timeline* and *Schedule* all sound like "the plan". *Plan* actually means this week, *Timeline* means the year, and *Schedule* is a settings hub. *Kids* and *Subjects* are setup lists that a parent touches a few times a year but they get permanent tabs.
3. **The check-in is a form, not a question.** `s2b-weekly-card-adjust-360.png` is over 4,000 px tall: for each assignment there are three chips (Done / About half / Didn't start), a slider, a number box ("Got to page 207.21"), and a status line. Will is right: one row has four ways to say the same thing.
4. **Developer numbers on the main screen.** The "Frank / Make an adjustment" tables (Literature 7.9, Math 34.1, Total 83.6…) are effort points per day. A parent can't read them, and they look like grades or minutes. They must never appear in the parent UI.
5. **Duplicate and competing actions:** "Missed a day?" vs the weekly check-in (now removed), "Looks right" vs "Skip", "Move back a week" / "Move forward a week" on the timeline edit bar (being replaced).
6. **Empty dead ends.** `s1-31-subjects-empty-360.png` shows a dashed box "No subjects yet." and one button. The assignment form has a Subject dropdown that is empty for a new family. A new family's timeline is blank.
7. **The timeline is the best idea and the least explained screen.** Lane labels ("Literature · Frank", "Margaret") sit in small grey text, the red today line is harsh, and the "All subjects" strip is a grey blob without a legend.

### What to keep
- **The pastel subject bars.** On This Week (`sprint-4/this-week-360.png`) the mint/peach/sky bars with "Lessons 25–30" on the right are already the most modern thing in the app. Will liked them; they become the core component.
- **Plain-language amounts** ("pp. 29–43", "Ch. 10–13", "89 min").
- **The briefing idea** (only speak when something needs attention).
- **Progressive disclosure** (edit bar only when a bar is selected) and the 44 px target rule.

---

## 2. Research: who does this well, and what to borrow

### Calm planners and friendly apps

| App | What it does well | What to borrow for Homeschool Hub |
|---|---|---|
| **Tiimo** (visual daily planner; finalist, Apple Design Awards 2024; iPhone App of the Year, App Store Awards 2025) | One calm, simple view of calendar, to-dos and routines; colour and icon per item; a full redesign in 2025 aimed explicitly at "clarity and calm". [1][2] | Colour + an icon per subject, one view that answers "what now", nothing moving on screen except what matters. |
| **Structured** (visual day planner; ADA 2026 finalist, Inclusivity) | A single timeline of colour-coded blocks; its stated goal is "the joy of a paper planner" in digital form. Reviewers praise the "clean visual timeline". One reviewer notes that many short blocks squash into "an unreadable ribbon of colour". [3][4][5] | The coloured-block timeline is the same idea as our Year view; their weakness (thin blocks) is one we already solved with labels above thin bars. Borrow their rounded block shape and soft tints. |
| **Things 3** (two Apple Design Awards) | Reviewers call it "crisp and lightweight" and say it "never feels messy or overbearing, no matter the length of your task list"; it avoids the customisation sprawl that turns a planner into a procrastination tool. [6] | One round checkbox per row; generous white space; very few visible controls; secondary actions in a sheet. This is the model for the Completed / Update pattern. |
| **Finch** (self-care pet) | Soft pastels (light blue, mint) that read as calm and friendly; strong feedback when a task is completed. Design critiques fault its onboarding for asking for everything at once (breaking progressive disclosure) and some screens for clutter. [7][8][9] | The warmth and the satisfying "done" moment. Avoid: a long upfront onboarding quiz; ask one thing at a time instead. |
| **Headspace, Apple Reminders, Notion Calendar, Sunsama, Todoist** | (From general familiarity, not cited.) Rounded cards, a single accent colour, large friendly headings, a "today" screen as home, sheets for detail, and a Light/Dark/System preference. | Home as a "today" card stack; sheets for editing; one accent colour. |

### Competitors to beat

- **Homeschool Planet** is the market leader. A 2026 comparison lists among its cons that its "interface feels dated compared to modern tools" and that "initial setup takes several hours". [10] Older reviews (2013) praised it as easy; its look has not moved since. **A calm, modern look plus a 10-minute setup is a real opening.**
- **Homeschool Panda** is mobile-first, with drag-and-drop scheduling, auto-rescheduling of incomplete work, records, and a social network. [11][12] It aims at "everything"; we win by being simpler and calmer, and by the year-at-a-glance timeline nobody else has.

### Navigation research

- **Apple HIG, tab bars:** a tab bar moves between top-level sections, is for navigation not actions, should use "the minimum number of tabs required", and titles should be single words where possible. [13]
- **Material Design:** a bottom bar fits **3 to 5** top-level destinations; with fewer, labels can always show. [14]
- **NN/g, icon usability:** apart from a handful of universal icons (home, search, print), icons need visible text labels; icon-only navigation tests worse. [15][16] Today's labels have no icons and the icons we add must keep their labels.

Takeaway: **three labelled tabs with icons** are the standard, best-understood pattern, and "Home" is one of the few universally understood icons.

### Building blocks for our stack (React, Tailwind v4, shadcn/ui on Base UI)

- **shadcn/ui theming** is all CSS variables (`--background`, `--card`, `--primary`, `--radius`…) with a `.dark` block, which is exactly how Light/Dark/System should work. [17][18] The app already generates `--tl-*` tokens in `apps/web/src/styles/tokens.css`; the new direction is a new token set, not new components.
- **tweakcn** is a visual editor for shadcn themes with live preview, OKLCH output and Tailwind v4 export. [19] Use it to tune the chosen palette and export `:root` / `.dark` blocks. A single-colour shadcn theme generator also exists. [20]
- **Base UI** (already used under shadcn `base-nova`) provides the Dialog/Popover/Select/Tabs primitives the sheets and segmented controls need. [21]
- **Icons:** **Phosphor** (`@phosphor-icons/react`, MIT) ships every icon in six weights including *Duotone* and *Light*, which suits a soft look. [22] **Lucide** (shadcn's default) is the zero-change option. [23]
- **Fonts (all free on Google Fonts, SIL OFL):** Nunito (rounded terminals, "approachable without tipping into childish"), Nunito Sans, Fraunces (soft display serif), Inter / Plus Jakarta Sans. Fraunces + Nunito is a known pairing. [24][25]
- **Accessibility references:** WCAG 2.2 text contrast 4.5:1 (AA) [26], non-text contrast 3:1 for control boundaries and meaningful graphics [27], target size (we keep our own stricter 44 px rule over WCAG's 24 px minimum) [28].

---

## 3. Information architecture: two options

Both options share these renames, because names are half the confusion:

| Today | Proposed | Why |
|---|---|---|
| Plan | **This week** | It is this week, and it is where logging happens. |
| Timeline | **Year** (screen title "Your year") | It is the year. "Timeline" is a developer word. |
| Schedule (hub) + Kids + Subjects | **Set up** (one list) | All of these are "set up the year" jobs, done rarely. |
| Settings inside Schedule | **Settings** behind the family button on Home | Family, theme, account, sign out. |

(Will's words were "schedule" and "logging". Parents rarely say "logging"; "This week" and "Year" say what you'll see. Section 9 asks you to confirm the names.)

### Option A: Home hub, no tab bar

```
            ┌──────── Home ────────┐
            │  logo · Hi DeeDee    │
            │  [ This week  → ]    │  big card: what's due, check-in status
            │  [ Your year  → ]    │  big card: tiny year preview
            │  Set up · Settings   │  quiet rows
            └──────────────────────┘
   This week screen                     Year screen
   ┌ (logo/Home)  [This week|Year] ┐    ┌ (logo/Home)  [This week|Year] ┐
```
- Home is the only start point. Every other screen has the **logo button (top left) to go home** and a **two-part switch "This week | Year" at the top** to jump between logging and schedule.
- Set up and Settings open as full pages with a back arrow.

**Pros:** the most literal match for Will's description; calm, no permanent chrome at the bottom; the timeline gets the full height of the phone, and the edit bar has the bottom of the screen to itself.
**Cons:** going home is a small top-left target instead of a thumb-zone tab; the top switch is a less familiar pattern on phones than a tab bar; on desktop it needs its own layout.

### Option B (recommended): a real Home plus three labelled tabs

```
 ┌──────── Home ────────┐  ┌──── This week ────┐  ┌────── Year ───────┐
 │ logo     (family ⚙)  │  │                   │  │ [Set up]          │
 │ Hi DeeDee            │  │                   │  │                   │
 │ briefing (if any)    │  │                   │  │                   │
 │ [ This week → ]      │  │                   │  │                   │
 │ [ Your year → ]      │  │                   │  │                   │
 │ Set up your year     │  │                   │  │                   │
 ├──────────────────────┤  ├───────────────────┤  ├───────────────────┤
 │ ⌂ Home  ☑ This week  ▤ Year │  (same bar on every main screen)       │
 └──────────────────────┘
```
- Bottom bar with **three tabs, always with icon + label: Home, This week, Year.** Home is the logo screen with the two big choices; the tabs give a one-tap way home and a one-tap switch between logging and schedule from anywhere.
- **Set up** (Children, Subjects, Books and curricula, Days off and breaks, Weekly events) is one list page, reached from a **Set up** button in the Year header and from a row on Home. It opens over the tab bar with a back arrow.
- **Settings** (Family, School days, Appearance: Light/Dark/System, Account, Sign out) is behind the family avatar button at the top right of Home.
- When a timeline bar is selected, the edit bar slides up **over** the tab bar (a sheet) and closes with Done, so the two never compete.
- Desktop (≥ 900 px): the same three items become a slim left sidebar with the logo on top.

**Pros:** the most familiar mobile pattern (HIG and Material both endorse 3 labelled tabs) [13][14]; going home and switching are in the thumb zone; three tabs instead of five removes the "what do these do?" problem; Home still gives the "nice logo and clear choices" Will asked for.
**Cons:** Home and the tabs overlap a little (two ways to reach This week). That is normal for a hub screen and harmless because both lead to the same place. The tab bar costs ~64 px of timeline height (mitigated by hiding it while the edit sheet is open).

**Recommendation: Option B.** It satisfies every item in Will's list with the pattern parents already know from every other app on their phone, and the move from five tabs to three is the single biggest clarity win. Option A is a good fallback if, after seeing the mockups, Will prefers no bar at all.

### Where every current screen goes (Option B)

| Destination | Contains |
|---|---|
| Home | logo, greeting, briefing line (only when needed), This week card, Your year card, first-run checklist (new families), "Set up" row |
| This week | children's work this week, the last-week check-in card (only until done), week arrows |
| Year | the timeline, zoom (Year · Fall · Spring · This month), child filter, "+ Add" and "Set up" in the header, edit sheet |
| Set up | Children · Subjects · Books & curricula · Days off & breaks · Weekly events |
| Settings | Family name · School days & week start · Time zone · Appearance (Light / Dark / System) · Account · Sign out |

---

## 4. Three visual directions

All three use the same layout, the same components and the same subject hues (from the app's existing Okabe-Ito-based palette, so colour-blind distinctness is kept), and all are mocked up with identical markup so only the look changes: [`mockups/soft-paper.html`](mockups/soft-paper.html), [`mockups/pastel-cards.html`](mockups/pastel-cards.html), [`mockups/airy-minimal.html`](mockups/airy-minimal.html). Each shows Home, This week and the Update status sheet in light, then Home and This week in dark, at 390 px.

### Shared: the subject pastels

Eight subject colours, each with a **fill** (the bar), a **strong** tone (check ring, dot, timeline outline) and dark-mode equivalents. Bar text is always the main ink colour, never coloured text.

| Subject colour | Light fill | Light strong | Dark fill | Dark strong |
|---|---|---|---|---|
| Honey | `#FCE7C3` | `#A86A00` | `#4A3A1E` | `#F5C46B` |
| Sky | `#D5ECFA` | `#2A7DB0` | `#1F3A4D` | `#8FCBF0` |
| Mint | `#CDEFE3` | `#1F8063` | `#1C4237` | `#7FD3B6` |
| Butter | `#FAF3C0` | `#8A7A00` | `#46421E` | `#E9DB6A` |
| Blue | `#D6E2F5` | `#3F64A8` | `#22314D` | `#9DB7EA` |
| Coral | `#FADBCB` | `#B4532A` | `#4D2B1E` | `#F2A786` |
| Lilac | `#F1DCEA` | `#9B4F80` | `#452A3B` | `#E0A6CB` |
| Sage | `#E3E6DD` | `#5F6B50` | `#34372F` | `#B6C0A6` |

Checked contrast (WCAG formula, computed): main ink on every light fill is 10.9–12.7:1, secondary text 5.2–6.0:1; light ink on every dark fill 9.0–11.4:1. Strong tones are ≥ 3.6:1 against their fill and ≥ 4.0:1 against the page in light mode, and ≥ 6.3:1 in dark, so the check ring passes the 3:1 non-text rule [27]. Each direction's accent on its own soft tint (selected tab, chips, avatar) is 4.5–5.1:1 in light and 6.1–7.2:1 in dark. Pastel fills against the page are only 1.1–1.2:1, which is fine because the bar's meaning is carried by its text and ring, not its edge; but **subject identity should never rely on colour alone**: bars keep their names, and each subject gets an optional small icon (book, calculator, globe, leaf, music note…).

### Direction 1: Soft Paper

*A well-loved notebook. Warm, bookish, quiet. The closest to a Charlotte Mason / classical family's own shelf.*

- **Palette.** Light: page `#FAF6EE` (cream), card `#FFFDF8`, ink `#2F2A24` (13.2:1), secondary `#6E655A` (5.3:1), accent "fern" `#3F6B5C` (white text on it 6.1:1), hairlines `#E8E0D2`. Dark: page `#1C1A17` (warm charcoal), card `#26231F`, ink `#F1EBE1`, secondary `#B3A99B` (7.5:1), accent `#9CCBB8`. Pastels sit slightly muted on cream; in dark they read like coloured pencil on kraft paper.
- **Type.** **Fraunces** (soft optical serif, weights 500–600, "SOFT" axis up) for screen titles and greeting; **Nunito Sans** for everything else. [24]
- **Shape.** Radius 14 px cards, 12 px bars, 999 px for chips. Thin 1 px warm hairlines instead of shadows.
- **Elevation.** Almost none: cards are separated by hairlines and a faint paper tint; sheets get one soft shadow `0 -8px 24px rgb(60 40 20 / .10)`.
- **Icons.** Phosphor **Light** weight (1.5 px strokes, hand-drawn feel). [22]
- **Spacing.** 4 px base; 20 px page gutters, 16 px between cards; generous 28 px above section titles (reads like a book's chapter breaks).
- **Motion.** Slow and gentle (200–260 ms ease-out), a check that "inks in".
- **Bars.** This Week: cream-tinted pastel bars with a thin strong-colour left rule. Timeline: bars with rounded ends and a 1 px strong outline at 40 % opacity; the today line is a dotted fern line, not red.
- **Risk.** Serif headings can feel "old-fashioned" if overdone; needs restraint. Cream backgrounds dull the pastels a little.

### Direction 2: Pastel Cards (recommended)

*Warm and friendly, like Finch or Tiimo, but grown-up. Big rounded white cards floating on a soft warm page; the pastel bars are the colour.*

- **Palette.** Light: page `#FBF8F4` (warm off-white), card `#FFFFFF`, ink `#2B2935` (13.5:1), secondary `#6A6575` (5.3:1 on page, 5.6:1 on card), accent "lavender" `#6B5BB5` (white text 5.5:1; as text on page 5.2:1), soft accent tint `#EEEAFB`, hairline `#EFEAE3`. Dark: page `#17161C`, card `#22212A`, raised `#2C2B35`, ink `#F2EFF6` (15.8:1), secondary `#A9A4B5` (7.4:1), accent `#B9AEF0` (dark text on it 8.9:1). The lavender accent is used only for the main button, the selected tab and the selection ring, so it never competes with subject colours.
- **Type.** **Nunito** (rounded terminals) 700–800 for titles and numbers that matter; **Nunito Sans** 400–600 for body and UI. Sizes: 28 / 20 / 17 / 15 / 13 px; line-height 1.4. [24][25]
- **Shape.** Radius 24 px cards and sheets, 16 px bars and fields, 999 px buttons, chips and the check button. Nothing has a sharp corner.
- **Elevation.** Two levels only. Card: `0 1px 2px rgb(43 41 53 / .04), 0 4px 16px rgb(43 41 53 / .06)`. Sheet: `0 -8px 32px rgb(43 41 53 / .12)`. Dark mode drops shadows and uses lighter surfaces (`#22212A`, `#2C2B35`) for elevation.
- **Icons.** Phosphor **Duotone** for the tab bar and Home cards (the duotone fill takes the accent tint), Phosphor Regular elsewhere. [22]
- **Spacing.** 4 px base, 8 px rhythm: 20 px gutters, 12 px between bars, 16 px inside cards, 24 px between sections.
- **Motion.** 180 ms ease-out for sheets and taps; the check button fills with the subject's strong colour and gives a small 1.0 → 1.12 → 1.0 pop; the bar then softens to 55 % opacity with a strikethrough-free "Done" label. All motion is off under `prefers-reduced-motion`.
- **Bars.** This Week: 64 px tall pastel bars, 16 px radius, title on line one, amount ("pages 120–150") on line two, round 44 px check on the right. Timeline: fully rounded bars in the same fills; thickness = daily workload, as now; selected bar gets a 2 px lavender ring and a soft shadow; today line is a lavender pill marker at the top with a 1 px line.
- **Risk.** If every element becomes a card the screen gets busy; the rule is **one card level only** (no cards in cards).

### Direction 3: Airy Minimal

*Things 3 / Notion Calendar. Near-white, lots of air, hairlines, almost no decoration. The calmest and the most "pro".*

- **Palette.** Light: page `#FAFAFA`, surfaces `#FFFFFF`, ink `#18181B` (17:1), secondary `#63636B` (5.7:1), accent `#3D5AFE` (white text 5.1:1), hairline `#ECECEE`. Dark: page `#111113`, surface `#1A1A1D`, ink `#F4F4F5`, secondary `#A1A1AA` (7.4:1), accent `#8C9EFF`. Pastels are the only colour on screen.
- **Type.** **Plus Jakarta Sans** for headings (600), **Inter** for UI (400/500), tight tracking on titles.
- **Shape.** Radius 12 px cards, 10 px bars, 999 px check buttons.
- **Elevation.** None in content (hairline dividers and grouped lists, iOS-style); only sheets get a shadow.
- **Icons.** **Lucide** at 1.75 px stroke (shadcn default, no new dependency). [23]
- **Spacing.** 4 px base, very generous: 24 px gutters, 32 px between sections, list rows 56 px.
- **Motion.** Quick and crisp (140 ms), no bounce.
- **Bars.** This Week: slimmer 56 px pastel bars in a single grouped list. Timeline: flatter bars, no outline, grey grid nearly invisible.
- **Risk.** Can feel cool and "productivity-app" rather than warm and friendly, which is the opposite of half of Will's brief.

### Comparison

| | Soft Paper | **Pastel Cards** | Airy Minimal |
|---|---|---|---|
| Calm and airy | ●●○ | ●●○ | ●●● |
| Soft, rounded, warm, friendly | ●●○ | ●●● | ●○○ |
| Pastels shine | ●●○ (cream dulls them) | ●●● | ●●● |
| Clean and tidy | ●●○ | ●●○ | ●●● |
| Fits the audience (CM / classical moms) | ●●● | ●●● | ●●○ |
| Effort on our stack | medium (serif tuning) | low–medium | lowest |

---

## 5. Key screens in the recommended direction (Pastel Cards, Option B)

See `mockups/pastel-cards.html` for Home and This Week in light and dark, plus the Update sheet.

### Home

Top to bottom, on a phone:
1. **Header row:** the logo (a soft rounded mark: an open book whose pages form a sunrise, in lavender + honey) and "Homeschool Hub" wordmark in Nunito; family avatar button on the right (opens Settings).
2. **Greeting:** "Good morning, DeeDee" and the date ("Saturday, 31 October · Week 9 of 36").
3. **Briefing pill** only when something needs attention: "Latin will finish about 3 weeks late · Review". No pill when all is well, never an empty state that says "nothing to report".
4. **Card: This week.** Icon, title, one-line summary ("Frank 12 left · Margaret 9 left"), a thin progress track per child, and, until it is done, a small line "Last week needs a quick check" with a lavender dot. Whole card is the button.
5. **Card: Your year.** A miniature of the timeline (just the coloured stripes, 48 px tall) with today's marker, and "On track to finish 21 May". Whole card is the button.
6. **Row: Set up** (children, subjects, books, breaks), quiet, with a chevron.
7. Tab bar.

**First run (new family):** cards 4 and 5 are replaced by a single **"Let's set up your year"** card with four steps, each a row with a round number that becomes a check:
1. *Add your children* (just names; colour is assigned).
2. *Pick your subjects* — a grid of starter chips (Reading, Math, History, Science, Nature study, Latin, Music, Art, Bible, Handwriting…) that add with one tap; "Add your own" at the end. This removes the empty-dropdown dead end.
3. *Add your first book or curriculum* — title, subject (from step 2), who, "about how many pages / lessons", start, and "finish by". The timeline preview appears as soon as one exists.
4. *Choose your breaks* — the calendar templates ("36 weeks", "Sabbath schedule 6 on / 1 off", "Three terms", US holidays) as tappable cards with a mini calendar preview; "Skip for now".
Each step can be skipped; progress is saved; the card disappears when all four are done (or "Hide this").

### This Week

- **Header:** "This week" title, "26 Oct – 1 Nov" with soft round ‹ › buttons, child switch as a pill segmented control (**Frank · Margaret · Both**), remembered per device.
- **Last-week check-in card** (top, only until done, and only for the most recent unchecked week): "Last week (19–25 Oct)" and one question: **"Did everything get done?"** Two buttons: **"Yes, all done"** (primary) and **"Not quite"**. *Not quite* expands the same list of last week's bars, each with the Completed / Update pattern, all pre-checked as done; the parent only touches the ones that weren't. "Save" at the bottom. No chips, no sliders, no number boxes on the rows.
- **This week's work:** one pastel bar per assignment, grouped by child when "Both" is chosen, sorted by subject:
  - line 1: title ("Treasure Island"), line 2: amount in parent units ("pages 120–150" / "lessons 31–35" / "about 90 min").
  - right: a 44 px round **check button** ("Completed"). Tap → it fills with the subject's strong colour, the bar softens, a toast says "Treasure Island marked done · Undo".
  - tap anywhere else on the bar → **Update sheet**.
- **Update sheet** (bottom sheet, 24 px top radius):
  - Title "Treasure Island", subtitle "Frank · pages 120–150 this week".
  - **"How did it go?"** three large choice pills: *As planned* · *Got ahead* · *Fell behind*.
  - If ahead/behind: **"They got to page [ 142 ]"** — one number field with − / + steppers, unit word matching the assignment.
  - If behind: **"What about the end date?"** two radio cards: *Keep 6 Nov — the rest of the weeks get a little heavier* / *Move it to 11 Nov — keep the same pace*. (Same for ahead: *Finish early on 2 Nov* / *Keep 6 Nov and go lighter*.) The dates come from the engine, so the parent sees the consequence before choosing.
  - Primary **Save**; quiet **Cancel**.
- **Empty states:** no assignments this week → a calm illustration-free card "Nothing scheduled this week" + "Add a book or curriculum" (if none exist) or "It's a break week — enjoy it" (if a break). No children → the first-run card from Home.
- **Never shown:** effort points, decimals ("207.21"), engine versions, tables.

### Year (timeline) with its edit bar

- **Header:** "Your year" title; on the right **+ Add** (primary, small) and **Set up** (quiet). Below: zoom as a pill segmented control (Year · Fall · Spring · This month) and child filter chips (All · Frank · Margaret).
- **All subjects strip:** a soft grey-lavender area chart pinned at the top, labelled "Daily load" with a tiny legend "lighter ← → heavier" (no numbers). Heavy weeks show as taller.
- **Lanes:** subject name with its colour dot and icon as a small heading above each lane; child name as a lighter sub-label. Bars are rounded pastel shapes with the name inside (or above when thin, as now). Breaks are soft hatched columns with their name at the top ("Christmas"). Today is a lavender line with a pill "Today" at the top.
- **Edit sheet** (when a bar is tapped; slides over the tab bar):
  - "Aesop's Fables" · "Literature · Frank" and a close ✕.
  - Two date fields side by side: **Starts 31 Aug** · **Ends 16 Oct** (custom date picker in a popover, not the native input).
  - Buttons row: **Copy** · **More ⋯** (More: Change children, Change days of the week, Edit details, Delete).
  - A one-line consequence when dates change: "About 4 pages a day → 3 pages a day". **Done** closes.
- **Empty / first run:** ghost lanes for the family's subjects (pale outlines) with one card in the middle: "Your year will appear here. Add a book or curriculum to see it." + **Add**. If there are no subjects yet, the card points to Set up step 2 instead.

### One Setup list: Subjects

- Back arrow "Set up", title "Subjects", **+ Add** at the top right.
- Each subject is a 64 px row in a single rounded card: colour swatch + icon on the left, name, a secondary line in plain words ("Mon–Fri · about 30 min a day"), chevron. Tapping opens an edit sheet: Name, Colour (8 swatches + icon picker), Usual days (seven round day toggles), "About how long does a day of this take?" (15 / 30 / 45 / 60 min + Other).
- Archived subjects are behind "Show archived (2)" at the bottom, not a checkbox at the top.
- **Empty:** the starter-chip grid from first-run step 2 ("Tap to add the subjects you teach"), not a dashed "No subjects yet" box.

### Components the design system needs (one set, used everywhere)

Button (primary / quiet / danger), round check button, pill segmented control, chip, field (text / number with steppers / date popover), card, list row, bottom sheet, toast with Undo, tab bar, briefing pill, subject bar (This Week) and timeline bar. All built on the existing shadcn/Base UI primitives with the new tokens.

---

## 6. Light and dark mode

- Default **System** (`prefers-color-scheme`); Settings → Appearance offers **Light / Dark / System** as a 3-part pill, stored on the device (as ROADMAP Sprint 8 already says).
- Implement as shadcn does: tokens on `:root`, overrides on `.dark` (set on `<html>` from the preference), Tailwind v4 `@custom-variant dark`. [18] Remove `color-scheme: light` from `styles.css` and set `color-scheme: light dark`.
- Pastels get their dark fills (table above): deep, low-chroma versions with light text, never the light pastel on a dark page (which glows and fails contrast with white text).
- Run the existing contrast and tap-target scripts in both themes.

---

## 7. Accessibility checklist

- Text contrast ≥ 4.5:1 in both themes (all values above checked); large headings ≥ 3:1.
- Check ring, focus ring, selected tab and chart marks ≥ 3:1 against their background. [27]
- Every tap target ≥ 44 × 44 px (the round check, steppers, ‹ › arrows, tab bar items, chips).
- Focus ring: 3 px accent ring with 2 px offset (replaces the current amber outline, same behaviour).
- Never colour alone: bar names always visible; optional subject icons; "Done" state uses a check icon, not just a colour change.
- `prefers-reduced-motion`: no pop, no slide; instant state change.
- Inputs stay ≥ 16 px to avoid iOS zoom (already a rule).

---

## 8. Recommendation and suggested order of work

**Recommend: Option B navigation + Direction 2 "Pastel Cards", with Phosphor icons, Nunito / Nunito Sans, and the shared subject pastel table.**

Why: Will asked for "soft, rounded shapes of a warm and friendly app", "pastel colours", and "a home page with a nice logo". Pastel Cards is the only direction that hits all three without compromise, it puts the coloured bars Will already likes at the centre, and it maps directly onto shadcn tokens (`--radius: 1.5rem`, a lavender `--primary`, warm `--background`), so it is mostly a token and component change rather than a rewrite. From Airy Minimal it borrows the discipline (one card level, few controls, lots of air); from Soft Paper it borrows the warm off-white page.

Suggested order (fits Sprint 8 as planned):
1. Tokens (light + dark) and fonts; tune in tweakcn; export to `tokens.css`.
2. Shell: Home, 3-tab bar, Set up list, Settings with Appearance.
3. This Week: subject bar + check + Update sheet; check-in card as one question.
4. Timeline: restyle bars, today marker, edit sheet with Start/End + Copy + More.
5. Setup screens and forms (custom date popover, steppers, starter subject chips).
6. First-run checklist and empty states.
7. Contrast + tap-target checks in both themes; before/after screenshots.

---

## 9. Decisions for Will and DeeDee

1. **Navigation:** Option B (Home + 3 tabs) or Option A (Home hub, no tab bar, top switch)?
2. **Look:** Pastel Cards (recommended), Soft Paper, or Airy Minimal? Open the three mockups side by side.
3. **Names:** "This week" and "Year" (or "Your year")? Alternatives: "Week" / "Year", "Log" / "Plan", "Today & this week" / "The year".
4. **Accent colour** for Pastel Cards: lavender (`#6B5BB5`, mocked), or fern green, or a dusty blue?
5. **Logo:** OK to commission/draw a simple mark (book + sunrise idea in the mockup), or does the family have one in mind?
6. **This Week default view:** one child at a time (switch) or all children stacked?
7. **Subject icons:** add an optional icon per subject (helps colour-blind users and looks friendly), yes or no?
8. **Check-in timing:** show the last-week card until it's answered, or only Monday–Wednesday then quietly assume "as planned"?
9. **Starter subjects list** for first run: which ~12 subjects should be offered (we can tailor to Charlotte Mason: Nature study, Picture study, Composer study, Recitation, Handicrafts…)?

---

## Sources

1. Tiimo, "A visual planner built for real life": https://tiimoapp.com/product/visual-planning
2. Tiimo, "Finalist, 2025 App Store Awards": https://www.tiimoapp.com/resource-hub/tiimo-finalist-2025-app-store-awards
3. Structured, visual planning: https://structured.app/visual-planning
4. Dave Swift, "Structured App Review": https://daveswift.com/structured/
5. MakerStack, "Structured Review (2026)": https://makerstack.co/reviews/structured-review/
6. Cultured Code, Things: https://culturedcode.com/things/
7. Pratt IxD, "Design Critique: Finch (iOS App)" (2025): https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/
8. Pratt IxD, "Design Critique: Finch Self-Care Pet" (2026): https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/
9. Screens Design, "Finch app onboarding design": https://screensdesign.com/articles/finch-app-onboarding-design/
10. HomeschoolPicks, "Homeschool Planning Apps Review": https://homeschoolpicks.com/how-to-homeschool/homeschool-planning-apps/
11. Homeschool Panda on the App Store: https://apps.apple.com/app/id1470263093
12. WorldMetrics, homeschool planner software roundup: https://worldmetrics.org/best/homeschool-planner-software/
13. Apple Human Interface Guidelines, Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
14. Material Design, Bottom navigation: https://material.io/components/bottom-navigation
15. Nielsen Norman Group, "Icon Usability" (A. Harley): https://www.nngroup.com/articles/icon-usability/
16. T. Calabro, "Every icon needs a label": https://trevorcalabro.substack.com/p/every-icon-needs-a-label
17. shadcn/ui, Theming: https://ui.shadcn.com/docs/theming
18. shadcn/ui, Dark mode: https://ui.shadcn.com/docs/dark-mode
19. tweakcn (via Tailkits): https://tailkits.com/tools/tweakcn/
20. DesignRevision, shadcn theme generator: https://designrevision.com/tools/shadcn-theme-generator
21. Base UI: https://base-ui.com
22. Phosphor Icons (`@phosphor-icons/react`): https://phosphoricons.com and https://www.npmjs.com/package/phosphor-react (deprecation note pointing to the new package)
23. Lucide icons: https://lucide.dev
24. Font Alternatives, "Fraunces + Nunito": https://fontalternatives.com/pairings/fraunces-and-nunito/
25. Google Fonts, Nunito: https://fonts.google.com/specimen/Nunito
26. W3C, Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
27. W3C, Understanding SC 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
28. W3C, Understanding SC 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Notes on evidence: the Tiimo, Things and Finch descriptions come partly from the companies' own pages and from informal critiques; the "dated interface" verdict on Homeschool Planet is from one comparison site. Apple/Material/W3C guidance is primary. Contrast ratios in this document were computed with the WCAG relative-luminance formula, not estimated.
