"use client";

import { useActionState, useMemo, useState } from "react";
import { updateMember, type UpdateMemberState } from "../actions";
import { COLORS, colorOklch } from "@/lib/colors";
import { initialsFromName } from "@/lib/initials";

const initialState: UpdateMemberState = { ok: false };

export interface EditableMember {
  id: string;
  name: string;
  email: string;
  title: string | null;
  color: string;
  role: "ADMIN" | "MEMBER";
}

export function EditMemberForm({ member }: { member: EditableMember }) {
  const [state, formAction, pending] = useActionState(updateMember, initialState);
  const [name, setName] = useState(member.name);
  const [color, setColor] = useState(member.color);
  const [showPw, setShowPw] = useState(false);

  const initials = useMemo(
    () => initialsFromName(name) || member.name.slice(0, 2).toUpperCase(),
    [name, member.name],
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column" }}>
      <input type="hidden" name="id" value={member.id} />

      <div className="edit-preview">
        <span className="avatar xl" style={{ background: colorOklch(color) }}>
          {initials}
        </span>
        <span className="faint mono" style={{ fontSize: 12 }}>{member.email}</span>
        {member.role === "ADMIN" && <span className="badge">Family Organizer</span>}
      </div>

      <label className="field-label" htmlFor="name">Full name</label>
      <input
        id="name"
        name="name"
        className="text-field"
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label className="field-label" htmlFor="title">
        Title <span className="field-label-opt">optional</span>
      </label>
      <input
        id="title"
        name="title"
        className="text-field"
        placeholder="e.g. Teen · 16 · Parent"
        defaultValue={member.title ?? ""}
      />

      <label className="field-label" htmlFor="password">
        New password
        <span className="field-label-opt">leave blank to keep current</span>
      </label>
      <div className="text-field with-trail">
        <input
          id="password"
          name="password"
          type={showPw ? "text" : "password"}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
