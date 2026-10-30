# S3b-07 — Make the CSV file picker a 44 px target

**Finding:** L5  
**Depends on:** none  
**Size:** XS

## Goal
The CSV file picker is at least 44 px tall at 360 px wide, like every other control.

## Context
- The native file input renders 24 px tall at 360 px.

## Steps
1. Give the file input (or a label styled as a button that opens it) a 44 px minimum height, using the existing button styles.

## Done when
- At 360 px wide the picker's tap target is at least 44 px tall; choosing a file still works.

## Tests
- Web: the input is still reachable by its label and a chosen file still fills the preview. (The height itself is checked in the tester's browser pass.)

## Out of scope
- Drag and drop.
