# S16-06 — Quicker book logging with suggestions

**Source:** Will, 2026-11-05 ("having options for quicker logging").  
**Size:** S

## Steps
1. In a log entry's books field, as the parent types, suggest matching titles from the family's earlier log entries and its assignment titles (reading subjects first), up to 6, matching anywhere in the title, ignoring case.
2. Tapping a suggestion adds it; Enter adds exactly what was typed. **Nothing is pre-filled**: the field starts empty and only the parent's choice adds a title.
3. A small "recent" row (the last 5 titles used for that child) appears under the empty field for one-tap adding.
4. Accessible combobox (arrow keys, Enter, Esc), 44 px targets.
## Done when
- Typing "trea" offers "Treasure Island"; one tap adds it; recent titles add in one tap; nothing appears in the field until the parent picks or types.
## Tests
- Web: suggestions from logs and assignments; recent row; keyboard; no prefill.
