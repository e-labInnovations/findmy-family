/**
 * Device / accessory types for the family app.
 * Ported from /tmp/findmy_design/findmy/project/data.jsx DEVICE_TYPES.
 *
 * The DB stores the id ("phone", "tag", ...); the UI looks up label
 * and the matching Lucide-style SVG icon name.
 */
export interface DeviceType {
  id: string;
  label: string;
  icon: keyof typeof DEVICE_ICONS;
}

export const DEVICE_ICONS = {
  phone: (
    <path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM12 18h.01" />
  ) as React.ReactNode,
  tablet: (
    <path d="M19 3h-14a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM12 18h.01" />
  ) as React.ReactNode,
  laptop: (
    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
  ) as React.ReactNode,
  watch: (
    <>
      <circle cx="12" cy="12" r="6" />
      <polyline points="12 10 12 12 13 13" />
      <path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05M7.88 16.36l.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05" />
    </>
  ) as React.ReactNode,
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ) as React.ReactNode,
  tag: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ) as React.ReactNode,
  pet: (
    <>
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10z" />
    </>
  ) as React.ReactNode,
  kid: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ) as React.ReactNode,
};

export const DEVICE_TYPES: DeviceType[] = [
  { id: "phone", label: "Phone", icon: "phone" },
  { id: "tablet", label: "Tablet", icon: "tablet" },
  { id: "laptop", label: "Laptop", icon: "laptop" },
  { id: "watch", label: "Watch", icon: "watch" },
  { id: "car", label: "Car", icon: "car" },
  { id: "tag", label: "Item Tag", icon: "tag" },
  { id: "pet", label: "Pet", icon: "pet" },
  { id: "kid", label: "Person", icon: "kid" },
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
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {DEVICE_ICONS[t.icon]}
    </svg>
  );
}
