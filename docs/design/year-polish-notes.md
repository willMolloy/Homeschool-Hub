# Year view polish: build notes (Sprint 10)

Mockup: `mockups/year-polish.html`, with PNGs `year-polish-phone-light/-phone-dark/-desktop-1280.png`.

## Decisions

1. **Lanes grouped by child.** Each child has a sticky header row: an initial in the gutter, plus a faint load ribbon carrying their name. Their lanes follow. With one child selected it's the same layout, with one group.
2. **One lane per subject per child.** When assignments overlap they stack as extra rows inside the lane. The badge is pinned to the **first row's** centre. Hairlines separate the lanes.
3. **Today in the sticky axis:** months on line 1, the "Today" pill on line 2, and a dashed line down through every lane.
4. **Bars run straight through breaks.** Break bands are a wash drawn *over* the bars, so a bar doesn't split into blocks.
5. **"+" goes in the title row,** and "Edit" becomes a pencil at the end of the term chips.
6. **The edit sheet** gets date tiles ("Oct 19, 2026"), the pace line "About 20 pages a day · 40 min", a 2 px outline on the chosen bar, and Copy · More.
7. **Add assignment:** a subject picker sheet (badge + name, a tick, "New subject…" last), child toggle chips, date tiles, and soft day chips (not solid green).
8. **Desktop ≥1024 px: a left sidebar, not a top bar.** It keeps height for the timeline and gives Set up a home. At 600–1023 px use an 80 px icon rail. The edit sheet becomes a 340 px side panel that pushes the timeline over. The controls sit on one row.
9. **Art moves to coral** so every subject has its own colour.

## Measurements (px)

| | Phone | Desktop |
|---|---|---|
| Gutter / badge | 36 / 24 | 40 / 26 |
| Axis / Today pill | 42 / 18 | 44 / 18 |
| Child header row | 34 | 36 |
| Lane pitch / extra row | 36 / 28 | 40 / 30 |
| Bar height min → cap | 12 → 20 | 14 → 22 |
| Ribbon | 4 → 12 | 5 → 14 |
| Label | 12 / 700 | 13 / 700 |
| Bar radius / gap | 5 / 2 | 5 / 2 |
| Break wash | 72 % (dark 50 %) | same |
| Controls | 44 tall (term chips 36 visible, 44 hit) | same |

**The cap:** `h = hMin + (hCap − hMin) × (1 − e^(−1.2·L))`. L is the day's load relative to that child's typical day (1.0), smoothed over 3 weeks at Year, 1 week at a term, and not at all at month. A typical day is about 18 px; nothing passes 20. Extra rows are 80 % height. The ribbon uses 0.45 in place of 1.2.

**Labels:** inside the bar if it fits. Otherwise outside to the right in muted text, if the row is free. Otherwise truncate with "…", keeping at least 6 letters. Otherwise none (tap still works). A 3 px halo in the bar colour keeps the Today line off the text.

## Must not get wrong

- Sheets sit **above** the tab bar. Today the tab bar covers them.
- No bar passes its cap, and the height never jumps in steps.
- Tap zones: a bar's zone is the bar grown to at least 44 × 44, and where two overlap the nearer centreline wins. Badges get 44 (tap shows the subject name).
- US dates everywhere. Tiles open the custom date picker, never `<input type=date>`.
- No engine numbers: the pace line uses rounded values only.
- Term names come from the family's term views. Don't hard-code them.
- Dark mode uses the `--wash` and `--ribbon` tokens. Pastels darken rather than invert.
- At 360 px the chip row scrolls rather than wrapping, and the pencil stays pinned.
