"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Edit3, X } from "lucide-react";
import { updateFamilyName, type FamilyNameState } from "./actions";

const INIT: FamilyNameState = { ok: false };

/**
 * Inline "tap pencil → input → save" editor for the family name.
 * Admin-only (the server action enforces this); members see a plain
 * read-only row rendered by the caller.
 */
export function FamilyNameEditor({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(updateFamilyName, INIT);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  // Auto-close after the server confirms success.
  useEffect(() => {
    if (state.ok && editing) setEditing(false);
  }, [state.ok, editing]);

  if (!editing) {
    return (
      <button
        type="button"
        className="set-row"
        onClick={() => {
          setValue(current);
          setEditing(true);
        }}
      >
        <span className="set-ico">
          <Edit3 size={18} aria-hidden />
        </span>
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <span className="set-label">Family name</span>
          <span className="faint" style={{ fontSize: 12 }}>
            {current}
          </span>
        </div>
      </button>
    );
  }

  return (
    <form action={formAction} className="set-row" style={{ gap: 8 }}>
      <input
        name="name"
        className="text-field"
        autoFocus
        value={value}
        maxLength={64}
        onChange={(e) => setValue(e.target.value)}
        style={{ flex: 1, height: 40 }}
      />
      <button
        type="button"
        className="icon-btn"
        aria-label="Cancel"
        onClick={() => setEditing(false)}
      >
        <X size={18} aria-hidden />
      </button>
      <button
        type="submit"
        className="icon-btn accent"
        aria-label="Save"
        disabled={pending || value.trim().length === 0}
      >
        <Check size={18} aria-hidden />
      </button>
      {state.message && (
        <span className="auth-err" style={{ marginLeft: 4, fontSize: 12 }}>
          {state.message}
        </span>
      )}
    </form>
  );
}
