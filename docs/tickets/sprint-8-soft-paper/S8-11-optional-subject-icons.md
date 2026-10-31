# S8-11 — Optional subject icons

**Source:** Will, 2026-10-31 (yes to optional icons); `design/ux-research.md` (icons help colour-blind users and look friendly)  
**Depends on:** S8-03 (Phosphor icons)  
**Size:** S

## Goal
Each subject can show a small icon next to its name, so subjects aren't told apart by colour alone.

## Steps
1. Migration (next number): `subject.icon text NULL` (a key from a fixed list). API: `icon` on subject create/patch/list, validated against the list.
2. A fixed set of about 20 Phosphor Light icons (book, calculator, globe, flask, leaf, music note, palette, pencil, language, cross, running figure, map, scroll, microscope, star…). Common subjects get a sensible default when created from the starter list (Math → calculator, Science → flask, Music → music note…); others start without one.
3. The subject form gets an icon picker (chips, 44 px); "None" is allowed.
4. Icons show beside the subject name on Schedule's Week bars, the Year lane names, Set up's Subjects list and the subject select.

## Done when
- A subject with an icon shows it in every place above; one without shows just its name; starter subjects get their defaults.

## Tests
- DB migration; API validation; web: the picker, defaults, and rendering in each place.

## Out of scope
- Custom uploaded icons.
