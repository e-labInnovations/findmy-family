import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { colorOklch } from "@/lib/colors";
import { removeMember } from "./actions";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const member = await db.user.findUnique({
    where: { id },
    include: {
      ownerships: {
        include: {
          accessory: { select: { id: true, name: true, type: true, color: true } },
        },
      },
    },
  });
  if (!member) notFound();

  const owned = member.ownerships;

  return (
    <>
      <div className="top-bar">
        <Link href="/people" className="back" aria-label="Back">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1>Member</h1>
        <span className="spacer" />
      </div>

      <div className="screen-body" style={{ gap: 14 }}>
        <div
          className="edit-preview"
          style={{ flexDirection: "column", display: "flex", alignItems: "center" }}
        >
          <span
            className="avatar xl"
            style={{ background: colorOklch(member.color) }}
          >
            {member.initials}
          </span>
          <h2 style={{ marginTop: 12, fontSize: 22, fontWeight: 650 }}>
            {member.name}
          </h2>
          {member.title && (
            <span style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 2 }}>
              {member.title}
            </span>
          )}
          {member.role === "ADMIN" && (
            <span className="badge" style={{ marginTop: 8 }}>
              Family Organizer
            </span>
          )}
        </div>

        <Detail label="Family ID" value={member.email} mono />
        <Detail
          label="Role"
          value={member.role === "ADMIN" ? "Organizer" : "Member"}
        />
        <Detail
          label="Joined"
          value={member.createdAt.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />

        <div style={{ paddingTop: 12 }}>
          <span className="field-label" style={{ padding: "0 4px 8px" }}>
            {owned.length}{" "}
            {owned.length === 1 ? "accessory" : "accessories"}
          </span>
          {owned.length === 0 && (
            <div className="empty-min">No accessories assigned</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {owned.map((o) => (
              <div
                key={o.accessory.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: colorOklch(o.accessory.color),
                  }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 15 }}>{o.accessory.name}</strong>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {o.accessory.type}
                  </div>
                </div>
                {o.isPrimary && <span className="badge">Primary</span>}
              </div>
            ))}
          </div>
        </div>

        {member.role !== "ADMIN" && (
          <form action={removeMember} style={{ marginTop: 20 }}>
            <input type="hidden" name="id" value={member.id} />
            <button type="submit" className="btn danger">
              Remove from family
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <span style={{ color: "var(--text-dim)", fontSize: 14 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontFamily: mono ? "var(--font-mono)" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
