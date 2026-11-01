import { swatchColor } from "../features/roster/palette";

/** A small round color swatch. Decorative: the name next to it carries the meaning. Old swatches draw in their Soft Paper tone (S8-01). */
export function ColorDot({ color }: { color: string | null }) {
  const drawn = swatchColor(color);
  return (
    <span
      className="color-dot"
      aria-hidden="true"
      style={{ background: drawn ?? "transparent", borderStyle: drawn ? "solid" : "dashed" }}
    />
  );
}
