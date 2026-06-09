"use client";

import { useActionState, useState } from "react";
import { createAdminAndSignIn, type SetupState } from "./actions";

const initialState: SetupState = { ok: false };

export function SetupForm() {
  const [state, formAction, pending] = useActionState(
    createAdminAndSignIn,
    initialState,
  );
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="auth-field">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <input
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          autoFocus
          required
        />
      </div>

      <div className="auth-field">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@family.id"
          required
        />
      </div>

      <div className="auth-field">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <input
          name="password"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="icon-btn"
          style={{ width: 28, height: 28, background: "transparent" }}
          aria-label={showPw ? "Hide password" : "Show password"}
        >
          {showPw ? "🙈" : "👁"}
        </button>
      </div>

      {state.message && <div className="auth-err">{state.message}</div>}

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Creating family…" : "Create family"}
      </button>
    </form>
  );
}
