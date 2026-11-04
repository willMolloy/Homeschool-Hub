# S14-03 — Invite another parent
**Size:** S
## Steps
1. Family settings gets "Parents": the parents' names and "Invite another parent", which shows a copyable link (and the phone share sheet where available) to `/join/<token>` for **this** family, single use, 7 days.
2. Redeeming it adds a parent to that family (name, email, password) and signs them in; no setup flow (the family is already set up).
3. Open invites are listed with "Cancel invite". No removing parents in the app (Will).
## Done when
- Parent 1 invites parent 2; parent 2 joins and sees the same family; the link can't be used twice.
## Tests
- API: the family-scoped invite, redeem adds a parent, cancel. Web: the Parents section.
