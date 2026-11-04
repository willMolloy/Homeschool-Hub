/** S11-06: which hints the family has seen (from /api/me), and marking one seen: saved on the family, so it holds on every device. */
import { useCallback, useState } from "react";
import { apiPatch } from "../../api/client";
import type { TipId } from "../../api/types";
import { useAuth, useMe } from "../../auth/AuthProvider";
import { TIP_IDS, activeTip } from "./tips";

export function useTips() {
  const me = useMe();
  const { refresh } = useAuth();
  // An answer without the field (an older API) means no hints at all, never a hint that cannot be dismissed.
  const stored: readonly TipId[] = me.tipsSeen ?? TIP_IDS;
  const [local, setLocal] = useState<readonly TipId[]>([]);
  const seen = [...new Set([...stored, ...local])];

  /** Mark hints as seen. The bubble goes at once; if the save fails it comes back with the next visit. */
  const markSeen = useCallback(async (...ids: TipId[]) => {
    const next = [...new Set([...stored, ...local, ...ids])];
    setLocal(next);
    try {
      await apiPatch("/api/family", { tipsSeen: next });
      await refresh();
    } catch { /* shown again next time */ }
  }, [stored, local, refresh]);

  const active = useCallback((here: { bars: boolean; edit: boolean; icons: boolean }) => activeTip(seen, here), [seen]);
  return { seen, markSeen, active };
}
