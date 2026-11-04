/** S11-02, step 3: which days the family does school. Monday to Friday are ticked to start with; at least one day. */
import { useState, type FormEvent } from "react";
import { useMe } from "../../auth/AuthProvider";
import { Button } from "../../ui/components";
import { WeekdayPicker } from "../schedule/formBits";
import { StepHeading, useStep } from "./stepContext";
import "../schedule/schedule.css";

export function DaysStep() {
  const me = useMe();
  const { next, busy } = useStep();
  const [days, setDays] = useState<number[]>(me.schoolDays);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (days.length === 0) return setError("Pick at least one school day.");
    setError(null);
    await next({ schoolDays: [...days].sort((a, b) => a - b) });
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading>Which days do you do school?</StepHeading>
      <WeekdayPicker legend="School days" value={days} onChange={(d) => { setDays(d); setError(null); }} error={error} />
      <div className="btn-row"><Button type="submit" disabled={busy}>Continue</Button></div>
    </form>
  );
}
