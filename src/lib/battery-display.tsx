import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react";
import { decodeBattery, type BatteryLevel } from "./battery";

const ICON_BY_LEVEL: Record<BatteryLevel, typeof BatteryFull> = {
  full: BatteryFull,
  med: BatteryMedium,
  low: BatteryLow,
  empty: BatteryWarning,
};

const LABEL_BY_LEVEL: Record<BatteryLevel, string> = {
  full: "Full",
  med: "Medium",
  low: "Low",
  empty: "Empty",
};

/**
 * Compact battery indicator — icon plus optional level label.
 * Renders nothing when `statusByte` indicates the tracker doesn't
 * report battery (firmware leaves bit 5 clear).
 */
export function BatteryIndicator({
  statusByte,
  withLabel = false,
  size = 18,
}: {
  statusByte: number;
  withLabel?: boolean;
  size?: number;
}) {
  const reading = decodeBattery(statusByte);
  if (!reading) return null;
  const Icon = ICON_BY_LEVEL[reading.level];
  return (
    <span className={`batt ${reading.level}`}>
      <Icon size={size} aria-hidden />
      {withLabel && <span>{LABEL_BY_LEVEL[reading.level]}</span>}
    </span>
  );
}
