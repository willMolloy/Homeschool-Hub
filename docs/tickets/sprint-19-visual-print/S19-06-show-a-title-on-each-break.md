# S19-06 — Leave the usual days off off the year view

**Source:** DeeDee, 2026-11-11. She decided this after reading the first draft of the ticket. **Depends on:** —. **Size:** S

## Goal

The school's regular weekly days off do not appear on the year view, and a named break of a week or longer still shows its title there.

## Context

The regular days off are the school's configured week. If the family schools Monday, Tuesday, Thursday and Friday, Sunday and Wednesday are off because that is the schedule, not because someone added a break. Those days do not need a label.

An earlier draft of this ticket would have drawn an unnamed Wednesday on the year view and titled it "Wednesdays off". That is not the decision. The empty wash looked like a glitch because those repeated days were drawn with nothing on them. On the year view they are not drawn at all. No automatic label fills the gap.

A break of a week or longer is different. It still needs a name, and that title is shown on the year view, because there is room and the break matters.

## Steps

1. The regular weekly offs are the weekdays that are not school days in the family's configured week. They do not need a name, on any zoom.
2. On the year view, do not draw them. No wash, no stripe, and no title. The same at a term zoom, which is still wider than a month.
3. At a month zoom or closer (This month, and any closer view), those days show. They still have no label. Do not write "Wednesdays off" or any other automatic name.
4. A break of a week or longer requires a name before it saves, and that name is the title on the year view. **Default, not a blocker:** "a week or longer" means the first day through the last day is 7 calendar days or more. When the band is too narrow for the words inside it, draw the title just above the band.
5. A shorter break that is not the regular week (a holiday, a sick day, a one-off Wednesday when Wednesday is normally a school day) is not hidden by this rule. **Default, not a blocker:** if she leaves that shorter break unnamed, keep today's kind name ("Break", "Holiday", "Sick day"). Do not turn it into "Wednesdays off".
6. An existing long break with no name can still be opened. Saving it asks for a name. Viewing it does not.

## Done when

- A family whose school week skips Sunday and Wednesday shows neither day on the year view, and neither day has a label.
- This month shows those days, still with no label.
- A named break of seven or more days will not save without a name, and the year view shows that name.
- Nothing on the year view reads "Wednesdays off" unless she typed those words herself.

## Tests

- Web: school days Monday, Tuesday, Thursday, Friday. Year and a term zoom draw no Sunday and no Wednesday, and no "Wednesdays off" text. This month shows those days with no title. A named two-week break renders its name on the year view. Saving a 7-day break with a blank name is refused. Light and dark, at 390 and 1280 px.

## Out of scope

- A new control that repeats a weekday for the whole year. The regular offs are the school week she already set.
- An automatic label for a regular day off.
- Changing which days a real break takes off the plan (Sprint 21 asks what to do with overlapping assignments).
- Renaming holidays she already named.
