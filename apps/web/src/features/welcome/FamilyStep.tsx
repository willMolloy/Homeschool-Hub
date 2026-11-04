/** S11-02, step 1: what to call the family, and which day its week starts on (Monday unless the parent says Sunday). */
import { useState, type FormEvent } from "react";
import type { WeekStart } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { Button, Field, Segmented } from "../../ui/components";
import { StepHeading, useStep } from "./stepContext";

const NAME_MAX = 60;

export function FamilyStep() {
  const me = useMe();
  const { next, busy } = useStep();
  const [name, setName] = useState(me.name);
  const [weekStart, setWeekStart] = useState<WeekStart>(me.weekStart);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const t = name.trim();
    const problem = !t ? "Give your family a name." : t.length > NAME_MAX ? `Names can be up to ${NAME_MAX} characters.` : null;
    setError(problem);
    if (problem) return;
    await next({ name: t, weekStart });
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading>What should we call your family?</StepHeading>
      <Field label="Family name" type="text" value={name} maxLength={80} autoComplete="off" error={error} onChange={(e) => setName(e.target.value)} />
      <p className="welcome-label">Our week starts on</p>
      <Segmented label="Our week starts on" value={weekStart} onChange={setWeekStart} options={[{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }]} />
      <div className="btn-row"><Button type="submit" disabled={busy}>Continue</Button></div>
    </form>
  );
}
