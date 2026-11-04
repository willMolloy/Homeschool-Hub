/**
 * S12-06: change an answer later, not only with Undo. An ended assignment's edit sheet (Year) and its edit form (Assignments)
 * show "Finished Nov 2" or "Stopped Oct 30" with Change. Change opens the same choices as the question (Yes, finished, Not yet,
 * We stopped) plus Not ended, which opens it again (it waits for an answer again if its end has passed). Each choice but Not
 * ended asks for its day first, as the question does.
 */
import { useState } from "react";
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
export function ChangeEndingSheet({ assignment, names = [], onClose, onChanged }: { assignment: Assignment | null; names?: readonly string[]; onClose: () => void; onChanged: (saved: Assignment) => void }) {
  const me = useMe();
  const today = todayOf(me);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setAnswer(null); setError(null); onClose(); };
  const a = assignment;
  const question = a ? { assignment: a, text: `Did ${names.length ? joinNames(names) : "they"} finish ${a.title}?` } : null;
  const notEnded = async () => {
    if (!a) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await reopen(a);
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
          <p className="answer-question">{a.endedAs ? endedWords(a.endedAs, a.endedOn ?? a.endDate) : "Not ended"}. How did it go?</p>
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
  const [open, setOpen] = useState(false);
  if (!assignment.endedAs) return null;
  return (
    <div className="ended-row" data-ended={assignment.endedAs}>
      <span className="ended-text">{endedWords(assignment.endedAs, assignment.endedOn ?? assignment.endDate)}</span>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`Change how ${assignment.title} ended`}>Change</Button>
      <ChangeEndingSheet assignment={open ? assignment : null} names={names} onClose={() => setOpen(false)} onChanged={(saved) => { setOpen(false); onChanged(saved); }} />
    </div>
  );
}
