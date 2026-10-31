/**
 * T-05: the zoom presets as one quiet group of toggle buttons. Hidden when only Year makes sense.
 * S7-04: the family's own views are labelled by `labelOf`; a long row scrolls sideways on phones.
 */
import { zoomLabel, type Zoom } from "./zoom";

export interface ZoomPresetsProps {
  zooms: readonly Zoom[];
  value: Zoom;
  onChange: (zoom: Zoom) => void;
  /** The words for a zoom; default: the built-in names. */
  labelOf?: (zoom: Zoom) => string;
}

export function ZoomPresets({ zooms, value, onChange, labelOf = (z) => zoomLabel(z) }: ZoomPresetsProps) {
  if (zooms.length < 2) return null;
  return (
    <div className="tl-zoom" role="group" aria-label="Zoom">
      {zooms.map((z) => (
        <button key={z} type="button" aria-pressed={z === value} onClick={() => onChange(z)}>
          {labelOf(z)}
        </button>
      ))}
    </div>
  );
}
