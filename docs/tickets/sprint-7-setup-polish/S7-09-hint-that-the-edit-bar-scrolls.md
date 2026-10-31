# S7-09 — Hint that the phone edit bar scrolls

**Finding:** Sprint 5 O1  
**Depends on:** none  
**Size:** XS

## Goal
On phones, it is obvious that the edit bar's control row has more controls to the side.

## Steps
1. At 480 px and under, when the row overflows, fade its trailing edge (and its leading edge once scrolled), so a partly visible next control shows there is more. No arrows or text.

## Done when
- At 360 px the fade shows while more controls are off to the right and disappears at the end.
- Wider screens are unchanged.

## Tests
- Web: the overflow classes toggle with scroll position (mocked sizes). The look is checked in the tester's browser pass.

## Out of scope
- Rearranging the controls.
