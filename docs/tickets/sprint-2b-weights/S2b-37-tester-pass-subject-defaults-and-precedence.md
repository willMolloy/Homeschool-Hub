# S2b-37 — Tester pass: subject defaults and precedence

**Depends on:** S2b-35, S2b-11, S2b-33  
**Size:** S

## Goal
The tester proves the full weight precedence end to end (assignment → learned for pages and chapters → subject → built-in) and the subject-default edge cases.

## Cases
1. **Precedence matrix:**
   - Pages with history + a subject default + an explicit value → explicit.
   - History + subject → learned (D19).
   - Subject only → subject.
   - Nothing → built-in.
   - The same for chapters.
   - Lessons and minutes with faked history rows → history ignored.
2. **Live subject default (D20):**
   - A null-weight assignment follows the subject change on the next plan.
   - An assignment that took a learned or explicit weight doesn't follow.
3. **Unit mismatch:** Math's default for lessons doesn't apply to a Math pages assignment.
4. **Bad values:** subject weights of 0, -1, 101, 3 decimals or a missing unit → 400 and the DB CHECK.
5. **Archived subject:** its assignments still use its default, and a suggestion with it works.
6. **Multi-child + subject:** neither child has history → the subject default and its hint.
7. **The picker:** each preset gives a plan thickness of built-in × multiplier.

## Done when
- [ ] Each case is automated or noted as manual, with the reason, in `docs/progress/tester-report.md`.
