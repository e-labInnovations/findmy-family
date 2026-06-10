import { requireAdmin } from "@/lib/auth-helpers";
import { AddMemberForm } from "./add-member-form";
import Link from "next/link";

export default async function NewPersonPage() {
  await requireAdmin();
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
        <h1>Add Family Member</h1>
        <span className="spacer" />
      </div>

      <div className="screen-body">
        <AddMemberForm />
      </div>
    </>
  );
}
