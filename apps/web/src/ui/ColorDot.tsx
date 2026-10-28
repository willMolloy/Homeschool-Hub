/** A small round color swatch. Decorative: the name next to it carries the meaning. */
export function ColorDot({ color }: { color: string | null }) {
  return (
    <span
      className="color-dot"
      aria-hidden="true"
      style={{ background: color ?? "transparent", borderStyle: color ? "solid" : "dashed" }}
    />
  );
}
