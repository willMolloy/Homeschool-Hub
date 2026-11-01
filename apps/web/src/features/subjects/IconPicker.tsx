/** S8-11: the subject form's icon picker: a chip for each icon, and Letter (the first letter) as the fallback instead of none. 44 px targets. */
import { useId } from "react";
import { SUBJECT_ICON_COMPONENTS, SUBJECT_ICON_KEYS, SUBJECT_ICON_LABELS, type SubjectIconKey } from "./icons";
import { firstLetter } from "./SubjectIcon";
import "./subject-icon.css";

export interface IconPickerProps {
  /** The chosen icon, or null for the letter. */
  value: SubjectIconKey | null;
  onChange: (icon: SubjectIconKey | null) => void;
  /** The subject's name, for the Letter chip's letter. */
  name: string;
}

export function IconPicker({ value, onChange, name }: IconPickerProps) {
  const legend = useId();
  return (
    <fieldset className="icon-picker" aria-labelledby={legend}>
      <legend id={legend}>Icon</legend>
      <div className="icon-picker-chips">
        <label className="icon-chip">
          <input type="radio" name="subject-icon" checked={value === null} onChange={() => onChange(null)} />
          <span className="icon-chip-face" title="Letter"><span className="icon-chip-letter" aria-hidden="true">{firstLetter(name)}</span><span className="sr-only">Letter</span></span>
        </label>
        {SUBJECT_ICON_KEYS.map((k) => {
          const Icon = SUBJECT_ICON_COMPONENTS[k];
          return (
            <label className="icon-chip" key={k}>
              <input type="radio" name="subject-icon" checked={value === k} onChange={() => onChange(k)} />
              <span className="icon-chip-face" title={SUBJECT_ICON_LABELS[k]}><Icon size={22} weight="light" aria-hidden="true" /><span className="sr-only">{SUBJECT_ICON_LABELS[k]}</span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
