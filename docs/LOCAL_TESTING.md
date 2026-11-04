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
- [ ] The tabs at the bottom (Home · Schedule · Records) are clear, and Home is always one tap away.

**Schedule · Week**
- [ ] The pastel bars show this week's work; ranges match where each book really is.
- [ ] Tap a bar: the week adjustment opens. Change it, then Undo from the bar at the bottom.
- [ ] In that sheet, "Update status" on a row ("They got to p. 138", keep or move the end date) corrects the plan's pace.

**Schedule · Year**
- [ ] Bars are calm when zoomed out; no bar fills the screen.
- [ ] Tap a subject badge in the left gutter: the full name shows and its lane highlights.
- [ ] Tap a bar: the edit bar (Start, End, Copy, More) sits above the tabs, on phone and laptop.
- [ ] More → Update status and More → Update time estimate open for the selected bar.

**Records**
- [ ] A new family sees "Set up your log": pick a style (Hours by subject, Core and non-core hours, Days attended, Days and hours, Detailed log), adjust the switches, mark subjects core or non-core. No state is named.
- [ ] Log: the date, the children and every hours box start empty; "Count as a school day" is on; hours are typed as hours and minutes. Log one week for two children: each child's record shows its own entry.
- [ ] Records shows the range (This week, Year, Fall, Spring, your terms, custom dates), the big numbers for what you track, hours by subject, and the wording "Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules."
- [ ] Edit and Delete an entry; Undo from the bar at the bottom. The schedule never changes.
- [ ] Export: pick dates, children, Each entry or Totals and the columns; Download CSV opens in a spreadsheet with no empty columns and the wording on line 1; Print summary previews one page per child.

**Child switch** (Week, Records, Year)
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
