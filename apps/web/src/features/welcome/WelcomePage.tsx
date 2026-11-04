/**
 * S11-01: /welcome, the setup flow for a new family's first sign-in. One question per screen, a progress bar ("Step 2 of 6")
 * and Back; each step brings its own buttons. Six steps (family, children, school days, school year, breaks, subjects), then
 * "You're all set". The step the family is on is saved on the family, so closing the tab and signing in again resumes there.
 * "Finish later" (every step after the children) goes Home for this sign-in; the flow returns at the next one until it is done.
 * A family that is done is sent Home (it never sees this).
 */
import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { apiPatch } from "../../api/client";
import type { FamilySettingsPatch } from "../../api/types";
import { useAuth, useMe } from "../../auth/AuthProvider";
import { Logo } from "../../layout/Logo";
import { Button, Card } from "../../ui/components";
import { saveError } from "../schedule/formBits";
import { setSetupLater } from "./setupLater";
import { ONLY_STEPS, REQUIRED_STEP, SETUP_STEPS, StepContext, StepHeading, type OnlyStep, type StepApi } from "./stepContext";
import { STEP_BODIES } from "./steps";
import "../../ui/forms.css";
import "../home/home.css";
import "./welcome.css";

export function WelcomePage() {
  const me = useMe();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(() => Math.min(SETUP_STEPS, Math.max(1, me.setupStep)));
  const [allSet, setAllSet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** One PATCH, then re-ask /api/me so the saved step and the reminders on Home are what the server holds. */
  const save = useCallback(async (patch: FamilySettingsPatch): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await apiPatch("/api/family", patch);
      await refresh();
      return true;
    } catch (err) {
      setError(saveError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const next = useCallback(async (patch: FamilySettingsPatch = {}): Promise<boolean> => {
    if (step >= SETUP_STEPS) {
      // "All set" is shown before the save lands: once /api/me says done, nothing else would keep this page from sending the family Home.
      setAllSet(true);
      if (await save({ ...patch, setupDone: true })) return true;
      setAllSet(false);
      return false;
    }
    if (!(await save({ ...patch, setupStep: step + 1 }))) return false;
    setStep(step + 1);
    return true;
  }, [save, step]);

  const back = async () => {
    if (step <= 1) return;
    if (await save({ setupStep: step - 1 })) setStep(step - 1);
  };

  const finishLater = () => {
    setSetupLater();
    navigate("/", { replace: true });
  };

  // A reminder on Home reopens one step on its own (a family that is done); the flow itself is not shown again.
  const [params] = useSearchParams();
  const asked = params.get("only");
  const only = me.setupDone === true && asked !== null && Object.hasOwn(ONLY_STEPS, asked) ? (asked as OnlyStep) : null;
  if (only) {
    const OnlyBody = STEP_BODIES[ONLY_STEPS[only]]!;
    const alone: StepApi = {
      step: ONLY_STEPS[only], only: true, busy, fail: setError,
      next: async (patch = {}) => {
        if (Object.keys(patch).length > 0 && !(await save(patch))) return false;
        navigate("/", { replace: true });
        return true;
      },
    };
    return (
      <main className="welcome">
        <header className="welcome-top"><Logo /></header>
        <p className="welcome-back"><Link className="btn btn-quiet" to="/"><span aria-hidden="true">‹ </span>Home</Link></p>
        <Card className="welcome-card">
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <StepContext.Provider value={alone}><OnlyBody /></StepContext.Provider>
        </Card>
      </main>
    );
  }

  // A family that is done never sees the flow (the "all set" screen is shown by the family that has just finished).
  if (me.setupDone !== false && !allSet) return <Navigate to="/" replace />;

  if (allSet) {
    return (
      <main className="welcome">
        <header className="welcome-top"><Logo /></header>
        <Card className="welcome-card">
          <StepHeading>You're all set</StepHeading>
          <p className="welcome-lead">Anything you skipped is waiting in Set up whenever you want it.</p>
          <div className="btn-row"><Button onClick={() => navigate("/", { replace: true })}>Go to Home</Button></div>
        </Card>
      </main>
    );
  }

  const Body = STEP_BODIES[step]!;
  const api: StepApi = { step, only: false, next, busy, fail: setError };
  return (
    <main className="welcome">
      <header className="welcome-top"><Logo /></header>
      <div className="welcome-progress">
        <p className="welcome-step">Step {step} of {SETUP_STEPS}</p>
        <div className="welcome-bar" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={SETUP_STEPS} aria-valuenow={step} aria-valuetext={`Step ${step} of ${SETUP_STEPS}`}>
          <span style={{ width: `${(step / SETUP_STEPS) * 100}%` }} />
        </div>
      </div>
      {step > 1 ? (
        <p className="welcome-back"><button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void back()}><span aria-hidden="true">‹ </span>Back</button></p>
      ) : null}
      <Card className="welcome-card">
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <StepContext.Provider value={api}>
          <Body key={step} />
        </StepContext.Provider>
      </Card>
      {step > REQUIRED_STEP ? (
        <p className="welcome-later"><button type="button" className="btn btn-quiet" onClick={finishLater}>Finish later</button></p>
      ) : null}
    </main>
  );
}
