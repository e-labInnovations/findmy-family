import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { EditMemberForm } from "./edit-member-form";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const member = await db.user.findUnique({ where: { id } });
  if (!member) notFound();

  return (
    <>
      <div className="top-bar">
        <Link href={`/people/${member.id}`} className="back" aria-label="Back">
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
        <h1>Edit member</h1>
        <span className="spacer" />
      </div>
      <div className="screen-body">
        <EditMemberForm
          member={{
            id: member.id,
            name: member.name,
            email: member.email,
            title: member.title,
            color: member.color,
            role: member.role,
          }}
        />
      </div>
    </>
  );
}
