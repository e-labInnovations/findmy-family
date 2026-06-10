/**
 * Member / accessory color palette.
 * Ported from /tmp/findmy_design/findmy/project/data.jsx COLORS.
 *
 * The DB stores the id ("blue", "teal", ...). Rendering looks up the
 * oklch string for use in CSS. Hex is kept around for tooltips and
 * the occasional <svg fill=>.
 */
export interface PaletteColor {
  id: string;
  label: string;
  hex: string;
  oklch: string;
}

export const COLORS: PaletteColor[] = [
  { id: "blue", label: "Blue", hex: "#3b82f6", oklch: "oklch(0.64 0.17 255)" },
  { id: "teal", label: "Teal", hex: "#14b8a6", oklch: "oklch(0.70 0.13 185)" },
  { id: "green", label: "Green", hex: "#22c55e", oklch: "oklch(0.72 0.17 150)" },
  { id: "lime", label: "Lime", hex: "#84cc16", oklch: "oklch(0.78 0.17 125)" },
  { id: "amber", label: "Amber", hex: "#f59e0b", oklch: "oklch(0.78 0.16 75)" },
  { id: "orange", label: "Orange", hex: "#f97316", oklch: "oklch(0.72 0.18 50)" },
  { id: "red", label: "Red", hex: "#ef4444", oklch: "oklch(0.64 0.20 22)" },
  { id: "pink", label: "Pink", hex: "#ec4899", oklch: "oklch(0.66 0.20 354)" },
  { id: "purple", label: "Purple", hex: "#a855f7", oklch: "oklch(0.62 0.21 305)" },
  { id: "indigo", label: "Indigo", hex: "#6366f1", oklch: "oklch(0.58 0.19 275)" },
  { id: "slate", label: "Slate", hex: "#64748b", oklch: "oklch(0.58 0.03 255)" },
];

const byId = new Map(COLORS.map((c) => [c.id, c]));

export function colorOf(id: string): PaletteColor {
  return byId.get(id) ?? COLORS[0];
}

export function colorHex(id: string): string {
  return colorOf(id).hex;
}

export function colorOklch(id: string): string {
  return colorOf(id).oklch;
}

export const DEFAULT_COLOR_ID = "indigo";
