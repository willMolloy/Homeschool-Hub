# S17-01 — Low backlog cleanup
**Source:** ROADMAP "Open backlog (Low)" and the Low findings of the Sprint 10b–15 tester reports · **Size:** S
## Steps
1. **Week filter:** with Schedule · Week filtered to one child, another child's late card (or briefing line) does not show.
2. **Home checklist:** once hidden, Family settings offers "Show the getting-started checklist again".
3. **L5 (Sprint 10b):** Rose and Lilac are easier to tell apart (adjust one hue, keeping AA in both themes); the swatch "used by" cue is clearer.
4. **Day-off wording (Sprint 14 N6):** a day off's kind reads the same everywhere ("Day off" vs "Break"): use the parent's label, else one shared default per kind on screen and on sheets.
5. **Throttled invite (Sprint 14 N4):** a 429 on an invite or join shows "Too many tries. Please wait a minute and try again." instead of the generic save error.
6. **Term in review on short desktops (Sprint 13 N4):** the card preview uses the available height better at 1280×800.
7. **Sprint 15 Lows** (`docs/reviews/sprint-15-verification.md`):
   - **N1:** a viewer's write with invalid or empty JSON gets 403, not 400 (the role check runs before body parsing).
   - **N2 (Will, 2026-11-05):** at month detail, a row whose blocks are too narrow for an inside name shows the name on a small muted line **just above the row**, left-aligned with the row's first visible block (as T-11d's names above thin bars). Rows wide enough keep the name inside. Costs about 14 px only on rows that need it.
   - **N3:** a very slow book's finishing day reads "Finish Chapter 8", not "Keep going".
   - Notes N5, N6: a join token over 100 characters gets the plain bad-link message, and the view-link join page sends noindex.
8. The `sheets` smoke scenario writes its screenshots to the scratch or a git-ignored folder, not `docs/progress/screens/` (it leaves untracked `s13-06-*.png` files after every run).
9. Tidy ROADMAP "Open backlog (Low)": remove items already fixed (N8, N7, N9 in S12-09; the `timeline-add` flake in S15).
## Done when
- Each item is fixed with a test, at 320, 360 and 1280 px in light and dark where it is visual.
