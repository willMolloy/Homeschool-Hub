# S8-11 — Subject icons on every subject

**Source:** Will, 2026-10-31: yes to icons, then the Year view's subject badges (S8-07) made them the way each lane is identified, so every subject needs one.  
**Depends on:** S8-03 (Phosphor icons)  
**Size:** S

## Goal
Every subject has an icon (chosen or automatic), so subjects are recognisable at a glance and never by colour alone; the Year view's lane badges depend on it.

## Steps
1. Migration (next number): `subject.icon text NULL` (a key from a fixed list). API: `icon` on subject create/patch/list, validated against the list.
2. A fixed set of about 20 Phosphor Light icons (book, calculator, globe, flask, leaf, music note, palette, pencil, language, cross, running figure, map, scroll, microscope, star…). Common subjects get a sensible default (Math → calculator, Science → flask, Music → music note, Literature/Reading → book, History → scroll…), matched by name when created; any other subject shows a **first-letter badge** until an icon is chosen. Existing subjects get defaults by the same name match (or the letter badge).
3. The subject form gets an icon picker (chips, 44 px); "Letter" is the fallback choice instead of none.
4. Icons show on Schedule's Week bars, as the Year view's lane badges (S8-07), Set up's Subjects list and the subject select.

## Done when
- Every subject shows an icon or its letter badge in every place above; starter subjects get their defaults.

## Tests
- DB migration; API validation; web: the picker, defaults, and rendering in each place.

## Out of scope
- Custom uploaded icons.
