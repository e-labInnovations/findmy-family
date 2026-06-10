/**
 * Parse the .keys text format produced by biemster/FindMy/generate_keys.py
 * and the macless-haystack key generator. Each file is three lines:
 *
 *   Private key: <base64 28 bytes>
 *   Advertisement key: <base64 28 bytes>
 *   Hashed adv key: <base64 32 bytes>
 *
 * Field order isn't guaranteed; lines may have stray whitespace or
 * CRLF endings. Returns { ok: true, ... } on success or
 * { ok: false, error } on any malformed input.
 */
import { createHash } from "node:crypto";

export interface ParsedKeys {
  privateKey: Buffer; // 28 bytes
  advertisementKey: Buffer; // 28 bytes — compressed P-224 public X
  hashedAdvKey: string; // base64 of SHA-256(advertisementKey) — the Apple lookup id
}

export type ParseResult =
  | { ok: true; keys: ParsedKeys }
  | { ok: false; error: string };

const LINE_RE = /^\s*(Private key|Advertisement key|Hashed adv key)\s*:\s*(\S+)\s*$/i;

export function parseKeysText(text: string): ParseResult {
  const parts: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = raw.match(LINE_RE);
    if (!m) {
      return { ok: false, error: `Unrecognized line: "${raw.trim()}"` };
    }
    parts[m[1].toLowerCase()] = m[2];
  }

  const privB64 = parts["private key"];
  const advB64 = parts["advertisement key"];
  const hashB64 = parts["hashed adv key"];

  if (!privB64) return { ok: false, error: "Missing 'Private key:' line." };
  if (!advB64) return { ok: false, error: "Missing 'Advertisement key:' line." };

  let privateKey: Buffer;
  let advertisementKey: Buffer;
  try {
    privateKey = Buffer.from(privB64, "base64");
    advertisementKey = Buffer.from(advB64, "base64");
  } catch {
    return { ok: false, error: "Couldn't base64-decode key bytes." };
  }
  if (privateKey.length !== 28) {
    return { ok: false, error: `Private key must be 28 bytes (got ${privateKey.length}).` };
  }
  if (advertisementKey.length !== 28) {
    return { ok: false, error: `Advertisement key must be 28 bytes (got ${advertisementKey.length}).` };
  }

  // Always re-derive the hashed adv key from the advertisement key so we
  // catch any mismatch in the user-supplied file before we trust it.
  const derived = createHash("sha256").update(advertisementKey).digest("base64");
  if (hashB64 && hashB64 !== derived) {
    return {
      ok: false,
      error: "The 'Hashed adv key' line doesn't match SHA-256 of the advertisement key. The keyfile may be corrupted.",
    };
  }

  return {
    ok: true,
    keys: { privateKey, advertisementKey, hashedAdvKey: derived },
  };
}
