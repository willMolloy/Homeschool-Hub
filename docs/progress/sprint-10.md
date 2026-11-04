# Sprint 10 progress: Year polish

Tickets: `docs/tickets/sprint-10-year-polish/`. S10-10 (tester pass) is the tester's. Mockups: `docs/design/mockups/year-polish*`; DeeDee's 2026-11-03 decisions in the README win where they differ. Screens are in `screens/sprint-10/`.

**Build order (README):** S10-01, S10-02, S10-15, S10-03, S10-04, S10-04b, S10-04c, S10-05, S10-06, S10-07, S10-08, S10-11, S10-12, S10-13, S10-09, S10-14, S10-16, S10-17, S10-18, S10-19. Slip order if time runs out: S10-17 and S10-18 (and S10-19), then S10-16; S10-09 and S10-14 stay together.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S10-01 Sheets above the tab bar (layer tokens) | (this commit) | `styles/layers.css` (new: `--z-raised`, `--z-popover`, `--z-nav`, `--z-edit`, `--z-toast`, `--z-sheet`, `--z-dialog`, `--z-skip`), loaded first in `main.tsx`; `app-shell.css`, `sheet.css`, `undo.css`, `date-field.css`, `timeline.css` use them. Test `s10-01-layers.test.ts` |

## Decisions

- **S10-01 one more layer than the ticket names.** The Year edit sheet is not modal, so it gets its own `--z-edit` (20): above the tab bar (10), below the undo bar (`--z-toast`, 30) so Undo stays tappable over it, and below modal sheets (50) and dialogs (60). Dialogs sit one step above sheets so a confirm opened from a sheet is on top. Local layers inside a card (the lane popover, the date calendar, the More menu) use `--z-raised` / `--z-popover`. Every `z-index` in the app's CSS now uses a token, and a test fails on a bare number. The edit sheet keeps its place above the tab bar for now (S10-06 restyles it).
