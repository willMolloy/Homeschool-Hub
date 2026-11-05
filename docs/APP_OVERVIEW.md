# Homeschool Hub: app overview

Start here, then read [ROADMAP.md](ROADMAP.md) and [HOW_WE_WORK.md](HOW_WE_WORK.md).

## The product

Homeschool Hub is a **steering tool for the homeschool year**: a parent sees the shape of the whole year in seconds, corrects course when life happens, and gets their records with no extra work. It is a planning tool, not a daily to-do app; nothing in the core needs daily input. Around that core, optional modules (off by default) make it a full homeschool hub. [ROADMAP.md](ROADMAP.md) has the plan, the core checklist and the module rules.

The planned business model is freemium: Free covers one child, and the Family plan ($5.99/mo or $49/yr) adds unlimited children (`spec/SPEC.md`, "Free vs premium"). Billing is not built and waits until after the friends beta; friends get every Family feature free.

**The core is the year timeline** (`/timeline`):
- One lane per subject, with sub-lanes per child and sub-rows so bars never overlap.
- Semi-transparent bars. A bar's thickness shows daily effort: units per day × the assignment's effort weight per unit (1 point ≈ 2 minutes). How parents enter effort is being reworked (ROADMAP.md, "Effort").
- An "All subjects" bar pinned above the lanes shows the summed load.
- Zoom presets: Year / Fall / Spring / This month.
- A child filter (All children, or one).
- Tap a bar to edit it in the edit bar at the bottom, or drag it to change its dates.
- "+ Add assignment" in the timeline header.

**Supporting features:**
- **Schedule · Week**: this week's plan as pastel bars. A bar opens the week adjustment, and "Update status" ("They got to p. 138", keep or move the end date) corrects the plan's pace. The plan assumes scheduled work was done unless the parent says otherwise; there is no weekly check-in card (S9-02). **Bars | Days** (Sprint 16, a toggle under the week arrows; Bars is the default and the choice is remembered on the device): **Days** shows every school day of the week in one view, with no moving between days. On a phone the days stack in one scroll; from 840 px they are equal columns. Each day has its date, a small load bar (no numbers) and one line per assignment: subject icon, title and that day's range in whole units, the same ranges as the printed weekly sheet (it reads the sheet's own model); minutes work shows the title only. A break or day off is one quiet line, a day with nothing is "Nothing planned", and under All children each line carries the child's initial in their colour. A line opens what its bar opens; a viewer gets Days read-only.
- **First run** (Sprint 11): a new family's first sign-in opens `/welcome`, a setup flow of one question per screen with a progress bar and Back: (1) the family's name and week start, (2) the children (the only required step), (3) school days, (4) the school year's first and last day and its shape (Fall and Spring, three terms, 36 weeks, 6 weeks on 1 off, or "I'll set this later"), (5) breaks (tick US holidays, add your own, "I'll get back to you on this" or Skip), (6) subjects from the starter list; then "You're all set". "Finish later" (from step 3) goes Home and the flow returns at the next sign-in, at the same step. Steps put off leave a reminder on Home ("Set your school year", "Add your breaks") that reopens that step on its own; every skipped step stays editable in Set up. Families that existed before it never see it. There is no first-assignment step and no prompt for one afterwards. Three one-time hints on Schedule's Year (the bars' thickness, the first bar opened, the subject icons) show one at a time with "Got it", saved on the family; "Show tips again" is in Family settings.
- **"Did Frank finish…?" and the needs-you dot** (Sprint 12): when an assignment's end date passes (in the family's time zone), Home opens with a clear card above everything else (spanning both panes on wide screens): "Did Frank finish Treasure Island?" with **Yes, finished**, **Not yet** and **We stopped** (several at once read "3 assignments ended" and open one list). **Yes, finished** saves at once with the end date (one tap; Undo is on the bar, and **Change** edits the day later); We stopped and Not yet show their day first: We stopped starts on today, Not yet on a week from today (it moves the end like any edit, and the question returns after the new end). Only the parent's answer ends an assignment; nothing is assumed, and it is a schedule fact, not a log entry (Records is unchanged). A finished assignment keeps its bar on Year, drawn calmer with a check after the name, and a book finished before its planned end ends the bar that day, so the weeks after it are lighter; a stopped one ends at the day it stopped, muted and labelled "Stopped"; neither gets late, heavy-week or "no school days" warnings or appears in Week after it ended. Its edit sheet (and the Assignments form) says "Finished Nov 2" or "Stopped Oct 30" with **Change** (the three choices, or **Not ended** to open it again). While a question waits, Home on the bottom bar and the rail carries a small fern dot (named "Home, 1 thing needs you"); only questions light it, never a late line or heavy week. Every answer is undoable.
- **Printable sheets** (Sprint 13): **Print sheets** (a printer button at the end of Schedule's title row on Week) opens a sheet to pick **Week** or **Day** and **All children** or any mix. Print opens a print-only page (`/print/week` or `/print/day`, no bar or rail, always white) with one page per child: the child's name and the week ("Week of Nov 2, 2026") or day ("Tuesday, Nov 3"), a block per subject with each assignment's title and one row per school day with that day's range ("Mon · pages 120–126", the same ranges as the Week bars) and a paper checkbox, and a notes area. A thin rule in the subject's colour, black on white; days an assignment doesn't run, days off and breaks are left out (a break reads once, "Thanksgiving break"); a day with nothing reads "Nothing planned for Tuesday". No minutes, no effort words, no family overview page. Fits US Letter and A4; a busy week flows to a second page for that child.
- **Term in review** (Sprint 13): **Term in review** in Records (after Export) opens a full-screen page (`/records/review`) with the range (Fall, Spring, Year, the family's own terms) and the child (or All children, one card each). The card is a 4:5 keepsake image in the child's and subjects' own colours: the child's name and term, then only what is real and tracked: school days, assignments marked finished, books read, time by subject (the exact typed time), with lists that end in "and N more" instead of shrinking. No favourite book, no parent note, no estimates; the small "Homeschool Hub" mark. **Save image** makes a 1080 x 1350 PNG on the device (the share sheet on a phone, a download on a computer; nothing is uploaded and there is no link) and **Print** prints one card per page; both are always the light version, even in dark mode.
- **Accounts** (Sprint 14): invite-only, no email. Each **parent** has their own login (name, email, password) to one family, with equal rights; every family that existed before kept its login as its first parent. **A new family** starts from a link Will or DeeDee make with the command `create-family-invite` and share by hand: `/join/<token>` asks for the parent's name, email and password (8 characters), makes the family, signs them in and opens the first-run flow. **A second parent** is invited by the family: Family settings, **Parents**, "Invite another parent" shows a link once (copy, or the phone's share sheet) that adds a parent to *that* family and signs them in, with no setup flow; open invites are listed with "Cancel invite"; there is no removing a parent in the app. Links are single use and last 7 days, are stored only as a SHA-256 hash, and a link that does not work, for any reason, shows one plain message ("This invite link has expired or was already used. Ask the person who sent it for a new one.") and never says which. Joining is throttled. A sign-in lasts 30 days from its last use; signing out ends only that device; the family menu says "Signed in as {name}". Passwords are reset by hand with `set-parent-login`. Every query is scoped by the signed-in family, so no parent, and no invite, can reach another family's data.
- **View-only access** (Sprint 15): a parent shares the family, or a **co-op** shares its own account, with people who should only look. Family settings, **View-only access**: "Create a sign-up link" (an optional label such as "Co-op"; as many as you like) shows a link once, single use, ending in 7 days if unused, stored only as a hash; the person signs up (or, if they already have a login, signs in on the same page, or joins with one tap when signed in) and becomes a **viewer** of that account. The card lists open links (Cancel) and viewers (name, email, joined, **Remove**); access lasts until a parent removes it, and a viewer can **Leave** from their Account menu. A viewer sees **Schedule** (Week and Year) and **Records** only, can change the week, zoom, range and child, can print sheets, export CSV and save or print Term in review, and nothing else: a bar opens a read-only detail, and no add, edit, log, answer, undo or settings control is drawn. The server enforces it: viewers may call only an allow-list of read routes (everything else, and every write, is 403), their answers carry no parents' emails, invites, view links, other viewers or setup state, and their responses are marked noindex, no-referrer and no-store. **One login can belong to several accounts** (a parent of their own family and a viewer of a co-op, say): sign-in opens the account used last, and the family menu names the current account ("View only" in a viewed one) with "Switch to {other}"; every switch re-checks membership. A co-op is simply its own account set up like a family; co-op classes inside each family's own plan stay a later idea.
- **Undo for Add several and CSV import** (Sprint 14): both leave one undo entry ("Added 6 assignments", "Imported 24 assignments"), like the copy panels; Undo deletes exactly the created assignments and is refused once any has a check-in, a completion answer or a log entry. CSV import takes up to 200 rows, sent in chunks of 50 that join one entry.
- **Recurring events and days off** (built in Sprint 2a).
- **Records** (the second main job, Sprint 9): log setup (template styles: hours by subject, core and non-core hours, days attended, days and hours, detailed log; never a state), log entries the parent types (a day or a run of days, one or several children stored as one entry each, hours and minutes, school-day switch on by default, never prefilled, never changing the plan), totals for a range (This week, Year, Fall, Spring, the family's terms, custom dates) and an export (CSV with chosen columns and dates, and a printable page per child). Sprint 16: the **School days** card is each child's own count ("Frank 42 · Margaret 40" under All children; never a union), **Books finished** is the number of reading assignments (pages or chapters) the parent marked finished in the range (tap it for titles and dates; Term in review and the Totals CSV use the same definition), and the titles typed in log entries are a list, "Books mentioned in your log". In the log form, the books field suggests titles from the family's logs and assignments as you type, with the child's last five titles as one-tap chips; nothing is ever pre-filled. Daily check-off logging stays a later optional module (ROADMAP.md, "Optional modules").

## Design principles

**Where we're heading:** [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) distils Will's reviews of 2026-10-31 (one home and two jobs, one way to do each thing, the parent's words never the engine's numbers, no dead ends, a modern calm look) and sets the screen tests every ticket must pass.


- Very simple and calm, never overwhelming. Show only what's essential: no extra helper text, badges or borders.
- Progressive disclosure with sensible defaults. Controls appear only when they're relevant; for example, the edit controls exist only once a bar is selected.
- A pastel, colour-blind-safe default palette, based on Okabe–Ito (T-01b). The "vivid" palette is opt-in.
- Maximum horizontal room: labels go above the lanes, not in a column, and the timeline runs edge to edge on phones. Tap targets are at least 44 px.

Every ticket has an acceptance criterion that checks nothing non-essential is shown (`docs/tickets/timeline/README.md`).

## Timeline label rules

- Each bar piece is named inside the bar, pinned left, and cut with "…" to fit (T-06, T-11, T-11c).
- A piece too thin for an inside name (under 13 px) gets its name above it instead. That name is left-aligned, cut to the piece's width, and its lowest letters end about 2 px above the bar.
- Only rows with such a name get extra space, and only as much as the name needs (T-11d, T-11e).

## Product rules

- **Schedule first.** Planning comes before logging. Logging is optional and typed by the parent: it is never prefilled from the plan and never moves it, and the plan never reads it (S2b-18, S2b-19, S9-07).
- **No tedious entry.** A feature that needs parents to type a lot (lesson titles, required daily check-offs) stays out of the core.
- **The parent pilot gate was dropped** on 2026-10-28. Validation now runs through DeeDee's own use, then a friends beta with agreed go-public signals (ROADMAP.md). `docs/pilot/` is kept for history.
- **Logging is a record-keeping helper, never a compliance claim.** No copy may claim the app meets a state's requirements; Records and every export say only: "Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules."
- **Payments and billing come only after live testing.**

## Tech stack

TypeScript everywhere, Node 20, npm workspaces.

| Part | What |
|---|---|
| `packages/engine` | `@hh/engine`: a pure, versioned scheduling engine with no I/O and no `Date` objects. The version is `ENGINE_VERSION` in `src/version.ts`. |
| `apps/api` | `@hh/api`: Fastify API (auth, roster, schedule data, check-ins, `/api/plan`). Uses zod. |
| `apps/web` | `@hh/web`: a Vite + React PWA with React Router 7, and Tailwind v4 without Preflight. shadcn/ui (`base-nova`, on Base UI) is used for the timeline. The timeline itself is a hand-drawn SVG in `src/features/timeline/`. |
| `db/` | Postgres 16 (Docker Compose): SQL migrations, runner, seed, demo family (`db/demo-family.ts`) and schema validation. |
| `scripts/` | `check.sh` (the full gate) and browser smoke scripts. |
| `docs/` | Tickets, progress, reviews and these guides. |
| CI | GitHub Actions, `.github/workflows/ci.yml`. |

Tests use Vitest. The engine is also tested under 7 time zones (`npm run test:tz`).

## Links

- Spec: [docs/spec/SPEC.md](spec/SPEC.md). Since 2026-10-30 the repo is the single source of truth for the spec and research; the shared Pages they were copied from are historical (`docs/spec/README.md`).
- Timeline Tools research (the timeline tickets call it "the Timeline Tools Page"): [docs/spec/timeline-tools-research.md](spec/timeline-tools-research.md).
- Competitor and pricing research: [docs/spec/competitor-and-pricing-research.md](spec/competitor-and-pricing-research.md).
- [ROADMAP.md](ROADMAP.md): what's done, what's next, and the open decisions.
- [HOW_WE_WORK.md](HOW_WE_WORK.md): roles, ticket format, local dev, rules.
- [REVIEW-GUIDE.md](REVIEW-GUIDE.md): run it and review it in about 5 minutes.
- [tickets/README.md](tickets/README.md) and [tickets/timeline/README.md](tickets/timeline/README.md): tickets by sprint.
- [progress/timeline.md](progress/timeline.md): the latest progress and decisions.
- [reviews/](reviews/): developer and tester reviews and verifications.
