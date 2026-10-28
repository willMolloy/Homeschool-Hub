# S2b-34 — Build the thickness picker with preview bar

**Depends on:** S2b-01  
**Size:** S

## Goal
A reusable web control picks a bar width with a few simple presets, a custom value and a live preview bar.

## Behaviour
- **Props:** `unitType`, `value: number | null`, `onChange`. `null` means "no default (use the built-in)".
- **Presets** (multipliers of the built-in for the unit, **D22**), shown as segmented buttons:
  - None (= null)
  - Light (×0.5)
  - Normal (×1)
  - Heavy (×1.5)
  - Very heavy (×2)
  - Custom… (a number field with the engine bounds and 2 decimals)
  - For lessons that's 7.5 / 15 / 22.5 / 30.
- **Preview:**
  - A bar for a typical day: 20 pages, 1 chapter, 1 lesson or 30 minutes, at the chosen weight.
  - A faint reference bar: "20 pages at normal weight" (thickness 20).
  - Both use the same pixel scale as the plan (a shared `thicknessToPx` helper; if the plan timeline doesn't exist yet, put it in `features/plan/scale.ts`).
  - The caption: "1 lesson a day ≈ 30 min of work".
- Accessible: a radio group with the preset names, and the preview has an aria-label naming the thickness.

## Steps
1. `components/ThicknessPicker.tsx` and `thicknessToPx` (clamped so huge weights don't overflow the card).

## Tests (`apps/web/test/thickness-picker.test.tsx`)
- Each preset emits built-in × multiplier for each unit.
- Custom validation: 0, 101 and 1.234 are rejected.
- None emits null.
- Preview widths follow the value, and are clamped at 100.
- The caption text.
- Keyboard selection.
