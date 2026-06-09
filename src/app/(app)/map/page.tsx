import { auth } from "@/auth";

export default async function MapPage() {
  const session = await auth();
  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 650,
          letterSpacing: "-0.01em",
          marginBottom: 8,
        }}
      >
        Map &mdash; placeholder
      </h1>
      <p style={{ color: "var(--text-dim)" }}>
        Signed in as <strong>{session?.user?.email}</strong> ({session?.user?.role}).
        Map view and accessory list come next.
      </p>
    </div>
  );
}
