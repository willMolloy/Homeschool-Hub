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
