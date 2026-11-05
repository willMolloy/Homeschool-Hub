# S15-00 — Sprint 14 leftovers
**Source:** `docs/reviews/sprint-14-verification.md` (N1–N3 Low) · **Size:** XS
## Steps
1. **N1:** the 5-open-invite cap holds under simultaneous requests (check and insert in one transaction with a row lock on the family, or a constraint).
2. **N2:** an empty print sheet passes axe (`landmark-unique`: give each child's section a unique label, or drop the extra landmark).
3. **N3:** a `remove-parent <email>` command (README decision 5): removes that parent and ends their sessions; refuses to remove a family's last parent.
## Done when
- 8 parallel invite requests leave at most 5 open; axe is clean on an empty sheet; the command works and refuses the last parent.
