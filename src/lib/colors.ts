/**
 * Member / accessory color palette.
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
  { id: "red", label: "Red", hex: "#ef4444", oklch: "oklch(0.64 0.20 22)" },
  { id: "orange", label: "Orange", hex: "#f97316", oklch: "oklch(0.72 0.18 50)" },
  { id: "amber", label: "Amber", hex: "#f59e0b", oklch: "oklch(0.78 0.16 75)" },
  { id: "yellow", label: "Yellow", hex: "#eab308", oklch: "oklch(0.82 0.16 95)" },
  { id: "lime", label: "Lime", hex: "#84cc16", oklch: "oklch(0.78 0.17 125)" },
  { id: "green", label: "Green", hex: "#22c55e", oklch: "oklch(0.72 0.17 150)" },
  { id: "emerald", label: "Emerald", hex: "#10b981", oklch: "oklch(0.68 0.16 165)" },
  { id: "teal", label: "Teal", hex: "#14b8a6", oklch: "oklch(0.70 0.13 185)" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4", oklch: "oklch(0.72 0.13 215)" },
  { id: "sky", label: "Sky", hex: "#0ea5e9", oklch: "oklch(0.70 0.15 235)" },
  { id: "blue", label: "Blue", hex: "#3b82f6", oklch: "oklch(0.64 0.17 255)" },
  { id: "indigo", label: "Indigo", hex: "#6366f1", oklch: "oklch(0.58 0.19 275)" },
  { id: "violet", label: "Violet", hex: "#8b5cf6", oklch: "oklch(0.60 0.20 295)" },
  { id: "purple", label: "Purple", hex: "#a855f7", oklch: "oklch(0.62 0.21 305)" },
  { id: "fuchsia", label: "Fuchsia", hex: "#d946ef", oklch: "oklch(0.66 0.24 330)" },
  { id: "pink", label: "Pink", hex: "#ec4899", oklch: "oklch(0.66 0.20 354)" },
  { id: "rose", label: "Rose", hex: "#f43f5e", oklch: "oklch(0.65 0.21 10)" },
  { id: "brown", label: "Brown", hex: "#a3825b", oklch: "oklch(0.60 0.07 60)" },
  { id: "slate", label: "Slate", hex: "#64748b", oklch: "oklch(0.58 0.03 255)" },
  { id: "graphite", label: "Graphite", hex: "#4b5563", oklch: "oklch(0.48 0.02 255)" },
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
