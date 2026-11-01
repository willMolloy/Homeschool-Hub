# S10-02 — Lanes grouped by child, badges pinned to lanes
**Source:** UX review improvement 4; mockup frames 1–2 · **Size:** M
## Goal
Under All children, each child has a group with a sticky header row; inside it, one lane per subject; the badge sits on its lane.
## Steps
1. Child header row (34 px phone / 36 desktop): initial in the gutter and a faint load ribbon carrying the child's name; sticky while its lanes scroll.
2. One lane per subject per child; overlapping assignments stack as extra rows (28/30 px) inside the lane; lane pitch 36/40 px; hairlines between lanes.
3. The badge (24/26 px in a 36/40 px gutter) is pinned to the first row's centre; tap area at least 44 px; tap shows the subject name.
4. **Together group (Will, 2026-11-01):** under All children, an assignment with two or more children shows once in a "Together" group at the top (same lane rules: one lane per subject, extra rows for overlaps), its bar carrying the children's initials (e.g. "History spine · F M L"; "+2" beyond four). Each child's group holds only their solo work. Each child's load ribbon still includes their shared work. With one child selected, shared work shows in that child's lanes.
5. One child selected: the same layout with one group.
## Done when
- The demo family's shared "History spine" shows once under Together with "F M"; a 5-child family with 3 sharing History shows one Together lane; every badge lines up with its lane at 360 and 1280 px.
## Tests
- Web: grouping, sticky header, badge position equals first-row centre, Together group placement and initials; ribbons include shared work; one-child view shows shared work in that child's lanes.
