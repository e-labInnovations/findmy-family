"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, KeyRound, Plus, RefreshCw } from "lucide-react";
import { generateKeys, type GeneratedKeys } from "./actions";

export function KeygenClient() {
  const router = useRouter();
  const [keys, setKeys] = useState<GeneratedKeys | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const next = await generateKeys();
      setKeys(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate keys.");
    } finally {
      setGenerating(false);
    }
  }

  function copy(label: string, value: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(label);
        setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200);
      })
      .catch(() => setError("Clipboard write failed."));
  }

  function download() {
    if (!keys) return;
    const stem = keys.advertisementKey.replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
    const blob = new Blob([keys.keysFileText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stem || "tracker"}.keys`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function useInNewAccessory() {
    if (!keys) return;
    try {
      sessionStorage.setItem(
        "fmf:pending-keys-import",
        JSON.stringify({
          filename: `generated-${Date.now()}.keys`,
          text: keys.keysFileText,
        }),
      );
    } catch {
      // private window — fall through, /map/new still works
    }
    router.push("/map/new");
  }

  if (!keys) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="field-help">
          Generates a fresh P-224 keypair in the same format as biemster&apos;s
          <code style={{ margin: "0 4px" }}>generate_keys.py</code>. Use it to
          flash a tracker without leaving the app, or to test the import flow.
          The private key never leaves this server response — copy or download
          it before navigating away.
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ width: "auto" }}
        >
          <KeyRound size={16} aria-hidden />
          {generating ? "Generating…" : "Generate keypair"}
        </button>
        {error && <div className="auth-err">{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <KeyRow
        label="Private key"
        value={keys.privateKey}
        sensitive
        copied={copied === "Private key"}
        onCopy={() => copy("Private key", keys.privateKey)}
      />
      <KeyRow
        label="Advertisement key"
        value={keys.advertisementKey}
        copied={copied === "Advertisement key"}
        onCopy={() => copy("Advertisement key", keys.advertisementKey)}
      />
      <KeyRow
        label="Hashed adv key"
        value={keys.hashedAdvKey}
        copied={copied === "Hashed adv key"}
        onCopy={() => copy("Hashed adv key", keys.hashedAdvKey)}
      />
      <div className="dd-stat" style={{ paddingTop: 4 }}>
        <span className="muted" style={{ flex: 1 }}>BLE MAC</span>
        <span className="mono" style={{ fontSize: 13 }}>{keys.bleMac}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn primary" onClick={useInNewAccessory} style={{ width: "auto" }}>
          <Plus size={16} aria-hidden /> Use in new accessory
        </button>
        <button type="button" className="btn" onClick={download} style={{ width: "auto" }}>
          <Download size={16} aria-hidden /> Download .keys file
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleGenerate}
          disabled={generating}
          style={{ width: "auto" }}
        >
          <RefreshCw size={16} aria-hidden /> Generate another
        </button>
      </div>

      {error && <div className="auth-err">{error}</div>}

      <p className="field-help" style={{ marginTop: 8 }}>
        These bytes also need to be embedded in the tracker firmware. Use
        <code style={{ margin: "0 4px" }}>tools/prep_fw.py</code> in the
        FindMy-TLSR8232 repo to bake the private key into a firmware binary
        before flashing.
      </p>
    </div>
  );
}

function KeyRow({
  label,
  value,
  sensitive,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="dd-card"
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        margin: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 12, color: "var(--text-dim)", flex: 1, textTransform: "uppercase", letterSpacing: 0.05 }}>
          {label}
          {sensitive && (
            <span style={{ marginLeft: 8, color: "var(--warn)", fontSize: 11 }}>secret</span>
          )}
        </strong>
        <button
          type="button"
          className="icon-btn"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        </button>
      </div>
      <code
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          wordBreak: "break-all",
          color: "var(--text)",
          userSelect: "all",
        }}
      >
        {value}
      </code>
    </div>
  );
}
