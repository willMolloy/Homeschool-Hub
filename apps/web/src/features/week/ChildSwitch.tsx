/**
 * S8b-07 (Will): the one child switch of the week, track and year screens. "All children" comes first and is offered only
 * with two or more children. When every name fits on one line they are chips; when they don't, there is one pill showing
 * the current choice ("All children ▾") that opens a sheet listing all the options, so nothing scrolls sideways.
 */
import { useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import type { Child } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Segmented } from "../../ui/components";
import { useElementWidth } from "../timeline/useElementWidth";
import { useMeasureText } from "../timeline/useMeasureText";
import { NAME_FONT_PX } from "../timeline/names";
import { ALL } from "./useChildChoice";
import "./week.css";

export const ALL_LABEL = "All children";

/** The width the chips need: each is its text (at the chip's font) plus 24 px, at least 44, with the track's padding and gaps. */
export function chipsWidth(labels: readonly string[], measure: (text: string) => number): number {
  const scale = 14.4 / NAME_FONT_PX;
  return 8 + labels.reduce((n, l) => n + Math.max(44, measure(l) * scale * 1.06 + 24), 0) + 2 * (labels.length - 1);
}

export interface ChildSwitchProps {
  kids: readonly Child[];
  /** A child's id, or ALL. */
  value: string | null;
  onChange: (value: string) => void;
}

export function ChildSwitch(props: ChildSwitchProps) {
  // The measuring hook lives in the inner part, which only mounts once there is a box to measure.
  return props.kids.length < 2 || !props.value ? null : <Switch {...props} value={props.value} />;
}

function Switch({ kids, value, onChange }: ChildSwitchProps & { value: string }) {
  const [open, setOpen] = useState(false);
  const measure = useMeasureText();
  const { ref, width } = useElementWidth<HTMLDivElement>(100000);
  const options = [{ value: ALL, label: ALL_LABEL }, ...kids.map((c) => ({ value: c.id, label: c.name }))];
  const fits = chipsWidth(options.map((o) => o.label), measure) <= width;
  const current = options.find((o) => o.value === value) ?? options[0]!;
  return (
    <div ref={ref} className="child-switch">
      {fits ? (
        <Segmented label="Child" value={value} onChange={onChange} options={options} />
      ) : (
        <>
          <button type="button" className="child-pill" aria-haspopup="dialog" aria-label={`Child: ${current.label}`} onClick={() => setOpen(true)}>
            <span>{current.label}</span>
            <CaretDown size={16} weight="light" aria-hidden="true" />
          </button>
          <ResponsiveSheet open={open} onOpenChange={setOpen} title="Whose work?">
            <div className="child-options" role="group" aria-label="Child">
              {options.map((o) => (
                <button key={o.value} type="button" className="child-option" aria-pressed={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}>
                  <span>{o.label}</span>
                  {o.value === value ? <Check size={20} weight="bold" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          </ResponsiveSheet>
        </>
      )}
    </div>
  );
}
