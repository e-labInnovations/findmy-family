"use client";

import { useActionState } from "react";
import { startAppleLink, verifyAppleCode, type LinkState } from "./actions";

const INIT: LinkState = { step: "creds" };

export default function AppleLinkForm({
  initialStep,
}: {
  initialStep: "creds" | "2fa";
}) {
  const [credsState, credsAction, credsPending] = useActionState<LinkState, FormData>(
    startAppleLink,
    initialStep === "creds" ? INIT : { step: "creds" },
  );
  const [twoFAState, twoFAAction, twoFAPending] = useActionState<LinkState, FormData>(
    verifyAppleCode,
    initialStep === "2fa" ? { step: "2fa" } : INIT,
  );

  // Whichever action ran last decides which screen to show.
  // If 2FA action returned step:"creds" (e.g. expired session), fall back to creds.
  const step =
    twoFAState.step === "2fa"
      ? "2fa"
      : credsState.step === "2fa"
        ? "2fa"
        : "creds";

  if (step === "creds") {
    return (
      <form action={credsAction} className="auth-card" style={{ gap: 14 }}>
        <div className="auth-field">
          <label htmlFor="appleId">Apple ID</label>
          <input
            id="appleId"
            name="appleId"
            type="email"
            autoComplete="email"
            required
            placeholder="you@icloud.com"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {credsState.error && <p className="auth-error">{credsState.error}</p>}
        <button type="submit" className="btn primary" disabled={credsPending}>
          {credsPending ? "Authenticating…" : "Continue"}
        </button>
        <p className="field-help" style={{ marginTop: 8 }}>
          Credentials are sent to Apple via SRP; only the resulting tokens are
          stored, encrypted at rest.
        </p>
      </form>
    );
  }

  return (
    <form action={twoFAAction} className="auth-card" style={{ gap: 14 }}>
      <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
        {twoFAState.mode === "sms"
          ? "Enter the 6-digit code Apple just texted you."
          : "Approve the prompt on a trusted Apple device and enter the code shown."}
      </p>
      <div className="auth-field">
        <label htmlFor="code">Verification code</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={10}
          placeholder="123456"
        />
      </div>
      {twoFAState.error && <p className="auth-error">{twoFAState.error}</p>}
      <button type="submit" className="btn primary" disabled={twoFAPending}>
        {twoFAPending ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
