export function CarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden="true" fill="none">
      <path
        d="M18 32h84c2 0 6-2 8-6 1-3-1-6-4-7l-14-4-8-9H42L28 19H14c-4 0-8 3-8 7v4c0 1 1 2 3 2h9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="34" r="7" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="86" cy="34" r="7" stroke="currentColor" strokeWidth="2.2" />
      <path d="M44 20h28l6 8H36l8-8z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
