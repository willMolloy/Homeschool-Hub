# S8b-04 — One colour per subject everywhere

**Finding:** S8 tester N4 (Medium): Set up shows the stored swatch (Literature lilac), bars and lanes a slot colour (Literature honey).  
**Depends on:** none  
**Size:** S

## Goal
A subject has the same colour on every screen: the one stored on the subject (the parent can change it on the subject form).

## Steps
1. Bars, lanes, Week bars and Track work use the subject's stored hue; slot dealing is only the default for a new subject.
2. Existing subjects keep their stored colour; nothing is migrated.

## Done when
- In the demo family, Literature and Art are the same colour on Set up, Schedule · Week, Schedule · Year and Track work.

## Tests
- Web: a subject's stored hue drives the timeline and week colours.
