/**
 * Symmetric AES-256-GCM wrapper for secrets stored in Postgres.
 * Used for Accessory.privateKeyEnc and AppleAccount.{dsidEnc, spTokenEnc}.
 *
 * Key comes from env MASTER_KEY (32 bytes hex). Generate via:
 *   openssl rand -hex 32
 *
 * Output format (base64): iv (12B) | ciphertext (N B) | tag (16B)
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const hex = process.env.MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "MASTER_KEY env var missing or not 32-byte hex (64 chars). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptAtRest(plaintext: string | Buffer): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decryptAtRest(encoded: string): Buffer {
  const key = getKey();
  const blob = Buffer.from(encoded, "base64");
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(12, blob.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

export function decryptAtRestString(encoded: string): string {
  return decryptAtRest(encoded).toString("utf8");
}
