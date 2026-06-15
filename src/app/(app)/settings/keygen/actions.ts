"use server";

import { createECDH, createHash } from "node:crypto";
import { requireAdmin } from "@/lib/auth-helpers";
import { bleMacFromAdvKey } from "@/lib/ble-mac";

export interface GeneratedKeys {
  privateKey: string; // base64, 28 bytes
  advertisementKey: string; // base64, 28 bytes (compressed P-224 X)
  hashedAdvKey: string; // base64, 32 bytes (SHA-256 of advertisementKey)
  bleMac: string; // "AA:BB:CC:DD:EE:FF" derived from advertisementKey[0..5]
  keysFileText: string; // ready-to-save .keys content
}

/**
 * Generate a fresh P-224 FindMy keypair. Mirrors biemster's
 * generate_keys.py output format so the resulting `.keys` text drops
 * into our existing parseKeysText() / drag-drop / paste flows.
 *
 * Admin-only — these keys plus the private scalar would let anyone
 * decrypt this tracker's reports if leaked.
 */
export async function generateKeys(): Promise<GeneratedKeys> {
  await requireAdmin();

  const ecdh = createECDH("secp224r1");
  ecdh.generateKeys();

  let privateKey = ecdh.getPrivateKey();
  // Node can return < 28 bytes when the scalar has leading zeros; pad.
  if (privateKey.length < 28) {
    const padded = Buffer.alloc(28);
    privateKey.copy(padded, 28 - privateKey.length);
    privateKey = padded;
  }

  // getPublicKey() returns uncompressed (0x04 || X || Y). We want X.
  const publicKey = ecdh.getPublicKey();
  const advertisementKey = publicKey.subarray(1, 29);

  const hashedAdvKey = createHash("sha256").update(advertisementKey).digest();

  const privB64 = privateKey.toString("base64");
  const advB64 = advertisementKey.toString("base64");
  const hashB64 = hashedAdvKey.toString("base64");

  const keysFileText =
    `Private key: ${privB64}\n` +
    `Advertisement key: ${advB64}\n` +
    `Hashed adv key: ${hashB64}\n`;

  return {
    privateKey: privB64,
    advertisementKey: advB64,
    hashedAdvKey: hashB64,
    bleMac: bleMacFromAdvKey(advB64) ?? "—",
    keysFileText,
  };
}
