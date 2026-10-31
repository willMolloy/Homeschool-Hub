/** The 8 preset swatches offered for children and subjects (includes the seed colors). */
export const PALETTE = [
  "#2f6fb0", // blue
  "#b0482f", // brick
  "#2f8f6f", // green
  "#7a5cc2", // purple
  "#b08a2f", // ochre
  "#2f8fb0", // teal
  "#c25c8a", // pink
  "#5b6b7d", // slate
] as const;

export const PALETTE_NAMES: Record<string, string> = {
  "#2f6fb0": "Blue",
  "#b0482f": "Brick",
  "#2f8f6f": "Green",
  "#7a5cc2": "Purple",
  "#b08a2f": "Ochre",
  "#2f8fb0": "Teal",
  "#c25c8a": "Pink",
  "#5b6b7d": "Slate",
};

/** First swatch no active item uses yet; if all are taken, cycle by count. */
export function nextUnusedColor(used: readonly (string | null)[]): string {
  const taken = new Set(used.map((c) => c?.toLowerCase()));
  return PALETTE.find((c) => !taken.has(c)) ?? PALETTE[used.length % PALETTE.length]!;
}

/**
 * S8-01: the Soft Paper subject hue (slot 1-8, `--tl-subject-N-*`) each old swatch keeps, so a subject that was
 * blue still reads blue-ish. Order: honey, sky, mint, butter, blue, coral, lilac, sage. The stored value is
 * unchanged; this only decides how it is drawn.
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
};

/** The CSS colour a stored swatch is drawn in: its Soft Paper strong tone, or the raw value for anything else. */
export function swatchColor(color: string | null): string | null {
  if (!color) return null;
  const slot = SWATCH_SLOT[color.toLowerCase()];
  return slot ? `var(--tl-subject-${slot}-strong)` : color;
}

/** The Soft Paper fill a stored swatch is drawn on (for badges), or null for an unknown colour. */
export function swatchFill(color: string | null): string | null {
  const slot = color ? SWATCH_SLOT[color.toLowerCase()] : undefined;
  return slot ? `var(--tl-subject-${slot})` : null;
}

export const SWATCH_SLOTS: Readonly<Record<string, number>> = SWATCH_SLOT;
