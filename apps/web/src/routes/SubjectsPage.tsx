import type { Subject } from "../api/types";
import { usualEffortText } from "../components/effortWords";
import { COMMON_SUBJECTS } from "../features/roster/commonSubjects";
import { RosterPage, type RosterExtension } from "../features/roster/RosterPage";
import { weekdayRanges } from "../features/schedule/formBits";
import { SWATCH_SLOTS } from "../features/roster/palette";
import { SubjectBadge } from "../features/subjects/SubjectIcon";
import { SubjectForm, type SubjectValues } from "../features/roster/SubjectForm";

/** S2b-35, S4-06: subjects carry an optional usual effort (S7-17: per unit, "about 30 min a lesson") and usual days; kids don't. */
const subjectExtension: RosterExtension<Subject, SubjectValues> = {
  initialExtra: (item) => ({ defaultWeight: item?.defaultWeight ?? null, defaultWeekdays: item?.defaultWeekdays ?? null, ...(item ? { icon: item.icon } : {}) }),
  renderLead: (item) => <SubjectBadge subject={item} slot={SWATCH_SLOTS[item.color?.toLowerCase() ?? ""] ?? 1} size={28} />,
  renderForm: (props) => <SubjectForm {...props} />,
  renderBadge: (item) => (
    <>
      {item.defaultWeekdays ? <span className="tag tag-weight" title="Usual days">{weekdayRanges(item.defaultWeekdays)}</span> : null}
      {item.defaultWeight ? (
        <span className="tag tag-weight" title="Usual effort">{usualEffortText(item.defaultWeight.unitType, item.defaultWeight.weightPerUnit)}</span>
      ) : null}
    </>
  ),
};

export function SubjectsPage() {
  return <RosterPage title="Subjects" endpoint="/api/subjects" emptyText="No subjects yet." noun="subject" suggestions={{ label: "Add common subjects", names: COMMON_SUBJECTS }} extension={subjectExtension} />;
}
