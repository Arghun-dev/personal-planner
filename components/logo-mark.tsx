/** Two-tone compass-needle mark. Colors come from `currentColor` so it
 * inherits whatever text color its container sets (e.g. the header's
 * violet badge uses `text-primary-foreground`). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M16 4 L9 16 L16 28 Z" fill="currentColor" />
      <path d="M16 4 L23 16 L16 28 Z" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}
