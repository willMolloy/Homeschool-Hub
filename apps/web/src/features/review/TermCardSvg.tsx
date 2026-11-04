/**
 * S13-05: draws a `layoutCard` as one self-contained SVG (1080 x 1350): every colour, size and font is an attribute, so the same
 * markup is the on-screen preview, the printed page and (serialised, with the fonts embedded) the saved PNG.
 */
import { BookOpen, Leaf, Plant } from "@phosphor-icons/react";
import { SUBJECT_ICON_COMPONENTS, isIconKey } from "../subjects/icons";
import type { Item, CardLayout, Font } from "./cardLayout";

export const FONT_FAMILY: Record<Font, string> = {
  serif: '"HH Fraunces", "Fraunces Variable", Fraunces, Georgia, "Times New Roman", serif',
  sans: '"HH Nunito", "Nunito Sans Variable", "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

function Mark({ name, size, fill }: { name: string; size: number; fill: string }) {
  if (name === "book") return <BookOpen size={size} color={fill} weight="light" />;
  if (name === "leaf") return <Leaf size={size} color={fill} weight="light" />;
  if (name === "plant") return <Plant size={size} color={fill} weight="light" />;
  if (isIconKey(name)) { const Icon = SUBJECT_ICON_COMPONENTS[name]; return <Icon size={size} color={fill} weight="light" />; }
  return null;
}

function Drawn({ it }: { it: Item }) {
  switch (it.k) {
    case "rect":
      return <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={it.r} fill={it.fill} {...(it.stroke ? { stroke: it.stroke, strokeWidth: it.sw ?? 1 } : {})} />;
    case "text":
      return (
        <text x={it.x} y={it.y} fontSize={it.size} fontWeight={it.weight} fill={it.fill} fontFamily={FONT_FAMILY[it.font]}
          {...(it.anchor ? { textAnchor: it.anchor } : {})} {...(it.ls ? { letterSpacing: it.ls } : {})}>{it.text}</text>
      );
    case "icon":
      return <g transform={`translate(${it.x} ${it.y})`}><Mark name={it.name} size={it.size} fill={it.fill} /></g>;
    case "badge": {
      const inner = Math.round(it.d * 0.6);
      return (
        <g>
          <circle cx={it.cx} cy={it.cy} r={it.d / 2} fill={it.hue.pastel} />
          {isIconKey(it.icon)
            ? <g transform={`translate(${it.cx - inner / 2} ${it.cy - inner / 2})`}><Mark name={it.icon} size={inner} fill={it.hue.strong} /></g>
            : <text x={it.cx} y={it.cy + it.d * 0.12} textAnchor="middle" fontSize={it.d * 0.45} fontWeight={800} fill={it.hue.strong} fontFamily={FONT_FAMILY.sans}>{it.letter}</text>}
        </g>
      );
    }
  }
}

export function TermCardSvg({ layout, label, className }: { layout: CardLayout; label: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="img" aria-label={label} {...(className ? { className } : {})}>
      <rect x={0} y={0} width={layout.width} height={layout.height} fill={layout.colors.bg} />
      {layout.items.map((it, i) => <Drawn key={i} it={it} />)}
    </svg>
  );
}
