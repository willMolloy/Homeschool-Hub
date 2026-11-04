/** S11-01: the six steps, in order. Each is built in its own ticket (S11-02 to S11-05); steps not built yet are their question and Continue. */
import type { ComponentType } from "react";
import { Button } from "../../ui/components";
import { ChildrenStep } from "./ChildrenStep";
import { DaysStep } from "./DaysStep";
import { FamilyStep } from "./FamilyStep";
import { StepHeading, useStep } from "./stepContext";

function placeholder(title: string): ComponentType {
  return function Step() {
    const { next, busy } = useStep();
    return (
      <>
        <StepHeading>{title}</StepHeading>
        <div className="btn-row"><Button disabled={busy} onClick={() => void next()}>Continue</Button></div>
      </>
    );
  };
}

export const STEP_BODIES: Record<number, ComponentType> = {
  1: FamilyStep,
  2: ChildrenStep,
  3: DaysStep,
  4: placeholder("Your school year"),
  5: placeholder("Breaks"),
  6: placeholder("Subjects"),
};
