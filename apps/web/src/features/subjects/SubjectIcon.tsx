/**
 * S8-11: a subject's mark: its icon, or its first letter when it has none, so a subject is never told apart by colour
 * alone. `SubjectGlyph` is the bare mark (it takes the colour of its surroundings); `SubjectBadge` is the round badge on the
 * subject's pastel with a strong-colour ring (Year's lane badges, S8-07). Both are decorative: the subject's name is
 * always written or given as the accessible name beside them.
 */
import type { CSSProperties } from "react";
import { SUBJECT_ICON_COMPONENTS, isIconKey } from "./icons";
import "./subject-icon.css";

type Named = { name: string; icon?: string | null };

export const firstLetter = (name: string): string => (name.trim()[0] ?? "?").toUpperCase();

export function SubjectGlyph({ subject, size = 18 }: { subject: Named | undefined; size?: number }) {
  if (subject && isIconKey(subject.icon)) {
    const Icon = SUBJECT_ICON_COMPONENTS[subject.icon];
    return <Icon className="bar-icon subject-glyph" size={size} weight="light" aria-hidden="true" />;
  }
  return <span className="bar-icon subject-glyph subject-letter" style={{ width: size, height: size, fontSize: size * 0.72 } as CSSProperties} data-letter={firstLetter(subject?.name ?? "")} aria-hidden="true" />;
}

export function SubjectBadge({ subject, slot, size = 24, label }: { subject: Named | undefined; slot: number; size?: number; label?: string }) {
  const style = { width: size, height: size, "--c": `var(--tl-subject-${slot})`, "--cs": `var(--tl-subject-${slot}-strong)` } as CSSProperties;
  return (
    <span className="subject-badge" style={style} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      <SubjectGlyph subject={subject} size={Math.round(size * 0.6)} />
    </span>
  );
}
