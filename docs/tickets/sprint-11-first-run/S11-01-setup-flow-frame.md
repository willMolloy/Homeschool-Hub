# S11-01 — The setup flow's frame
**Size:** S
## Goal
A brand-new family is taken to `/welcome` on first login and walks through six steps; existing families never see it; leaving halfway resumes at the same step.
## Steps
1. Store setup progress on the family (migration): `setup_step` (which step they reached) and `setup_done`. Existing families are marked done in the migration; families created after it start at step 1. Store the deferred items ("I'll get back to you") too.
2. `/welcome`: one step per screen, a progress bar ("Step 2 of 6"), Back, and the step's own buttons. Soft Paper components; works at 320 px.
3. While setup isn't done, signing in (or opening `/`) goes to `/welcome` at the saved step. After it's done, `/welcome` redirects Home.
4. A quiet "Finish later" on every step after children saves progress and goes Home; the flow comes back at next sign-in until done.
## Done when
- A new family lands on step 1; the demo family never sees it; closing the tab on step 3 and signing in again opens step 3.
## Tests
- API: setup fields round-trip; the migration marks existing families done. Web: redirect rules; progress bar; Back; resume.
