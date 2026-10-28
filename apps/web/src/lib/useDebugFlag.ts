import { useSearchParams } from "react-router-dom";

/**
 * Developer extras (the plan's debug heading, as-of field, markers, engine version): a dev build with
 * `?debug=1` (T-03b). Parents never see them.
 */
export function useDebugFlag(): boolean {
  const [params] = useSearchParams();
  return import.meta.env.DEV && params.get("debug") === "1";
}
