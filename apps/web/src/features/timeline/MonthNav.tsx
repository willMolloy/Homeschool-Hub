/** T-05c: ‹ month › for the This month preset. Flips one calendar month at a time within the grid. */
export interface MonthNavProps {
  months: readonly string[];
  value: string;
  onChange: (month: string) => void;
}

const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (m: string) => `${NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

export function MonthNav({ months, value, onChange }: MonthNavProps) {
  const i = months.indexOf(value);
  return (
    <div className="tl-month-nav">
      <button type="button" aria-label="Previous month" disabled={i <= 0} onClick={() => onChange(months[i - 1]!)}>‹</button>
      <span aria-live="polite">{monthName(value)}</span>
      <button type="button" aria-label="Next month" disabled={i < 0 || i >= months.length - 1} onClick={() => onChange(months[i + 1]!)}>›</button>
    </div>
  );
}
