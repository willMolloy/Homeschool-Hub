/** The 12 preset swatches offered for children and subjects (includes the seed colors). S10-11 added the last four. */
export const PALETTE = [
  "#2f6fb0", // blue
  "#b0482f", // brick
  "#2f8f6f", // green
  "#7a5cc2", // purple
  "#b08a2f", // ochre
  "#2f8fb0", // teal
  "#c25c8a", // pink
  "#5b6b7d", // slate
  "#b03a5c", // rose
  "#4a8a3a", // leaf
  "#1f8a8f", // aqua
  "#6a4fa0", // plum
] as const;

/**
 * Each swatch's name, as it is drawn (S10-12: the Soft Paper hue, so "Mint, used by Math" names the colour the parent sees;
 * the stored value is still the old swatch).
 */
export const PALETTE_NAMES: Record<string, string> = {
  "#2f6fb0": "Blue",
  "#b0482f": "Coral",
  "#2f8f6f": "Mint",
  "#7a5cc2": "Lilac",
  "#b08a2f": "Honey",
  "#2f8fb0": "Sky",
  "#c25c8a": "Butter",
  "#5b6b7d": "Sage",
  "#b03a5c": "Rose",
  "#4a8a3a": "Leaf",
  "#1f8a8f": "Aqua",
  "#6a4fa0": "Plum",
};

/**
 * S10-12: who already uses each swatch, as "Math" or "Math and Art": the active items other than `except`, keyed by the
 * swatch their colour is drawn as (so an older or hand-made colour counts against its nearest swatch).
 */
export function usedByNames(items: readonly { id: string; name: string; color: string | null; archived?: boolean }[], except: string | null = null): Record<string, string> {
  const bySwatch = new Map<string, string[]>();
  for (const i of items) {
    if (i.archived || i.id === except) continue;
    const slot = slotOfColor(i.color);
    const swatch = slot ? PALETTE.find((c) => SWATCH_SLOT[c] === slot) : undefined;
    if (swatch) bySwatch.set(swatch, [...(bySwatch.get(swatch) ?? []), i.name]);
  }
  const out: Record<string, string> = {};
  for (const [c, names] of bySwatch) out[c] = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]!;
  return out;
}

/** First swatch no active item uses yet; if all are taken, cycle by count. */
export function nextUnusedColor(used: readonly (string | null)[]): string {
  const taken = new Set(used.map((c) => c?.toLowerCase()));
  return PALETTE.find((c) => !taken.has(c)) ?? PALETTE[used.length % PALETTE.length]!;
}

/**
 * S8-01: the Soft Paper subject hue (slot 1-12, `--tl-subject-N-*`) each swatch keeps, so a subject that was
 * blue still reads blue-ish. Order: honey, sky, mint, butter, blue, coral, lilac, sage, then (S10-11) rose, leaf,
 * aqua, plum. The stored value is unchanged; this only decides how it is drawn.
 */
const SWATCH_SLOT: Record<string, number> = {
  "#b08a2f": 1, // ochre -> honey
  "#2f8fb0": 2, // teal -> sky
  "#2f8f6f": 3, // green -> mint
  "#c25c8a": 4, // pink -> butter
  "#2f6fb0": 5, // blue -> blue
  "#b0482f": 6, // brick -> coral
  "#7a5cc2": 7, // purple -> lilac
  "#5b6b7d": 8, // slate -> sage
  "#b03a5c": 9, // rose
  "#4a8a3a": 10, // leaf
  "#1f8a8f": 11, // aqua
  "#6a4fa0": 12, // plum
};

/**
 * S10-11: a colour that is not a swatch is drawn as the nearest of the first eight only, as it was before slots 9-12
 * existed, so no family's older or hand-made colour changes hue on update.
 */
const NEAREST_FROM = Object.entries(SWATCH_SLOT).filter(([, slot]) => slot <= 8);

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/**
 * S8b-04: the hue slot of a stored colour: its swatch's, or for any other valid #rrggbb (an older or hand-made colour) the
 * nearest swatch by RGB distance, so every stored colour has one hue on every screen. null for no colour or a non-hex value.
 */
export function slotOfColor(color: string | null | undefined): number | null {
  if (!color) return null;
  const c = color.toLowerCase();
  if (SWATCH_SLOT[c]) return SWATCH_SLOT[c]!;
  if (!/^#[0-9a-f]{6}$/.test(c)) return null;
  const [r, g, b] = rgb(c);
  let best: [number, number] = [Infinity, 1];
  for (const [hex, slot] of NEAREST_FROM) {
    const [r2, g2, b2] = rgb(hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < best[0]) best = [d, slot];
  }
  return best[1];
}

/** The CSS colour a stored colour is drawn in: its Soft Paper strong tone, or the raw value if it has no hue. */
export function swatchColor(color: string | null): string | null {
  if (!color) return null;
  const slot = slotOfColor(color);
  return slot ? `var(--tl-subject-${slot}-strong)` : color;
}

/** The Soft Paper fill a stored colour is drawn on (for badges), or null when it has no hue. */
export function swatchFill(color: string | null): string | null {
  const slot = slotOfColor(color);
  return slot ? `var(--tl-subject-${slot})` : null;
}

export const SWATCH_SLOTS: Readonly<Record<string, number>> = SWATCH_SLOT;
