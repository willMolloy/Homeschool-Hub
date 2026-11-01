# Local testing: Sprints 5–8b (Soft Paper)

A checklist for Will and DeeDee to try PR #3 on your own machine. Setup is the same as [REVIEW-GUIDE.md](REVIEW-GUIDE.md) section 1 (Node 20, Docker for Postgres, `.env` with a `SESSION_SECRET`):

```sh
git fetch origin && git checkout claude/test-coverage-analysis-6dehbu
docker compose up -d db
npm ci
npm run demo          # resets hh_dev to the demo family, starts API + web
```

Open http://localhost:5173 and sign in with `demo@example.com` / `demo-password`. Try a laptop-width window and a phone-width one (browser dev tools → device toolbar → 360 px).

**Testing on your real phone (optional, home Wi-Fi only):** the API and web listen on 127.0.0.1 only, so a phone can't reach them. Ask Claude for the one-off LAN command if you want this; nothing is made public.

## Checklist

**Home**
- [ ] In five seconds, can you tell what the app is for and what to do next?
- [ ] The tabs at the bottom (Home · Track work · Schedule) are clear, and Home is always one tap away.

**Schedule · Week**
- [ ] The pastel bars show this week's work; ranges match where each book really is.
- [ ] Tap a bar: the week adjustment opens. Change it, then Undo from the bar at the bottom.

**Schedule · Year**
- [ ] Bars are calm when zoomed out; no bar fills the screen.
- [ ] Tap a subject badge in the left gutter: the full name shows and its lane highlights.
- [ ] Tap a bar: the edit bar (Start, End, Copy, More) sits above the tabs, on phone and laptop.
- [ ] More → Update time estimate: it opens on the current minutes a day.

**Track work**
- [ ] Last week's question: "Yes, all done" checks the week in with one tap.
- [ ] "Not quite": untick what didn't happen, or Update status on a bar ("Move to {date}").

**Child switch** (Week, Track work, Year)
- [ ] "All children" comes first; picking a child on one screen carries to the others.
- [ ] Narrow the window: when names don't fit, it becomes one "All children ▾" button with a list.

**Set up**
- [ ] Subjects, children, assignments, days off, events read cleanly; each subject has one colour and an icon everywhere.
- [ ] Add an assignment: the subject list offers common subjects and "New subject…".

**Look**
- [ ] Light and dark both feel calm (Family settings → Appearance, or your device setting).
- [ ] Anything that still looks "2013", cluttered, or shows a number a parent wouldn't use.

**A brand-new family:** sign out, then sign in as `empty@example.com` / `demo-password` after running `DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts` (local only; run it after `npm run demo`, since the demo reset wipes it). Home's checklist should get you to a planned week without help.

## Known and accepted
- Year badges are 24 px wide by design (each has a 32 px+ tall tap area).
- The setup forms' calendar pop-up and number steppers from the mockup are not built yet (forms behave as before).
- Art and Math are both mint in the demo (their stored colours map to the same swatch); icons tell them apart.
- A date placeholder clips its last letter at 360 px.

Write anything you notice in a list; Claude will turn it into tickets.
