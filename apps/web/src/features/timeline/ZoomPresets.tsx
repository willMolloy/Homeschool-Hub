/**
 * T-05: the zoom presets as one quiet group of toggle buttons. Hidden when only Year makes sense.
 * S7-04: the family's own views are labelled by `labelOf`; a long row scrolls sideways on phones.
 * S7-05: `onEdit` adds a quiet Edit at the end of the row (outside the toggle group), shown even when only Year is left.
 */
import { zoomLabel, type Zoom } from "./zoom";

export interface ZoomPresetsProps {
  zooms: readonly Zoom[];
  value: Zoom;
  onChange: (zoom: Zoom) => void;
  /** The words for a zoom; default: the built-in names. */
  labelOf?: (zoom: Zoom) => string;
  /** S7-05: opens the zoom views editor. */
  onEdit?: () => void;
}

export function ZoomPresets({ zooms, value, onChange, labelOf = (z) => zoomLabel(z), onEdit }: ZoomPresetsProps) {
  if (zooms.length < 2 && !onEdit) return null;
  return (
    <div className="tl-zoom-row">
      {zooms.length >= 2 ? (
        <div className="tl-zoom" role="group" aria-label="Zoom">
          {zooms.map((z) => (
            <button key={z} type="button" aria-pressed={z === value} onClick={() => onChange(z)}>
              {labelOf(z)}
            </button>
          ))}
        </div>
      ) : null}
      {onEdit ? <button type="button" className="tl-zoom-edit" aria-label="Edit zoom views" onClick={onEdit}>Edit</button> : null}
    </div>
  );
}
