# Roadmap

DeeDee and Will co-own the product. DeeDee approves what gets built. This plan was agreed on 2026-10-30 and replaces the earlier MVP plan of the same day. Anything outside it still needs approval before it starts.

## What we're building

**A steering tool for the homeschool year.** A parent sees the shape of the whole year in seconds, corrects course when life happens, and gets their records with no extra work. It is a planning tool parents steer with, not a daily to-do app they have to feed. Nothing in the core needs daily input or tedious data entry.

**Core plus optional modules.**
- **The core is the differentiator.** It's always on, and it must be excellent before anyone else uses the app: the year map, steering, effort, fast setup.
- **Optional modules make it a full homeschool hub.** They're off by default and switched on in settings. Every module follows three rules:
  1. It reads from the plan and needs no daily input, so it works from day one.
  2. It adds nothing to the core screens until it is switched on.
  3. It lives behind its own boundary (its own feature folder and API routes), so it can be cut or redesigned without touching the engine.

**The bar for friends:** a polished, complete core, not a rough demo. Friends' feedback should be about the margins, not about missing basics.

## The plan, in order

**Blocking the core now:** decisions C1 (which week edit wins), C2 (how far undo goes) and C3 (the effort proposal). See "Open decisions for DeeDee".

| # | Phase | Target | Done when |
|---|---|---|---|
| 1 | **Build the core** (checklist below), plus the code-only hosting fixes | Mid-December 2026 | Every core box is checked, locally, and the hardening fixes are in |
| 2 | **Private hosting** for DeeDee only (section below) | December 2026 | DeeDee can use it on her phone; one backup restore tested |
| 3 | **DeeDee's real spring term** | From January 2027 | DeeDee runs real weeks from it; Will and DeeDee hold a 15-minute review each week and fix what blocks her |
| 4 | **Friends beta** | From about March 2027 | The tester has verified the timeline sprint first; then 3–6 invited families, ideally the Charlotte Mason friends; the go-public signals are measured at week 6 |
| 5 | **Decide on going public** | After the friends beta | The go-public signals below are met, or we decide what to change |

**The dates are targets, not promises.** At 6–8 hours a week the core is doable by mid-December, but it holds the effort rework, undo, week adjust, the event preview, bulk-add, copy and CSV import. If it slips, phase 3 moves with it; the core isn't cut to hit January.

**Beta demos before January.** From the end of November, show finished core pieces to DeeDee and, if she chooses, a friend or two. These are short guided demos on the demo family, not real use, run locally or over screen share until phase 2. They catch confusion early without asking anyone to rely on the app.

**Budget:** a few hours a week and low running costs (under about $20 a month) until the app shows promise.

**Agents contact no one** (HOW_WE_WORK.md, "Rules"). DeeDee invites friends herself.

### Go-public signals

Agreed now, so they don't drift later. We consider going public only if:
- DeeDee uses it for the whole spring term and wants it for next year;
- at least half the friend families still open it weekly at week 6, without reminders;
- at least one friend asks to bring someone else;
- most friends say yes to "Would you pay $49 for next school year?"

## 1. Core checklist

Status as of 2026-10-30. "Built" means a sprint delivered it; the end-to-end pass in the last row confirms it.

### The map
- [x] Year timeline: lanes per subject and child, thickness, All subjects bar, zoom presets, child filter (timeline T-01 to T-11e).
- [x] Tap a bar to edit it, drag it to change dates, add an assignment from the timeline (T-07e, T-08, T-10).
- [ ] **Phone finishing pass:** a compact edit bar and 44 px tap targets on every core screen.

### Steering
- [x] This Week, and the optional "How did last week go?" check-in for finished weeks (S2b, T-03b, T-09).
- [x] Days off for the whole family or one child (for example a sick day). Bars reflow and keep their end dates (S2a).
- [ ] **Adjust the current or a coming week:** change this week's amount, then keep the end date or push it back. The `week_override` table exists; the API and UI wait for decision C1.
- [ ] **Undo, and reset an assignment to how it was.** How far undo goes is decision C2.
- [ ] **Preview before saving an event:** for example "Treasure Island goes from 5 to 6 pages a day". Events already have skip, lighter and normal rules per subject (S2a); the preview is missing.

### Effort (proposed, decision C3)
Thickness shows effort: how much work a day of this takes. Today the parent picks a weight per unit (Light, Normal, Heavy or Very heavy). Parents can't easily say how heavy one page is, but they can say how long a day takes. The proposal:
- [ ] **Ask in time, store as effort.** When adding an assignment: "How many pages a day?" and "About how long will that take?" (15, 30, 45 or 60 minutes, or custom). The app stores the effort per unit (minutes per day ÷ units per day ÷ 2, since 1 point = 2 minutes). From then on the bar behaves as now: pull the end date in and it gets thicker.
- [ ] **"Feels heavier / lighter" on the edit bar.** One tap nudges the effort by about 25% and the bar redraws. This is the main way to correct a bad first guess, and it is steering in itself.
- [ ] **Corrections carry forward.** A corrected effort becomes the default for that child's next assignment in that subject (building on the subject default and learned usual weight, S2b-08 and S2b-32).
- Optional extra, not required: one dismissible prompt about two weeks into an assignment ("Is Treasure Island still about 30 minutes a day?").

Why not correct effort from the check-in: the check-in records how far a child got (pace), not how long it took, so it can't fix effort. It stays an optional way to steer the pace.

### Fast setup
- [ ] **Bulk-add** several assignments in one go.
- [ ] **Copy an assignment**, including to another child (for example a younger sibling).
- [ ] **CSV import** of assignments.

### Accounts
- [ ] **Invite-only accounts.** An invite link creates a family account. Password resets are done by hand with the existing `set-family-login` CLI. Self-serve signup and emailed resets wait until going public, so no email provider is needed yet.

### Hosting fixes in code
Done during the core work, since none needs a host. Details are in "Private hosting".
- [ ] Health check split into liveness and readiness.
- [ ] Graceful shutdown.
- [ ] A lock on migrations.
- [ ] Login throttle that trusts the proxy.

### End to end
- [ ] **The whole loop works on a real family's term:** set up a term, see it on the timeline, adjust a week, check in, undo a mistake. Run on a realistic Charlotte Mason-style term, not only the demo family, before phase 2.

## 2. Private hosting

For DeeDee only; nobody else gets the link until phase 4. No public tunnels or hosting without DeeDee's approval (HOW_WE_WORK.md, "Rules"). The deployment gaps from the 2026-10-30 review are listed here. The first four are code-only and are built in phase 1 (core checklist, "Hosting fixes in code"); the production start and backups need the host and are done in phase 2.

- **Health check.** `/api/health` always returns 200, even when the database is down. Split it into liveness (the process is up) and readiness (the database answers), so a load balancer stops sending traffic to a broken instance.
- **Login throttle behind a proxy.** The throttle (10 tries a minute) is per IP and the proxy isn't trusted (`reviews/developer-review.md` L12). Behind a load balancer every user shares one IP, so one person's failed logins would block everyone.
- **Migration race.** The runner has no lock (L16). Two instances starting together can both run migrations. Take a Postgres advisory lock, or run migrations as a separate one-off step.
- **Graceful shutdown.** There is none (L19). On SIGTERM, stop taking requests, finish the ones in flight, then close the pool.
- **A production start.** The API runs through `tsx` and the repo has no container or deploy config. Add a production build and start, secrets from the host (never committed), HTTPS, and the `secure` cookie flag on (it is already on when `NODE_ENV=production`).
- **Backups:** automated, with one restore tested from start to finish.

## 3. Optional modules

Each follows the module rules above. In order:

1. **Records** (first, before the friends beta if time allows). All generated from the plan plus check-ins, since the plan assumes scheduled work was done unless the parent says otherwise:
   - attendance days per child (school days minus days off and sick days);
   - estimated hours by subject and child (effort × 2 minutes per point), labelled as estimates;
   - book list per child (books finished, from assignments);
   - CSV export of all of it.
   Every total and export carries the neutral note: "A record of logged hours to support your own records. Check your state's requirements." Nothing claims to meet a state's requirements (APP_OVERVIEW.md, "Product rules").
2. **Daily checklist**, for families who want it: a Today list per child with one-tap done. A tick confirms what the plan already assumes. Never required.
3. **Later, as the hub grows:** curriculum templates (tied to curriculum partnerships), print, and the rest of the hub list in `spec/SPEC.md` ("Hub features").

## Not planned now

- Lesson or chapter titles on assignments. They need tedious entry; revisit with templates.
- Curriculum templates and partnerships. A later-stage idea, tied to partnering with particular curricula.
- Weekly print.
- Payments and billing. The friends beta is free, with every Family feature.
- Self-serve signup and password-reset email (before going public).
- AA contrast for inside names on dimmed bars (45 of 240 safe-palette combinations fail, T-11d).
- An even drag preview.
- T-07b manual zoom: pinch, ctrl+wheel and pan (`tickets/timeline/README.md`).
- More label and layout polish.
- (Moved, not dropped: the tester verification of the timeline sprint, like `reviews/sprint-2b-verification.md`, is now required before the friends beta, phase 4.)
- Native app and full offline mode. v1 is web and PWA only.

## Done

Commit hashes and notes are in each progress doc.

| Work | Last commit | Where |
|---|---|---|
| Sprint 1: monorepo, engine, schema, login, kids and subjects, plan endpoint (S1-01 to S1-37) | e499c5f | `progress/overnight.md`, `tickets/sprint-1/` |
| Sprint 2a: schedule data (family settings, assignments, days off, recurring events, forms, `npm run demo`) | 1e27062 | `tickets/sprint-2a/` |
| Review fixes RF-01 to RF-12 | 24172fc | `tickets/review-fixes/`, `reviews/review-fixes-verification.md` |
| Sprint 2b: effort weights, assumed progress, weekly check-ins (S2b-01 to S2b-38) | e9d9aad | `progress/sprint-2b.md` |
| Sprint 2c: fixes from the Sprint 2b verification (S2c-01 to S2c-06) | 6346256 | `progress/sprint-2c.md` |

The timeline tickets, in `progress/timeline.md`:

| Ticket | Commit |
|---|---|
| T-01 design tokens · T-01b colour-blind-safe palette | 9df15da · a58731e |
| T-02 view model · T-02b hand-test fixes | 13209a6 · 2282106 |
| T-03 layout · T-03b This Week "Make an adjustment" | a0a1a77 · a8a43a0, f04a4f5 |
| T-04 static SVG timeline | ed51f34 |
| T-05 zoom presets · T-05b All subjects bar · T-05c calm detail and This month | db0db98 · 8891fb4 · 7ecc308 |
| T-06 names inside bars | aa34054 |
| T-07 adjust sheet · T-07c child filter · T-07d demo seed · T-07e edit bar · T-07f month rows | 21158b1 · b24ba30 · 4bb9262 · e998596 · 9dad6cc |
| T-08 drag a bar · T-08b polish · T-08c bar opacity | 7283bf4 · d9777f1 · 31e6a0b |
| T-09 "How did last week go?" redesign | ea9ed8c |
| T-10 add assignment from the timeline · T-10b label overlap | ae916f3 · cd8f104 |
| T-11 gaps, connectors, a name in every piece · T-11b · T-11c names on the bar | 7927305 · 448dc73 · 328cd1d |
| T-11d names above thin bars (+ fix) | d19dd73, e03fd0c |
| T-11e outside names closer to their bars (+ fix) | 3faeab8, c601581 |

## Open decisions for DeeDee

Triaged on 2026-10-30. The older numbered items are in `progress/overnight.md` ("Decisions for DeeDee"); each is listed below by its number there (O1 to O12).

### Needed for the core (phase 1)

- **C1. Week-adjust mode rule** (overnight O3): when a week is adjusted more than once, does the last edit win or the latest week? This blocks "Adjust the current or a coming week". The engine currently uses the last edit (`packages/engine/src/placement.ts`).
- **C2. How far undo goes:** the last change only, or a short history per assignment. This also settles **removal** (O4): days off are hard-deleted today, while assignments and events are archive-only.
- **C3. Effort input:** approve the proposal in "Effort" above (ask in time, store as effort, nudge heavier or lighter, carry corrections forward).

### Needed for hosting (phase 2)

- **H1. Where to host,** within about $20 a month.
- **H2. Sessions** (O10): sign the cookie or drop `SESSION_SECRET`, and add expired-session cleanup. The login throttle exists; making it work behind a proxy is in "Private hosting".
- **H3. Time-zone fallback** (O6): a bad stored zone falls back to America/Chicago. Keep that, or ask the family?

### Before going public (phase 5)

- **P1. Working name** for the app.
- **P2. Pricing:** whether the founding offer ($39/yr for life, first 500) is worth it, and whether transcripts belong in Family or are a separate upsell.
- **P3. Signup and password reset:** how reset emails are sent (an email provider).
- **P4. Kid logins under 13 (COPPA):** parent-managed profiles only at first?
- **P5. School year shape:** families set their own start and end dates today. Do we also need year-round or family-defined terms?
- **P6. Which states get record-keeping helpers first**, and the Orthodox overlay (New or Old Calendar, and whether fasts affect anything). Both wait for templates and helpers.

### Accepted as built unless DeeDee objects

These were open, but the current behaviour is a sensible default and nothing in the plan depends on changing it.

- O5. Archived subjects and children in events: the API rejects re-saving them; the events form drops them once the rules are edited, and says so.
- O7. Strict input: every route rejects unknown body fields (RF-09).
- O8. Field and range limits: title 120, total ≤ 100,000, assignments ≤ 1,096 days, days off ≤ 366; lighter-day capacity 0–100% with one decimal. (The minutes-per-unit limit went with S2b-15.)
- O9. Plan inputs: an event or day off whose listed children are all archived is dropped; warnings name the subject.
- O11. Names: the 60-character limit counts UTF-16 units; control characters other than NUL are allowed.
- O12. The earlier stack deviations (Node 22 / cookie@2, the vitest and vite upgrade, zod 4, ESLint 9, React Router 7 and the rest listed in `progress/overnight.md`).

### Settled or superseded

- O1, O2: superseded by S2b-18 (the plan assumes scheduled work was done).
- Default minutes per unit for chapters: superseded by effort weights (S2b-01, S2b-02).
- Password-reset email for the MVP: superseded by invite-only accounts.
