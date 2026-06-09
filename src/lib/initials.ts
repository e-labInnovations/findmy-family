/**
 * "Maya Rivera" -> "MR"
 * "alice"       -> "A"
 * ""            -> "?"
 *
 * Matches the convention used in the design (data.jsx).
 */
export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return (
    trimmed
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
