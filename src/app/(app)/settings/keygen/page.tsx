import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { KeygenClient } from "./keygen-client";

export const dynamic = "force-dynamic";

export default async function KeygenPage() {
  await requireAdmin();
  return (
    <>
      <div className="top-bar">
        <Link href="/settings" className="back" aria-label="Back">
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
        <h1>Generate keys</h1>
        <span className="spacer" />
      </div>
      <div className="screen-body">
        <KeygenClient />
      </div>
    </>
  );
}
