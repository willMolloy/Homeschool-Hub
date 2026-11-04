/**
 * S12-05: how many things need the parent's answer right now, for the needs-you dot on the Home tab and the rail. For now that is
 * only the completion questions (the waiting list of S12-02); a late line or a heavy week is a warning and never counts. It asks
 * for the assignments and children itself (the shell sits outside the pages), and asks again after every plan change (an answer
 * from Home, an edit elsewhere), after an undo and when the parent moves to another screen, so the dot clears the moment the last
 * question is answered without a reload. A failed request means no dot.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { apiGet, onPlanChange } from "../../api/client";
import type { Assignment, Child } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { useUndo } from "../undo/UndoProvider";
import { todayOf, waitingQuestions } from "./waiting";

const NeedsYouContext = createContext(0);
/** How many things need an answer. */
export const useNeedsYou = () => useContext(NeedsYouContext);

/** "Home, 1 thing needs you" / "Home, 2 things need you"; plain "Home" when nothing does. */
export function homeLabel(n: number): string {
  return n <= 0 ? "Home" : `Home, ${n} ${n === 1 ? "thing needs" : "things need"} you`;
}

export function NeedsYouProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const today = todayOf(me);
  const { round } = useUndo();
  const { pathname } = useLocation();
  const [changes, setChanges] = useState(0);
  const [lists, setLists] = useState<{ assignments: Assignment[]; children: Child[] } | null>(null);

  useEffect(() => onPlanChange(() => setChanges((n) => n + 1)), []);
  useEffect(() => {
    let live = true;
    Promise.all([apiGet<Assignment[]>("/api/assignments"), apiGet<Child[]>("/api/children")]).then(
      ([assignments, kids]) => { if (live) setLists({ assignments, children: kids }); },
      () => { if (live) setLists(null); },
    );
    return () => { live = false; };
  }, [changes, round, pathname]);

  const n = lists ? waitingQuestions(lists.assignments, lists.children, today).length : 0;
  return <NeedsYouContext.Provider value={n}>{children}</NeedsYouContext.Provider>;
}
