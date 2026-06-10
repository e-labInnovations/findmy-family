import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { EditAccessoryForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditAccessoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [acc, members] = await Promise.all([
    db.accessory.findUnique({
      where: { id },
      include: {
        owners: { select: { userId: true, isPrimary: true } },
      },
    }),
    db.user.findMany({
      select: { id: true, name: true, color: true, initials: true, title: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!acc) notFound();

  return (
    <>
      <div className="top-bar">
        <Link href={`/map/${acc.id}`} className="back" aria-label="Back">
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
        <h1>Edit Accessory</h1>
        <span className="spacer" />
      </div>

      <div className="screen-body">
        <EditAccessoryForm
          accessory={{
            id: acc.id,
            name: acc.name,
            type: acc.type,
            color: acc.color,
            ownerIds: acc.owners.map((o) => o.userId),
            primaryOwnerId:
              acc.owners.find((o) => o.isPrimary)?.userId ?? "",
          }}
          members={members}
        />
      </div>
    </>
  );
}
