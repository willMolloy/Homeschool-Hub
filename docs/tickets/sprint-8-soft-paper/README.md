# Sprint 8 — Soft Paper: the new look, Home and navigation, light and dark

> **Status: approved, not started** (2026-10-31). Will chose **Soft Paper** ("Start on soft paper… these look way better than before. I would slightly increase opacity in the assignment colors."), pending a check with DeeDee. Starts after Sprint 7 passes its tester check. **Decided by Will on 2026-10-31** (DeeDee may still adjust; names and tabs live in one config):
- **Navigation:** Home plus three tabs with icons: **Home · Track work · Schedule**.
- **Schedule** holds a **Week | Year** switch: this week's planned bars (Week) and the year timeline (Year). "The this week feature is a feature of the schedule."
- **Track work** is checking in: last week's "Did everything get done?", the Completed checks and Update status.
- **One child at a time**, with a Frank / Margaret / Both switch.
- **The last-week card stays until answered.**
- **Optional subject icons** (S8-11).
- **Starter subjects stay the 14 basic ones** (no Charlotte Mason extras).
- **Zoom row order as built:** Year, built-ins, then custom views.
- **Logo:** the book-and-sunrise placeholder for now.
- **Year lanes sit tighter**, with subject names inline (S8-07).

**Source:** `docs/DESIGN_DIRECTION.md`, `docs/design/ux-research.md` (Direction 1: Soft Paper; IA Option B), the mockup `docs/design/mockups/soft-paper.html` (and its `.png`), and Will's critiques. This sprint absorbs the held Sprint 6b tickets: S6b-11 → S8-04, S6b-02 → S8-05, S6b-03 → S8-06.

**Soft Paper in one paragraph:** a well-loved notebook. Cream page `#FAF6EE`, card `#FFFDF8`, ink `#2F2A24`, secondary `#6E655A`, fern accent `#3F6B5C`, warm 1 px hairlines `#E8E0D2` instead of shadows; dark: warm charcoal `#1C1A17`, card `#26231F`, ink `#F1EBE1`, accent `#9CCBB8`. **Fraunces** (soft serif) for screen titles and greetings, **Nunito Sans** for everything else. Radius 14 px cards, 12 px bars, pills for chips and buttons. **Phosphor Light** icons. Gentle 200–260 ms motion. Subject pastels with a thin strong-colour left rule.

**Assignment colours (Will: slightly more opacity):** the light fills are mixed 14% toward each subject's strong tone, the dark fills 10%; all text on them stays AA (ink ≥ 9:1, bar secondary ≥ 5.2:1, check ring ≥ 3:1 against its fill). The values are in the mockup's `:root` block and in S8-01.

Each ticket uses the usual format. Build in order, one commit per ticket, each with `bash scripts/check.sh` green, and apply the screen tests in `DESIGN_DIRECTION.md`. Progress goes in `docs/progress/sprint-8.md`; before-and-after screenshots in `docs/progress/screens/sprint-8/`.

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S8-01 — Soft Paper tokens, fonts and subject colours](S8-01-soft-paper-tokens-fonts-and-colours.md) | none | M |
| 2 | [S8-02 — Light, dark and system themes](S8-02-light-dark-and-system-themes.md) | S8-01 | S |
| 3 | [S8-03 — Shared components in the Soft Paper style](S8-03-shared-components.md) | S8-01 | M |
| 4 | [S8-04 — Home page and navigation](S8-04-home-page-and-navigation.md) | S8-03 | M |
| 5 | [S8-05 — This week as pastel bars](S8-05-this-week-as-pastel-bars.md) | S8-04 | M |
| 6 | [S8-06 — Check in with one question, a check or Update status](S8-06-check-in.md) | S8-05 | M |
| 7 | [S8-07 — The Year timeline in Soft Paper](S8-07-the-year-timeline.md) | S8-03 | M |
| 8 | [S8-08 — Set up screens and forms in Soft Paper](S8-08-set-up-screens-and-forms.md) | S8-04 | M |
| 9 | [S8-09 — First-run checklist and empty states](S8-09-first-run-and-empty-states.md) | S8-04, S8-08 | S |
| 10 | [S8-11 — Optional subject icons](S8-11-optional-subject-icons.md) | S8-03 | S |
| 11 | [S8-10 — Tester pass: the new look](S8-10-tester-pass.md) | S8-01 to S8-09, S8-11 | S |
