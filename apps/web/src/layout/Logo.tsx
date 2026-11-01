/** S8-04: the placeholder mark (an open book with a rising sun) and wordmark, in SVG. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="13" fill="var(--tl-primary-soft)" />
      <circle cx="20" cy="21" r="7" fill="var(--tl-subject-1)" stroke="var(--tl-subject-1-strong)" strokeWidth="1.5" />
      <path d="M8 27c4-2.2 8-2.2 12 0 4-2.2 8-2.2 12 0v3c-4-2.2-8-2.2-12 0-4-2.2-8-2.2-12 0z" fill="var(--tl-primary)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <b>Homeschool Hub</b>
    </span>
  );
}
