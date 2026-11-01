# S10-02 — Lanes grouped by child, badges pinned to lanes
**Source:** UX review improvement 4; mockup frames 1–2 · **Size:** M
## Goal
Under All children, each child has a group with a sticky header row; inside it, one lane per subject; the badge sits on its lane.
## Steps
1. Child header row (34 px phone / 36 desktop): initial in the gutter and a faint load ribbon carrying the child's name; sticky while its lanes scroll.
2. One lane per subject per child; overlapping assignments stack as extra rows (28/30 px) inside the lane; lane pitch 36/40 px; hairlines between lanes.
3. The badge (24/26 px in a 36/40 px gutter) is pinned to the first row's centre; tap area at least 44 px; tap shows the subject name.
4. A shared assignment appears under each of its children (coordinator default).
5. One child selected: the same layout with one group.
## Done when
- The demo family's two "History spine" lanes are clearly Frank's and Margaret's; every badge lines up with its lane at 360 and 1280 px.
## Tests
- Web: grouping, sticky header, badge position equals first-row centre, shared assignments under each child.
