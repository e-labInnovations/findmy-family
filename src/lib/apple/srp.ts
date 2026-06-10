/**
 * SRP-6a client tuned for Apple's GSA quirks.
 *
 * Apple's reference server (pypush_gsa_icloud.py) configures pysrp with:
 *   srp.rfc5054_enable()     - pad A/B to byteLength(N) inside u and k
 *   srp.no_username_in_x()   - x = H(s | H(p)), NOT H(s | H(I | ":" | p))
 *
 * Other bits worth flagging up-front:
 *   - K = H(int_to_bytes(S))  with no padding (pysrp's long_to_bytes)
 *   - M1 inputs use int_to_bytes(A), int_to_bytes(B) (no padding either)
 *   - The "password" handed to processChallenge is the PBKDF2 output
 *     (encrypt_password() does the SHA-256 + hex-encode-if-s2k_fo).
 *
 * Group: RFC 5054 N_2048, g = 2, hash = SHA-256.
 */
import { createHash, randomBytes } from "crypto";

const N_HEX = (
  "AC6BDB41324A9A9BF166DE5E1389582FAF72B6651987EE07FC3192943DB56050" +
  "A37329CBB4A099ED8193E0757767A13DD52312AB4B03310DCD7F48A9DA04FD50" +
  "E8083969EDB767B0CF6095179A163AB3661A05FBD5FAAAE82918A9962F0B93B8" +
  "55F97993EC975EEAA80D740ADBF4FF747359D041D5C33EA71D281E446B14773B" +
  "CA97B43A23FB801676BD207A436C6481F1D2B9078717461A5B9D32E688F87748" +
  "544523B524B0D57D5EA77A2775D2ECFA032CFBDBF52FB3786160279004E57AE6" +
  "AF874E7303CE53299CCC041C7BC308D82A5698F3A8D0C38271AE35F8E9DBFBB6" +
  "94B5C803D89F7AE435DE236D525F54759B65E372FCD68EF20FA7111F9E4AFF73"
).toLowerCase();

const N = BigInt("0x" + N_HEX);
const G = 2n;
const N_BYTE_LEN = N_HEX.length / 2;

function sha256(...parts: Uint8Array[]): Buffer {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest();
}

function bigIntToBytes(n: bigint): Buffer {
  if (n === 0n) return Buffer.from([0]);
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex");
}

function padN(n: bigint): Buffer {
  const hex = n.toString(16).padStart(N_BYTE_LEN * 2, "0");
  return Buffer.from(hex, "hex");
}

function bytesToBigInt(b: Uint8Array): bigint {
  if (b.length === 0) return 0n;
  return BigInt("0x" + Buffer.from(b).toString("hex"));
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  base = ((base % mod) + mod) % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function xorBytes(a: Uint8Array, b: Uint8Array): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

const K_MULT = bytesToBigInt(sha256(padN(N), padN(G)));

export class SrpClient {
  private a: bigint;
  readonly A: bigint;
  readonly username: string;

  private M1?: Buffer;
  private K?: Buffer;

  constructor(username: string, aOverride?: bigint) {
    this.username = username;
    this.a = aOverride ?? bytesToBigInt(randomBytes(32));
    this.A = modPow(G, this.a, N);
  }

  /**
   * Big-endian, unpadded A — what gets shipped as `A2k` to Apple.
   */
  getA(): Buffer {
    return bigIntToBytes(this.A);
  }

  /**
   * After Apple returns {s, B, i, sp}:
   *   1. encrypt the user's password (encryptPassword below)
   *   2. call processChallenge(salt, B, encryptedPassword)
   *   3. ship M1 back to Apple
   */
  processChallenge(
    salt: Uint8Array,
    B: bigint,
    encryptedPassword: Uint8Array,
  ): { M1: Buffer; K: Buffer } {
    if (B % N === 0n) throw new Error("SRP: server B is 0 mod N");

    const u = bytesToBigInt(sha256(padN(this.A), padN(B)));
    if (u === 0n) throw new Error("SRP: u is zero");

    // no_username_in_x: pysrp blanks the username but KEEPS the ':' separator
    // in the inner hash. So x = H(s | H(":" | p)), not H(s | H(p)).
    const innerP = sha256(Buffer.concat([Buffer.from(":"), encryptedPassword]));
    const x = bytesToBigInt(sha256(salt, innerP));

    // S = (B - k * g^x) ^ (a + u*x) mod N
    const gx = modPow(G, x, N);
    const kgx = (K_MULT * gx) % N;
    let base = (B - kgx) % N;
    if (base < 0n) base += N;
    const expScalar = this.a + u * x;
    const S = modPow(base, expScalar, N);

    // K = H(int_to_bytes(S)) — pysrp doesn't pad here
    const K = sha256(bigIntToBytes(S));

    // M1 = H(H(N) XOR H(g) | H(I) | s | A | B | K).
    // With rfc5054_enable(), g is PADDED to N's byte length before hashing
    // (pysrp's HNxorg). N is its own width so padding is a no-op for it.
    const hN = sha256(padN(N));
    const hG = sha256(padN(G));
    const xorNG = xorBytes(hN, hG);
    const hI = sha256(Buffer.from(this.username, "utf-8"));

    const M1 = sha256(
      xorNG,
      hI,
      salt,
      bigIntToBytes(this.A),
      bigIntToBytes(B),
      K,
    );

    this.M1 = M1;
    this.K = K;
    return { M1, K };
  }

  /**
   * Apple replies with M2 = H(A | M1 | K). Verify before trusting spd.
   */
  verifyM2(M2: Uint8Array): boolean {
    if (!this.M1 || !this.K) throw new Error("SRP: call processChallenge first");
    const expected = sha256(bigIntToBytes(this.A), this.M1, this.K);
    if (expected.length !== M2.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ M2[i];
    return diff === 0;
  }

  getSessionKey(): Buffer {
    if (!this.K) throw new Error("SRP: no session key yet");
    return this.K;
  }

  /** Debug-only: dump the private SRP scalar a as hex. */
  dumpA(): string {
    return this.a.toString(16);
  }
}

/**
 * Apple's password-stretching step (encrypt_password in pypush).
 *   p = SHA-256(password)
 *   if protocol == "s2k_fo": p = hex(p).encode()  -- 64-byte ASCII hex
 *   return PBKDF2-SHA256(p, salt, iterations, dkLen=32)
 */
export function encryptPassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
  protocol: "s2k" | "s2k_fo",
): Buffer {
  let p: Buffer = sha256(Buffer.from(password, "utf-8"));
  if (protocol === "s2k_fo") p = Buffer.from(p.toString("hex"), "utf-8");

  // Use Node's pbkdf2Sync, SHA-256, 32-byte output.
  // (imported here so SrpClient stays import-free for unit-testability.)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { pbkdf2Sync } = require("crypto");
  return pbkdf2Sync(p, Buffer.from(salt), iterations, 32, "sha256");
}

/**
 * HMAC-SHA256(K, name) — used to derive the AES-CBC key/iv for the
 * "spd" payload Apple sends back. ("extra data key:" / "extra data iv:")
 */
export function deriveSessionSubkey(K: Uint8Array, name: string): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHmac } = require("crypto");
  return createHmac("sha256", Buffer.from(K))
    .update(name, "utf-8")
    .digest();
}
