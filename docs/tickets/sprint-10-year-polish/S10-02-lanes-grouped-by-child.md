# S10-02 — Lanes grouped by child
**Source:** UX review improvement 4; mockup frames 1–2; Will's Together decision (2026-11-01) · **Depends on:** S10-01 · **Size:** M

## Goal
Under All children, each child has a group with a sticky header row and one lane per subject, and shared work shows once in a Together group at the top.

## Context
- Today under All children, each subject lane holds one sub-lane per child. A shared assignment is drawn once per child, so the demo family's "History spine" appears twice.
- **Together status: decided, not built.** Will chose the Together group on 2026-11-01. Nothing of it is in the code yet. Only the edit sheet's subtitle names every child on a shared assignment ("History · Frank, Margaret", `select.ts`).
- With one child, `childView.ts` (`forChild`) already keeps that child's lanes, shared work included.
- Bar heights are S10-04. The badge tap zone is S10-15.

## Steps
1. Add a child header row (34 px on a phone, 36 on desktop). It has the child's initial in the gutter and a faint load ribbon with the child's name, and stays sticky while that child's lanes scroll.
2. Give each child one lane per subject:
   - overlapping assignments stack as extra rows inside the lane;
   - hairlines separate the lanes;
   - lane pitch is 36/40 px for now; S10-04 makes it follow `BAR_H_MAX`.
3. Pin the badge (24 px on a phone, 26 on desktop, in a 36/40 px gutter) to the centre of the lane's first row. Tapping it shows the subject's name.
4. Add the **Together group** under All children:
   - An assignment with two or more children shows once, in a Together group at the top, with the same lane rules.
   - Its bar carries the children's initials, for example "History spine · F M L", with "+2" beyond four.
   - Each child's group holds only that child's solo work.
   - Each child's load ribbon still counts their shared work.
5. With one child selected, use the same layout with one group. Shared work sits in that child's lanes.

## Done when
- The demo family's shared "History spine" shows once under Together, marked "F M".
- In a 5-child family where 3 share History, there is one Together lane.
- Every badge lines up with its lane at 360 and 1280 px.
- Only what's essential: grouping, the header row and the badge position, with no data or API change.

## Tests
- Web:
  - the grouping and the sticky header;
  - the badge sits at the first row's centre;
  - where the Together group goes and the initials it shows ("+2" beyond four);
  - the ribbons include shared work;
  - the one-child view shows shared work in that child's lanes.

## Out of scope
- Bar heights (S10-04), labels (S10-04b), bar tap zones (S10-04c), the 44 px badge tap zone (S10-15) and colours (S10-11).
