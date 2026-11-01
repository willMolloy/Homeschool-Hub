# S9-02 — The check-in lives in Schedule · Week

**Source:** Will, 2026-11-01; UX review fix 1 (the underlined status link)  
**Depends on:** S9-01  
**Size:** M

## Goal
The weekly check-in is a quiet card above this week's bars on Schedule · Week, with the same behaviour as today's Track work.

## Steps
1. Move the "Did everything get done?" card, the ticks, "Not quite" (expands in place) and Update status onto Schedule · Week, above the bars.
2. It shows only while last week is unanswered; once answered it disappears. Remove the underlined "Last week isn't checked in yet." link.
3. Past weeks checked in on Schedule use the same card.

## Done when
- The demo family checks in last week from Schedule · Week with "Yes, all done", and with "Not quite" + Update status; no Track work page is needed.

## Tests
- Web: the card shows while unanswered and goes after; "Not quite" expands in place; Update status saves.
