# S12-05 — The needs-you dot
**Size:** S
## Steps
1. While any assignment is waiting (S12-02), the Home item on the bottom bar and the rail shows a small fern-accent dot (the `--accent` token; never red), with the accessible name "Home, 1 thing needs you" / "2 things need you".
2. Only questions light it. Late lines and heavy weeks never do.
3. It disappears the moment the last question is answered (no reload).
## Done when
- The dot shows and clears as above at 390 and 1280 px.
## Tests
- Web: dot follows the waiting list; accessible name; never for briefing-only items.
