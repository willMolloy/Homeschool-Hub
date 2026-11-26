/**
 * S12-06: change an answer later, not only with Undo. An ended assignment's edit sheet (Year) and its edit form (Assignments)
 * show "Finished Nov 2" or "Stopped Oct 30" with Change. Change opens the same choices as the question (Yes, finished, Not yet,
 * We stopped) plus Not ended, which opens it again (it waits for an answer again if its end has passed). Each choice but Not
 * ended asks for its day first, as the question does.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../../api/client";
import type { Assignment } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Button } from "../../ui/components";
import { useMe } from "../../auth/AuthProvider";
import { reopen, sheetTitle, type Answer } from "./answers";
import { AnswerForm } from "./CompletionQuestions";
import { endedWords } from "./ended";
import { joinNames } from "./waiting";
import { todayOf } from "./waiting";
import "./completion.css";

const CHOICES: readonly { answer: Answer; label: string }[] = [
  { answer: "finished", label: "Yes, finished" },
  { answer: "notyet", label: "Not yet" },
  { answer: "stopped", label: "We stopped" },
];

/** The sheet itself: open while `assignment` is set. `onChanged` gets the saved assignment. */
export function ChangeEndingSheet({ assignment, names = [], childId, onClose, onChanged, copies = null }: { assignment: Assignment | null; names?: readonly string[]; childId?: string; onClose: () => void; onChanged: (saved: Assignment) => void; copies?: ReactNode }) {
  const me = useMe();
  const today = todayOf(me);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [who, setWho] = useState(childId ?? "everyone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setAnswer(null); setError(null); onClose(); };
  const a = assignment;
  useEffect(() => { setAnswer(null); setError(null); setWho(childId ?? "everyone"); }, [a?.id, childId]);
  const several = (a?.childIds.length ?? 0) > 1 && !childId;
  const target = who === "everyone" ? undefined : who;
  const whoName = target ? (names[a?.childIds.indexOf(target) ?? -1] ?? "they") : (names.length ? joinNames(names) : "they");
  const question = a ? { assignment: a, child: target ? { id: target, name: whoName, color: null, sortOrder: 0, archived: false } : undefined, text: `Did ${whoName} finish ${a.title}?` } : null;
  const notEnded = async () => {
    if (!a) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await reopen(a, target);
      setAnswer(null);
      onChanged(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ResponsiveSheet open={a !== null} onOpenChange={(o) => { if (!o) close(); }} title={a && answer ? sheetTitle(answer, a.title) : a ? `Change ${a.title}` : ""}>
      {a && question && answer === null ? (
        <div className="answer-form">
          <p className="answer-question">{question.text}</p>
          {several ? (
            <fieldset className="choice-list">
              <legend>Who is this for?</legend>
              <label className="choice"><input type="radio" name="end-who" checked={who === "everyone"} onChange={() => setWho("everyone")} /> For everyone</label>
              {a.childIds.map((id, i) => (
                <label className="choice" key={id}><input type="radio" name="end-who" checked={who === id} onChange={() => setWho(id)} /> Just {names[i] ?? "them"}</label>
              ))}
            </fieldset>
          ) : null}
          <p className="answer-question">{a.endedAs ? endedWords(a.endedAs, a.endedOn ?? a.endDate) : "Not ended"}. How did it go?</p>
          {copies}
          <div className="change-choices">
            {CHOICES.map((c) => <Button key={c.answer} variant={c.answer === "finished" ? "primary" : "secondary"} disabled={busy} onClick={() => setAnswer(c.answer)}>{c.label}</Button>)}
            <Button variant="secondary" disabled={busy} onClick={() => void notEnded()}>Not ended</Button>
          </div>
          <p className="hint">Not ended opens it again. It asks you again if its end has passed.</p>
          {error ? <p className="field-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
      {a && question && answer !== null ? (
        <AnswerForm key={answer} q={question} answer={answer} today={today} reopen onSaved={(saved) => { setAnswer(null); onChanged(saved); }} onCancel={() => setAnswer(null)} />
      ) : null}
    </ResponsiveSheet>
  );
}

/** "Finished Nov 2" with Change, for an ended assignment (nothing for an open one). */
export function EndingRow({ assignment, names, onChanged }: { assignment: Assignment; names?: readonly string[]; onChanged: (saved: Assignment) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = (assignment.children?.length ? assignment.children : assignment.childIds.map((id) => ({ childId: id, endDate: assignment.endDate, endedAs: assignment.endedAs, endedOn: assignment.endedOn })))
    .filter((r) => r.endedAs);
  if (rows.length === 0) return null;
  const same = rows.length === assignment.childIds.length && rows.every((r) => r.endedAs === rows[0]!.endedAs && r.endedOn === rows[0]!.endedOn);
  const shown = same ? [rows[0]!] : rows;
  return (
    <>
      {shown.map((r) => (
        <div className="ended-row" data-ended={r.endedAs} key={same ? "all" : r.childId}>
          <span className="ended-text">{!same && names?.[assignment.childIds.indexOf(r.childId)] ? `${names[assignment.childIds.indexOf(r.childId)]} · ` : ""}{endedWords(r.endedAs as "finished" | "stopped", r.endedOn ?? r.endDate)}</span>
          <Button variant="secondary" onClick={() => setOpen(same ? "all" : r.childId)} aria-label={`Change how ${assignment.title} ended`}>Change</Button>
        </div>
      ))}
      <ChangeEndingSheet assignment={open ? assignment : null} names={names} childId={open && open !== "all" ? open : undefined} onClose={() => setOpen(null)} onChanged={(saved) => { setOpen(null); onChanged(saved); }} />
    </>
  );
}
