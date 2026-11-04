# S11-06 — Three one-time hints on Schedule
**Size:** S
## Goal
Small hints the first time each thing appears, instead of a tour.
## Steps
1. **Year has bars for the first time:** a bubble at a bar: "Thicker bars mean more work each day. Tap one to change it."
2. **The first bar opened:** "Change the start or end and the rest of the plan adjusts."
3. **The subject icons first show:** "Tap an icon to see the subject's name."
4. One hint at a time, never stacked; each has "Got it" and never returns; it never blocks the screen (a bubble, no overlay); accessible (role="status", focusable "Got it").
5. Seen hints are stored on the family (so they don't repeat on another device). Family settings gets "Show tips again".
## Done when
- A new family sees each hint once, in context; "Show tips again" brings them back.
## Tests
- Web: when each shows; one at a time; Got it; reset.
