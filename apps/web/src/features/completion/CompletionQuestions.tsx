/**
 * S12-03: "Did Frank finish Treasure Island?" on Home. A clear card (not the quiet briefing line) with Yes, finished / Not yet /
 * We stopped. One waiting assignment is the question itself; several are "3 assignments ended", which opens a sheet listing each
 * with the same three choices. A choice opens the sheet's answer form: the day (the stored end for Yes, today for We stopped, a new
 * end for Not yet) in the shared DateField, and Save. Saving removes the question at once and tells Home to re-ask the list; the undo
 * bar offers to take it back (the PATCH is a plan change). The card goes when nothing is waiting.
 */
import { useEffect, useId, useState } from "react";
import type { LocalDate } from "@hh/engine";
import { ApiError } from "../../api/client";
import type { Assignment, Subject } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { formatShort } from "../../lib/dates";
import { SubjectBadge } from "../subjects/SubjectIcon";
import { subjectSlots } from "../timeline/model";
import { Button, Card } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { DAY_LABEL, dayProblem, defaultDay, saveAnswer, sheetTitle, type Answer } from "./answers";
import { joinNames, type WaitingQuestion } from "./waiting";
import "./completion.css";

const CHOICES: readonly { answer: Answer; label: string; primary?: boolean }[] = [
  { answer: "finished", label: "Yes, finished", primary: true },
  { answer: "notyet", label: "Not yet" },
  { answer: "stopped", label: "We stopped" },
];

type Open = { view: "list" } | { view: "answer"; id: string; answer: Answer; back: boolean } | null;

export interface CompletionQuestionsProps {
  questions: readonly WaitingQuestion[];
  subjects: readonly Subject[];
  today: LocalDate;
  /** Called after an answer is saved, so the page asks for the assignments again. */
  onAnswered: () => void;
}

export function CompletionQuestions({ questions, subjects, today, onAnswered }: CompletionQuestionsProps) {
  const [open, setOpen] = useState<Open>(null);
  // Answered ones leave at once, before the list is asked for again. (An undo or a reopen remounts Home, which starts afresh.)
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const left = questions.filter((q) => !gone.has(q.assignment.id));
  const slot = subjectSlots(subjects);
  const subjectOf = (q: WaitingQuestion) => subjects.find((s) => s.id === q.assignment.subjectId);

  useEffect(() => { if (left.length === 0 && open) setOpen(null); }, [left.length, open]);

  if (left.length === 0) return null;

  const answered = (id: string) => {
    setGone((g) => new Set([...g, id]));
    onAnswered();
    // Back to the list while others wait; otherwise the sheet closes (the effect above).
    setOpen((o) => (o && o.view === "answer" && o.back && left.length > 1 ? { view: "list" } : null));
  };
  const current = open && open.view === "answer" ? left.find((q) => q.assignment.id === open.id) : undefined;

  return (
    <section className="home-question" aria-label="A question for you">
      {left.length === 1 ? (
        <OneQuestion q={left[0]!} subject={subjectOf(left[0]!)} slot={slot(left[0]!.assignment.subjectId)} onChoose={(answer) => setOpen({ view: "answer", id: left[0]!.assignment.id, answer, back: false })} />
      ) : (
        <Card className="home-question-card" style={{ "--q-strong": "var(--tl-primary)" } as React.CSSProperties}>
          <div className="home-question-text">
            <h2>{left.length} assignments ended</h2>
            <p className="home-question-sub">{summary(left)}</p>
          </div>
          <div className="home-question-actions">
            <Button onClick={() => setOpen({ view: "list" })}>Answer them</Button>
          </div>
        </Card>
      )}
      <ResponsiveSheet
        open={open !== null}
        onOpenChange={(o) => { if (!o) setOpen(null); }}
        title={open?.view === "answer" && current ? sheetTitle(open.answer, current.assignment.title) : `${left.length} assignments ended`}
      >
        {open?.view === "list" ? (
          <ul className="question-list">
            {left.map((q) => (
              <li key={q.assignment.id}>
                <OneQuestion q={q} subject={subjectOf(q)} slot={slot(q.assignment.subjectId)} row onChoose={(answer) => setOpen({ view: "answer", id: q.assignment.id, answer, back: true })} />
              </li>
            ))}
          </ul>
        ) : null}
        {open?.view === "answer" && current ? (
          <AnswerForm key={`${current.assignment.id}-${open.answer}`} q={current} answer={open.answer} today={today} onSaved={() => answered(current.assignment.id)}
            onCancel={() => setOpen(open.back && left.length > 1 ? { view: "list" } : null)} />
        ) : null}
      </ResponsiveSheet>
    </section>
  );
}

/** "Treasure Island, Aesop's Fables and 1 more" for the several-waiting card. */
function summary(qs: readonly WaitingQuestion[]): string {
  const titles = qs.slice(0, 2).map((q) => q.assignment.title);
  return qs.length > 2 ? `${titles.join(", ")} and ${qs.length - 2} more` : joinNames(titles);
}

/** One question: the subject's mark, the words, when it ended, and the three choices. */
function OneQuestion({ q, subject, slot, row = false, onChoose }: { q: WaitingQuestion; subject: Subject | undefined; slot: number; row?: boolean; onChoose: (a: Answer) => void }) {
  const id = useId();
  const style = { "--q-strong": `var(--tl-subject-${slot}-strong)`, "--q-pastel": `var(--tl-subject-${slot})` } as React.CSSProperties;
  const body = (
    <>
      <div className="home-question-head">
        <SubjectBadge subject={subject} slot={slot} size={40} />
        <div className="home-question-text">
          {row ? <p id={id} className="home-question-title">{q.text}</p> : <h2 id={id}>{q.text}</h2>}
          <p className="home-question-sub">Ended {formatShort(q.assignment.endDate)}</p>
        </div>
      </div>
      <div className="home-question-actions" role="group" aria-labelledby={id}>
        {CHOICES.map((c) => (
          <Button key={c.answer} variant={c.primary ? "primary" : "secondary"} onClick={() => onChoose(c.answer)}
            {...(row ? { "aria-label": `${c.label}: ${q.assignment.title}` } : {})}>
            {c.label}
          </Button>
        ))}
      </div>
    </>
  );
  return row ? <div className="question-row" style={style}>{body}</div> : <Card className="home-question-card" style={style}>{body}</Card>;
}

/** The date for the answer and Save. */
export function AnswerForm({ q, answer, today, reopen = false, onSaved, onCancel }: {
  q: Pick<WaitingQuestion, "assignment" | "text">; answer: Answer; today: LocalDate; reopen?: boolean; onSaved: (saved: Assignment) => void; onCancel: () => void;
}) {
  const a = q.assignment;
  const [day, setDay] = useState<string>(defaultDay(answer, a, today));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const problem = dayProblem(answer, a, day, today);
  const save = async () => {
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveAnswer(answer, a, day, reopen));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save that. Please try again.");
      setBusy(false);
    }
  };
  return (
    <form className="answer-form" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void save(); }} noValidate>
      <p className="answer-question">{q.text}</p>
      <div className="field">
        <label htmlFor={fieldId}>{DAY_LABEL[answer]}</label>
        <DateField id={fieldId} value={day} onChange={(v) => { setDay(v); setError(null); }} aria-invalid={error ? true : undefined} />
        {answer === "notyet" ? <p className="hint">The question comes back after this day.</p> : null}
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </div>
      <div className="btn-row answer-actions">
        <Button type="submit" disabled={busy}>Save</Button>
        <Button variant="quiet" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
