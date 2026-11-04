/**
 * S11-05, step 6: the subjects. The 14 starter subjects as chips with their icons (none ticked to start with) and "Add your own".
 * Continue creates the ticked ones (the next free colour each, and the icon the name suggests, which the API picks), Skip creates
 * none. Subjects the family already has (it went Back, or closed the tab) show ticked and stay as they are.
 */
import { useRef, useState, type FormEvent } from "react";
import { apiPost } from "../../api/client";
import type { Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { Button, Chip } from "../../ui/components";
import { COMMON_SUBJECTS, findSubjectNamed } from "../roster/commonSubjects";
import { nextUnusedColor } from "../roster/palette";
import { saveError } from "../schedule/formBits";
import { defaultIconFor } from "../subjects/icons";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { StepHeading, useStep } from "./stepContext";

const NAME_MAX = 60;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function SubjectsStep() {
  const { next, busy, fail } = useStep();
  const subjects = useApi<Subject[]>("/api/subjects");
  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState("");
  const [ownError, setOwnError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const have = (subjects.data ?? []).filter((s) => !s.archived);
  // The starter subjects, then the family's own (the ones typed here, and any it already has that are not starters).
  const extra = [...have.map((s) => s.name), ...picked].filter((n, i, all) => !COMMON_SUBJECTS.some((c) => same(c, n)) && all.findIndex((m) => same(m, n)) === i);
  const names = [...COMMON_SUBJECTS, ...extra];
  const exists = (n: string) => !!findSubjectNamed(have, n);
  const isPicked = (n: string) => picked.some((p) => same(p, n));
  const toCreate = picked.filter((p) => !exists(p));

  function toggle(n: string) {
    setPicked((list) => (list.some((p) => same(p, n)) ? list.filter((p) => !same(p, n)) : [...list, n]));
  }

  function addOwn(e: FormEvent) {
    e.preventDefault();
    const t = own.trim();
    if (!t) return;
    if (t.length > NAME_MAX) return setOwnError(`Names can be up to ${NAME_MAX} characters.`);
    if (!exists(t) && !isPicked(t)) setPicked((list) => [...list, COMMON_SUBJECTS.find((c) => same(c, t)) ?? t]);
    setOwn("");
    setOwnError(null);
    input.current?.focus();
  }

  async function go() {
    if (busy || saving) return;
    fail(null);
    setSaving(true);
    try {
      const colors = have.map((s) => s.color);
      for (const name of toCreate) {
        const color = nextUnusedColor(colors);
        const created = await apiPost<Subject>("/api/subjects", { name, color });
        colors.push(created.color ?? color);
        subjects.setData((prev) => [...(prev ?? []), created]);
        setPicked((list) => list.filter((p) => !same(p, name)));
      }
    } catch (err) {
      fail(saveError(err));
      setSaving(false);
      return;
    }
    setSaving(false);
    await next();
  }

  return (
    <div>
      <StepHeading>What will you teach?</StepHeading>
      {subjects.error ? <p className="form-error" role="alert">Couldn't load your subjects. Try again in a moment.</p> : null}
      <div className="welcome-chips" role="group" aria-label="Subjects">
        {names.map((n) => {
          const done = exists(n);
          return (
            <Chip key={n} selected={done || isPicked(n)} disabled={done || busy || saving} onClick={() => toggle(n)}>
              <SubjectGlyph subject={{ name: n, icon: defaultIconFor(n) }} size={18} />
              {n}
            </Chip>
          );
        })}
      </div>
      <form className="welcome-own-subject" onSubmit={addOwn} noValidate>
        <div className="field">
          <label htmlFor="own-subject">Add your own</label>
          <div className="welcome-inline">
            <input ref={input} id="own-subject" type="text" value={own} maxLength={80} autoComplete="off" aria-invalid={ownError ? true : undefined}
              onChange={(e) => { setOwn(e.target.value); setOwnError(null); }} />
            <Button type="submit" variant="secondary" disabled={!own.trim()}>Add</Button>
          </div>
          {ownError ? <p className="field-error" role="alert">{ownError}</p> : null}
        </div>
      </form>
      <div className="btn-row welcome-stack">
        <Button disabled={busy || saving || toCreate.length === 0} onClick={() => void go()}>Continue</Button>
        <Button variant="quiet" disabled={busy || saving} onClick={() => void next()}>Skip</Button>
      </div>
    </div>
  );
}
