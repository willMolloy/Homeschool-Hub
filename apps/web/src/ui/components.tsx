/**
 * S8-03: the Soft Paper shared components. Each wraps the one set of classes in `soft-paper.css`
 * (the same classes the older screens already use: `.btn`, `.card`, `.field`), so a screen can use either.
 */
import { forwardRef, useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import "./soft-paper.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";
const BUTTON_CLASS: Record<ButtonVariant, string> = { primary: "btn", secondary: "btn btn-secondary", quiet: "btn btn-quiet" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: fern pill; secondary: cream pill; quiet: text only. */
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", className, type = "button", ...rest }, ref) {
  return <button ref={ref} type={type} className={[BUTTON_CLASS[variant], className].filter(Boolean).join(" ")} {...rest} />;
});

/** A cream card: 14 px corners, a warm hairline, no shadow. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["card", className].filter(Boolean).join(" ")} {...rest} />;
}

/** A pill chip, 44 px high. `selected` is exposed as aria-pressed. */
export function Chip({ selected = false, className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return <button type={type} aria-pressed={selected} className={["chip", className].filter(Boolean).join(" ")} {...rest} />;
}

export interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** "toggle" (default): buttons with aria-pressed. "tabs": switches between two views of one screen (Week | Year). */
  as?: "toggle" | "tabs";
}

/** A segmented control (Frank / Margaret / Both, Week / Year): a pill track with one raised choice. */
export function Segmented<T extends string>({ label, options, value, onChange, className, as = "toggle" }: SegmentedProps<T>) {
  const tabs = as === "tabs";
  return (
    <div role={tabs ? "tablist" : "group"} aria-label={label} className={["segmented", className].filter(Boolean).join(" ")}>
      {options.map((o) => (
        <button key={o.value} type="button" {...(tabs ? { role: "tab", "aria-selected": o.value === value } : { "aria-pressed": o.value === value })}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface ListRowProps {
  title: ReactNode;
  /** One line under the title. */
  description?: ReactNode;
  /** Something before the title: a colour dot or an icon. */
  lead?: ReactNode;
  /** Makes the row a link, with a chevron. */
  to?: string;
  /** Makes the row a button, with a chevron. */
  onClick?: () => void;
  /** Replaces the chevron (e.g. a status). */
  trailing?: ReactNode;
}

/** A list row: lead, title, one-line description, chevron. A link, a button or plain. */
export function ListRow({ title, description, lead, to, onClick, trailing }: ListRowProps) {
  const body = (
    <>
      {lead ? <span className="list-row-lead">{lead}</span> : null}
      <span className="list-row-text">
        <span className="list-row-title">{title}</span>
        {description ? <span className="list-row-desc">{description}</span> : null}
      </span>
      {trailing ?? (to || onClick ? <CaretRight className="list-row-chevron" size={20} weight="light" aria-hidden="true" /> : null)}
    </>
  );
  if (to) return <Link className="list-row" to={to}>{body}</Link>;
  if (onClick) return <button type="button" className="list-row" onClick={onClick}>{body}</button>;
  return <div className="list-row">{body}</div>;
}

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

/** A labelled text, number or date field with its error and hint wired for assistive tech. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, id, ...rest }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  const errId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const described = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input ref={ref} id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={described} {...rest} />
      {hint ? <p id={hintId} className="hint">{hint}</p> : null}
      {error ? <p id={errId} className="field-error" role="alert">{error}</p> : null}
    </div>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SelectField({ label, id, children, ...rest }: SelectFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} {...rest}>{children}</select>
    </div>
  );
}
