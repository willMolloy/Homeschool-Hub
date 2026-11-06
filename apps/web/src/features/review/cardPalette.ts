/**
 * S13-05: the card's colours as plain hex, so the saved image doesn't depend on the page's theme. They come from the app's own tokens
 * (`scripts/palette.ts` is the source of `styles/tokens.css`), so a child and a subject are the colour the
 * family chose everywhere (Will: "use the chosen colors"). The saved image and Print are always the light palette; only the
 * on-screen preview follows a dark device.
 */
import { slotOfColor } from "../roster/palette";

export type CardTheme = "light" | "dark";

export interface Hue { pastel: string; strong: string }
export interface CardColors {
  bg: string; card: string; ink: string; muted: string; line: string;
  /** The child's tinted header band, and the child's strong colour for the title. */
  band: string; kid: Hue;
}

/** The neutral Soft Paper values (the same as the mockup's). */
const NEUTRAL: Record<CardTheme, { bg: string; card: string; ink: string; muted: string; line: string; tint: number }> = {
  light: { bg: "#FAF6EE", card: "#FFFDF8", ink: "#2F2A24", muted: "#6E655A", line: "#E8E0D2", tint: 0.45 },
  dark: { bg: "#1C1A17", card: "#26231F", ink: "#F1EBE1", muted: "#B3A99B", line: "#3A352F", tint: 0.55 },
};

/**
 * The twelve subject hues in slot order, as `scripts/palette.ts` has them (a test keeps the two equal). That file needs a dev-only
 * library, so it can't be imported into the app; this copy is what ships.
 */
export const HUES: readonly { light: Hue; dark: Hue }[] = [
  ["#F0D6A8", "#A86A00", "#5B4826", "#F5C46B"], ["#BDDCF0", "#2A7DB0", "#2A485D", "#8FCBF0"], ["#B5DFD1", "#1F8063", "#265044", "#7FD3B6"],
  ["#EAE2A5", "#8A7A00", "#565126", "#E9DB6A"], ["#C1D0EA", "#3F64A8", "#2E3E5D", "#9DB7EA"], ["#F0C8B4", "#B4532A", "#5E3728", "#F2A786"],
  ["#E5C8DB", "#9B4F80", "#543649", "#E0A6CB"], ["#D1D5C9", "#5F6B50", "#41453B", "#B6C0A6"], ["#F9C0BE", "#A8243F", "#613033", "#FA9DA6"],
  ["#C7E3C0", "#3F7932", "#364831", "#A5D39B"], ["#AFE5E7", "#00787D", "#224A4C", "#78D6DB"], ["#E1D1F7", "#7955A0", "#483C56", "#D1B6F3"],
].map(([lf, ls, df, ds]) => ({ light: { pastel: lf!, strong: ls! }, dark: { pastel: df!, strong: ds! } }));
/** The fern accent (`primary-soft`, `primary`) for a child with no colour. */
const FERN: Record<CardTheme, Hue> = { light: { pastel: "#E3EEE8", strong: "#3F6B5C" }, dark: { pastel: "#25342E", strong: "#9CCBB8" } };

/** A subject's (or child's) hue in a slot (1 to 12). */
export function slotHue(theme: CardTheme, slot: number): Hue {
  return (HUES[slot - 1] ?? HUES[7]!)[theme];
}

/** The child's hue: the colour stored on them (as the app draws it), else the fern accent. */
export function childHue(theme: CardTheme, color: string | null | undefined): Hue {
  const slot = slotOfColor(color);
  if (slot) return slotHue(theme, slot);
  return FERN[theme];
}

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
/** `a` over `b` at `amount` (0 to 1), both #rrggbb. */
export function mix(a: string, b: string, amount: number): string {
  const c = [0, 1, 2].map((i) => Math.round(channel(a, i) * amount + channel(b, i) * (1 - amount)).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
}

export function cardColors(theme: CardTheme, childColor: string | null | undefined): CardColors {
  const n = NEUTRAL[theme];
  const kid = childHue(theme, childColor);
  return { bg: n.bg, card: n.card, ink: n.ink, muted: n.muted, line: n.line, band: mix(kid.pastel, n.bg, n.tint), kid };
}
