import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebugFlag } from "../../lib/useDebugFlag";
import { parseBarsOverride, type BarsOverride } from "./layout";

/**
 * S10-04: a developer-only way to try bar heights live: `?debug=1&bars=min,max,curve` (e.g. `bars=6,36,2`) in a dev
 * build. Parents never see it, and a production build ignores it (useDebugFlag is false there).
 */
export function useBarsOverride(): BarsOverride | null {
  const debug = useDebugFlag();
  const [params] = useSearchParams();
  const raw = debug ? params.get("bars") : null;
  return useMemo(() => parseBarsOverride(raw), [raw]);
}
