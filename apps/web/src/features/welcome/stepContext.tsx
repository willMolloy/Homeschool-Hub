/**
 * S11-01: what the setup flow's frame gives each step (the screen it is on, "next", a busy flag and the alert), and the
 * step's question. In its own file so the steps and the frame can import it without a cycle.
 */
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { FamilySettingsPatch } from "../../api/types";

export const SETUP_STEPS = 6;
/** The step that must be finished (children): Finish later starts after it. */
export const REQUIRED_STEP = 2;

/** What every step gets from the frame. */
export interface StepApi {
  /** 1–6. */
  step: number;
  /** Save `patch` with the step moved on (or finish the flow after the last step), then show the next screen. Resolves true when it saved. */
  next: (patch?: FamilySettingsPatch) => Promise<boolean>;
  /** A request is in flight: steps disable their buttons. */
  busy: boolean;
  /** Show a problem in the frame's alert (a step's own save failed), or clear it. */
  fail: (message: string | null) => void;
}
export const StepContext = createContext<StepApi | null>(null);
export const useStep = (): StepApi => {
  const ctx = useContext(StepContext);
  if (!ctx) throw new Error("useStep must be used inside the setup flow");
  return ctx;
};

/** A step's question. Focus moves here when the step changes, so a screen reader starts at the new question. */
export function StepHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <h1 ref={ref} tabIndex={-1} className="welcome-title">{children}</h1>;
}
