# S8-03 — Shared components in the Soft Paper style

**Source:** `design/ux-research.md` §5 "Components the design system needs"  
**Depends on:** S8-01  
**Size:** M

## Goal
Buttons, fields, chips, cards, sheets, list rows and segmented controls come from one shared set in the Soft Paper style, replacing per-screen CSS.

## Steps
1. Build or restyle shared components (on Base UI / shadcn where available): **Button** (primary fern pill, secondary cream pill, quiet text), **Field** (text, number, select, date with a calm calendar popover where the native one is ugly), **Chip** (pill, 44 px), **Card** (cream, 14 px, hairline), **Sheet** (`ResponsiveSheet` restyled: bottom sheet with a grab handle on phones), **List row** (title, one-line description, chevron), **Segmented control** (Frank / Margaret / Both).
2. Add Phosphor icons (`@phosphor-icons/react`, Light weight) for navigation and list rows.
3. Move existing screens onto these components where it's a like-for-like swap; leave layout changes to their own tickets. Remove CSS that becomes unused.

## Done when
- Every button, field and chip on existing screens uses the shared components; no screen-specific button or field styles remain; 44 px targets hold.

## Tests
- Web: component tests (variants, disabled, focus); existing screen tests pass with label-based queries. The tap-target script passes.

## Out of scope
- New screens and layouts (S8-04 onward).
