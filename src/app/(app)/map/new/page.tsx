import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { AddAccessoryForm } from "./add-form";

export const dynamic = "force-dynamic";

export default async function NewAccessoryPage() {
  await requireAdmin();
  const members = await db.user.findMany({
    select: { id: true, name: true, color: true, initials: true, title: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <div className="top-bar">
        <Link href="/map" className="back" aria-label="Back">
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
        <h1>Add Accessory</h1>
        <span className="spacer" />
      </div>

      <div className="screen-body">
        <AddAccessoryForm members={members} />
      </div>
    </>
  );
}
