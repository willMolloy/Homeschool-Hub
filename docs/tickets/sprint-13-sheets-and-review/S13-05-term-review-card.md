# S13-05 — Term in review: the card
**Size:** M
## Goal
One shareable card image per child, from Records.
## Steps
1. Records gets "Term in review" (next to Export): pick the range (term views or Year) and the child (or All children → one card each).
2. The card, from the UX mockup: the child's name and the term ("Frank · Fall 2026") in the child's colour; finished assignments; books read; time by subject as a small bar chart in subject colours; school days. Only parts with data appear.
3. **Save image** (PNG, rendered on the device; no upload) and **Print**. No public link, nothing sent anywhere.
4. No favourite book, no parent note, no estimates.
## Done when
- The demo family's Fall card for each child saves as an image and prints, in light and dark.
## Tests
- Web: parts shown only with data; the image is generated locally; no network request for sharing.

## Design and decisions (2026-11-05)
- **Build to the mockup:** `docs/design/mockups/term-review.html` (PNGs beside it) and `docs/design/term-review-notes.md` (measurements, long lists as "and N more", the sparse "roomy" layout, must-not-get-wrongs).
- **Saved images are always the light version** (Will), whatever the app theme; Print is light too. Dark mode applies only to the on-screen preview.
- **Save image:** on phones, the device share sheet (Web Share with the PNG file) so the parent can save to Photos or send it; on desktop, a download. Made on the device; nothing uploaded (coordinator's call, per Will).
- **Keep the small "Homeschool Hub" mark** on the card (Will): small and quiet.
- **Colours:** each child's own stored colour and each subject's stored colour (Will: "use the chosen colors"); the mockup's blue and coral were placeholders.
- **Full screen, not a bottom sheet (Will, 2026-11-05).** "Term in review" opens its own full-screen page (`/records/review`), not the partial pull-up shown in the mockup: a header with a back link to Records ("‹ Records", 44 px) and the title, the range and child chips, the card preview as large as fits, and Print / Save image at the bottom. With All children, swipe or use arrows between cards. On wide screens the page uses the centred content column. Everything else follows the mockup.
