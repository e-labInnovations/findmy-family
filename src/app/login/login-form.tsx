"use client";

import { useActionState, useState } from "react";
import { signInWithCredentials, type LoginState } from "./actions";

const initialState: LoginState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithCredentials,
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
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@family.id"
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
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <input
          name="password"
          type={showPw ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Password"
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
