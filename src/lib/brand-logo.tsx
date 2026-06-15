/**
 * App brand mark — line-art pin + home, drawn with currentColor so the
 * surrounding container's text color decides the stroke. Pair with an
 * `.auth-logo` / `.mt-logo` parent that supplies a tinted background.
 *
 * Same geometry as src/app/icon.svg + src/app/apple-icon.svg so the
 * favicon, home-screen icon, and in-app brand mark all match.
 */
export function BrandLogo({
  size = 22,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" />
      <path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" />
      <path d="M18 22v-3" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}
