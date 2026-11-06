# S18-04 — Small fixes from the run
**Findings:** E4–E13 (Low) · **Size:** S
## Steps
1. **E4:** setup step 2 lets a parent rename or remove a child added there; a duplicate name asks "Add another child named Clara?".
2. **E5:** "1 assignment ended" (singular).
3. **E6:** Family settings' week-start note no longer mentions check-ins; say what actually locks it, or remove it if nothing does.
4. **E7:** saving a log entry shows the undo bar; an identical entry for the same child and day asks "You already logged this. Add it again?".
5. **E8:** the Add assignment sheet opens with no subject and no unit chosen (or the last used, if that's the existing rule elsewhere; record the choice).
6. **E9:** Add several and CSV import show the same pace warning as the single form ("about 165 min a day — that's a lot") and flag duplicate rows before import.
7. **E10:** Days shows the day's events as one quiet line ("Fri · Hearth Co-op"); range words are lower case consistently.
8. **E11:** a child whose school days exclude Monday (Wren, Tue–Fri) gets no Monday lines on Days or sheets (check shared assignments use each child's own days).
9. **E12:** Records opens on All children (or its own remembered choice), not the child last picked in Schedule; the print summary shows "Books finished —" when none.
10. **E13:** "All children" chip not clipped at 390 px; long titles in the Update status sheet truncate so the close button stays on the title row.
## Done when
- Each item is fixed with a test, at 320, 360 and 1280 px in light and dark where visual.
