/** T-05: the three zoom presets as one quiet group of toggle buttons. Hidden when only Year makes sense. */
import { ZOOM_LABEL, type Zoom } from "./zoom";

export interface ZoomPresetsProps {
  zooms: readonly Zoom[];
  value: Zoom;
  onChange: (zoom: Zoom) => void;
}

export function ZoomPresets({ zooms, value, onChange }: ZoomPresetsProps) {
  if (zooms.length < 2) return null;
  return (
    <div className="tl-zoom" role="group" aria-label="Zoom">
      {zooms.map((z) => (
        <button key={z} type="button" aria-pressed={z === value} onClick={() => onChange(z)}>
          {ZOOM_LABEL[z]}
        </button>
      ))}
    </div>
  );
}
