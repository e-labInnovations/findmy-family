"use client";

import { useActionState, useMemo, useState } from "react";
import { addMember, type AddMemberState } from "./actions";
import { COLORS, DEFAULT_COLOR_ID, colorOklch } from "@/lib/colors";
import { initialsFromName } from "@/lib/initials";

const initialState: AddMemberState = { ok: false };

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(addMember, initialState);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR_ID);
  const [showPw, setShowPw] = useState(false);

  const initials = useMemo(() => initialsFromName(name) || "?", [name]);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column" }}>
      <div className="edit-preview">
        <span className="avatar xl" style={{ background: colorOklch(color) }}>
          {initials}
        </span>
      </div>

      <label className="field-label" htmlFor="name">Full name</label>
      <input
        id="name"
        name="name"
        className="text-field"
        placeholder="First Last"
        autoComplete="off"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label className="field-label" htmlFor="email">Family ID (email)</label>
      <input
        id="email"
        name="email"
        type="email"
        className="text-field"
        placeholder="name@family.id"
        autoComplete="off"
        required
      />

      <label className="field-label" htmlFor="password">Password</label>
      <div className="text-field with-trail">
        <input
          id="password"
          name="password"
          type={showPw ? "text" : "password"}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="icon-btn"
          style={{ width: 32, height: 32, background: "transparent" }}
          aria-label={showPw ? "Hide password" : "Show password"}
        >
          {showPw ? "🙈" : "👁"}
        </button>
      </div>

      <label className="field-label" htmlFor="title">Role / description</label>
      <input
        id="title"
        name="title"
        className="text-field"
        placeholder="e.g. Teen · 16"
      />

      <label className="field-label">Avatar color</label>
      <input type="hidden" name="color" value={color} />
      <div className="color-grid">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={"color-opt" + (color === c.id ? " sel" : "")}
            style={{ background: c.oklch }}
            onClick={() => setColor(c.id)}
            title={c.label}
            aria-label={c.label}
            aria-pressed={color === c.id}
          >
            {color === c.id && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <p className="field-help">
        The new member can sign in at this URL with their Family ID and the password
        you set. They&apos;ll see only accessories you&apos;ve assigned to them.
      </p>

      {state.message && (
        <div className="auth-err" style={{ marginTop: 12 }}>
          {state.message}
        </div>
      )}

      <button
        type="submit"
        className="btn"
        disabled={pending}
        style={{ marginTop: 20 }}
      >
        {pending ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}
