/** Where the assignment form's weight came from (S2b-11). The text functions are pure; the component only adds the Use button. */
import type { WeightSuggestion } from "../../api/types";
import { UNIT_LABELS } from "../../components/unitLabels";
import { formatWeight, weightHint } from "./weightText";

/** ["Margaret"] → "Margaret"; two → "A and B"; more → "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const possessive = (names: readonly string[]) => `${joinNames(names)}'s`;

function learnedSplit(s: WeightSuggestion) {
  return {
    withHistory: s.children.filter((c) => c.usual != null).map((c) => c.name),
    without: s.children.filter((c) => c.usual == null).map((c) => c.name),
  };
}

/** The hint for an untouched field showing the suggestion. */
export function suggestionText(s: WeightSuggestion, subjectName: string): string {
  const w = formatWeight(s.weightPerUnit);
  if (s.source === "child" || s.source === "children") {
    const { withHistory, without } = learnedSplit(s);
    if (without.length === 0) {
      return s.source === "child"
        ? `Using ${possessive(withHistory)} usual weight for ${s.unitType} (${w}).`
        : `Using ${possessive(withHistory)} usual weight (${w}).`;
    }
    return `Using ${possessive(withHistory)} usual weight (${w}). ${joinNames(without)} ${without.length === 1 ? "has" : "have"} no history yet.`;
  }
  if (s.source === "subject") return `Using the ${subjectName} default (${w} per ${UNIT_LABELS[s.unitType].one}).`;
  return `Using the default weight for ${s.unitType} (${w}).`;
}

/** The second sentence after an override: what the suggestion would have been. */
export function overrideText(s: WeightSuggestion, typed: number, subjectName: string): string {
  const w = formatWeight(s.weightPerUnit);
  const mine = `Your weight (${formatWeight(typed)}).`;
  if (s.source === "child" || s.source === "children") return `${mine} ${possessive(learnedSplit(s).withHistory)} usual is ${w}.`;
  if (s.source === "subject") return `${mine} The ${subjectName} default is ${w}.`;
  return `${mine} The default for ${s.unitType} is ${w}.`;
}

interface Props {
  id: string;
  suggestion: WeightSuggestion;
  subjectName: string;
  /** undefined = untouched (or typed the suggestion); a number = the parent's own; null = they cleared the field. */
  typed: number | null | undefined;
  onUse: () => void;
}

export function WeightHint({ id, suggestion, subjectName, typed, onUse }: Props) {
  if (typed === undefined) return <p id={id} className="hint">{suggestionText(suggestion, subjectName)}</p>;
  return (
    <p id={id} className="hint">
      {typed === null ? weightHint(suggestion.unitType) : overrideText(suggestion, typed, subjectName)}{" "}
      <button type="button" className="btn-link" onClick={onUse}>Use {formatWeight(suggestion.weightPerUnit)}</button>
    </p>
  );
}
