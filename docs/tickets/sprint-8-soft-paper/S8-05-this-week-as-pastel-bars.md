# S8-05 — This week as pastel bars

**Source:** Was S6b-02. Will: "I liked the colored bars… Maybe they should each be a button." Mockup "This week".  
**Depends on:** S8-04  
**Size:** M

## Goal
This week shows each child's work as Soft Paper pastel bars, one per assignment, with a child switch.

## Steps
1. Header: "This week", the dates, and previous/next week buttons.
2. A segmented control with each active child and "Both" (shown when there is more than one child; default: the first child, remembered on the device).
3. Under "{Child}'s work", one bar per assignment with work that week: the subject fill with a thin strong left rule, title, the week's range in the family's units, and a round **check** on the right (S8-06 wires it). "Both" groups bars under each child's name. Events for that week appear as one quiet line each.
4. Tapping a bar's body opens its adjustment (current or coming week, S6-03) or its Update status (last week, S8-06).
5. A child with nothing that week: "Nothing planned this week."

## Done when
- The demo family's week shows bars per child with ranges, the switch works, and nothing on the page is a number the family didn't enter.

## Tests
- Web: bars per child in lane order with ranges; the switch and "Both"; events; empty child; accessible names ("Treasure Island, pages 120–150").

## Out of scope
- The check-in behaviour (S8-06).
