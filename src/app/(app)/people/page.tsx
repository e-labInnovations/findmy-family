import Link from "next/link";
import { db } from "@/lib/db";
import { colorOklch } from "@/lib/colors";
import { requireUser } from "@/lib/auth-helpers";

export default async function PeoplePage() {
  const me = await requireUser();
  const members = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { ownerships: true } } },
  });
  const isAdmin = me.role === "ADMIN";

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-h1">Family</h1>
          <span className="page-sub">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
        {isAdmin && (
          <Link
            href="/people/new"
            className="icon-btn accent"
            title="Add member"
            aria-label="Add member"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        )}
      </div>

      <div className="screen-body">
        <div className="people-list">
          {members.map((m) => {
            const accCount = m._count.ownerships;
            const target = isAdmin ? `/people/${m.id}` : "#";
            return (
              <Link
                key={m.id}
                href={target}
                className="person-card"
                style={isAdmin ? undefined : { cursor: "default" }}
                aria-disabled={!isAdmin}
              >
                <span
                  className="avatar"
                  style={{ background: colorOklch(m.color) }}
                >
                  {m.initials}
                </span>
                <div className="person-main">
                  <div className="person-top">
                    <strong>{m.name}</strong>
                    {m.role === "ADMIN" && (
                      <span className="badge">Organizer</span>
                    )}
                  </div>
                  {m.title && (
                    <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
                      {m.title}
                    </span>
                  )}
                  <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                    {accCount} {accCount === 1 ? "accessory" : "accessories"}
                  </span>
                </div>
                {isAdmin && (
                  <svg
                    className="drow-chev"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </Link>
            );
          })}
        </div>

        {!isAdmin && (
          <p className="field-help">
            Only the family organizer can add or remove members.
          </p>
        )}
      </div>
    </>
  );
}
