/**
 * Device / accessory type catalog.
 *
 * The DB stores the id ("phone", "tag", ...); the UI looks up the
 * label and the matching Lucide icon component.
 */
import {
  Backpack,
  Baby,
  Bike,
  Briefcase,
  Camera,
  Car,
  Dog,
  Gamepad2,
  Guitar,
  Headphones,
  KeyRound,
  Laptop,
  type LucideIcon,
  Luggage,
  MapPin,
  Package,
  Plane,
  ShoppingBag,
  Smartphone,
  Tablet,
  Tag,
  Wallet,
  Watch,
} from "lucide-react";

export interface DeviceType {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const DEVICE_TYPES: DeviceType[] = [
  { id: "phone", label: "Phone", Icon: Smartphone },
  { id: "tablet", label: "Tablet", Icon: Tablet },
  { id: "laptop", label: "Laptop", Icon: Laptop },
  { id: "watch", label: "Watch", Icon: Watch },
  { id: "headphones", label: "Headphones", Icon: Headphones },
  { id: "camera", label: "Camera", Icon: Camera },
  { id: "gamepad", label: "Controller", Icon: Gamepad2 },
  { id: "key", label: "Keys", Icon: KeyRound },
  { id: "wallet", label: "Wallet", Icon: Wallet },
  { id: "backpack", label: "Backpack", Icon: Backpack },
  { id: "briefcase", label: "Briefcase", Icon: Briefcase },
  { id: "handbag", label: "Handbag", Icon: ShoppingBag },
  { id: "suitcase", label: "Suitcase", Icon: Luggage },
  { id: "car", label: "Car", Icon: Car },
  { id: "bike", label: "Bike", Icon: Bike },
  { id: "drone", label: "Drone", Icon: Plane },
  { id: "guitar", label: "Guitar", Icon: Guitar },
  { id: "tag", label: "Item Tag", Icon: Tag },
  { id: "box", label: "Package", Icon: Package },
  { id: "pet", label: "Pet", Icon: Dog },
  { id: "kid", label: "Person", Icon: Baby },
];

const byId = new Map(DEVICE_TYPES.map((t) => [t.id, t]));

export function deviceTypeLabel(id: string): string {
  return byId.get(id)?.label ?? id;
}

export function DeviceIcon({
  type,
  size = 22,
  className,
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const t = byId.get(type) ?? DEVICE_TYPES[0];
  const Icon = t.Icon ?? MapPin;
  return <Icon size={size} className={className} strokeWidth={2} aria-hidden />;
}
