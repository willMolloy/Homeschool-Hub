import type { Subject } from "../api/types";
import { perUnitText } from "../components/unitLabels";
import { RosterPage, type RosterExtension } from "../features/roster/RosterPage";
import { SubjectForm, type SubjectValues } from "../features/roster/SubjectForm";

/** S2b-35: subjects carry an optional default bar width; kids don't. */
const subjectExtension: RosterExtension<Subject, SubjectValues> = {
  initialExtra: (item) => ({ defaultWeight: item?.defaultWeight ?? null }),
  renderForm: (props) => <SubjectForm {...props} />,
  renderBadge: (item) =>
    item.defaultWeight ? (
      <span className="tag tag-weight" title="Default bar width">{perUnitText(item.defaultWeight.weightPerUnit, item.defaultWeight.unitType)}</span>
    ) : null,
};

export function SubjectsPage() {
  return <RosterPage title="Subjects" endpoint="/api/subjects" emptyText="No subjects yet." noun="subject" extension={subjectExtension} />;
}
