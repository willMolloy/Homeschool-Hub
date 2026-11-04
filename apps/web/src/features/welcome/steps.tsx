/** S11-01: the six steps of the setup flow, in order (S11-02 to S11-05 built them). */
import type { ComponentType } from "react";
import { BreaksStep } from "./BreaksStep";
import { ChildrenStep } from "./ChildrenStep";
import { DaysStep } from "./DaysStep";
import { FamilyStep } from "./FamilyStep";
import { SubjectsStep } from "./SubjectsStep";
import { YearStep } from "./YearStep";

export const STEP_BODIES: Record<number, ComponentType> = {
  1: FamilyStep,
  2: ChildrenStep,
  3: DaysStep,
  4: YearStep,
  5: BreaksStep,
  6: SubjectsStep,
};
