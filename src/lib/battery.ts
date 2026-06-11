/**
 * Decode the battery slice of an Apple FindMy advertisement status byte.
 *
 * Our TLSR8232 firmware lays out the byte as:
 *   bits 7:6 = level (0=full, 1=medium, 2=low, 3=empty — Apple convention)
 *   bit  5   = "supports battery" flag (only meaningful when set)
 *   bits 4:0 = unused / reserved
 *
 * Non-battery-aware trackers leave bit 5 clear; in that case we return
 * `null` so the UI can hide the indicator entirely instead of showing a
 * misleading "full".
 */
export type BatteryLevel = "full" | "med" | "low" | "empty";

export interface BatteryReading {
  level: BatteryLevel;
  /** 0–100 ish — convenient for icons/bars. Mirrors level buckets. */
  percent: number;
}

const LEVEL_BY_BITS: BatteryLevel[] = ["full", "med", "low", "empty"];
const PERCENT_BY_LEVEL: Record<BatteryLevel, number> = {
  full: 100,
  med: 60,
  low: 25,
  empty: 5,
};

export function decodeBattery(statusByte: number): BatteryReading | null {
  if ((statusByte & 0x20) === 0) return null;
  const bits = (statusByte >> 6) & 0b11;
  const level = LEVEL_BY_BITS[bits];
  return { level, percent: PERCENT_BY_LEVEL[level] };
}
