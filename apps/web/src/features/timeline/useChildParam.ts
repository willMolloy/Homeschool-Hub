/** T-07c: the child filter lives in the URL (`?child=`), so it survives a reload. */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useChildParam(): [string | null, (childId: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback((childId: string | null) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (childId) next.set("child", childId);
      else next.delete("child");
      return next;
    }, { replace: true });
  }, [setParams]);
  return [params.get("child"), set];
}
