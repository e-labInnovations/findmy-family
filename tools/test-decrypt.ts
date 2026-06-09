/**
 * Offline verification of src/lib/apple/crypto.ts decryptReport().
 *
 * Reads a known encrypted FindMy report (captured earlier from
 * Apple's /acsnservice/fetch via biemster's request_reports.py)
 * and the matching private key, decrypts via our Node port, and
 * asserts the output matches the Python script's output.
 *
 * Usage:
 *   pnpm tsx tools/test-decrypt.ts
 *
 * Inputs hard-coded below from FindMy-TLSR8232/tools/TPnma9C.keys
 * and the row with timestamp=1780675460 from reports.db.
 * Expected output (per the earlier successful Python run):
 *   lat=8.5430796, lng=76.96749, conf=89, status=0
 */
import { decryptReport } from "@/lib/apple/crypto";

const PRIVATE_KEY_B64 = "23aYYOeAfhJjzUDTO9UACvt1V5bRoiKX/oiLdQ==";
const PAYLOAD_B64 =
  "L9MrBAADBAnXaYB9F+tVjRaDkiD46wd4Z/G05yRx+3/X7u/3y+4yDdolai6nZbdJ7jXycDdfMLrLC40+mo4xaLrU56XcSmZJoBKIWR91IgQyb0KNIl578a0=";

const EXPECTED = {
  lat: 8.5430796,
  lng: 76.96749,
  confidence: 89,
  status: 0,
  timestamp: 1780675460,
};

const privateKey = Buffer.from(PRIVATE_KEY_B64, "base64");
if (privateKey.length !== 28) {
  console.error(`private key wrong size: ${privateKey.length} (expected 28)`);
  process.exit(1);
}

const got = decryptReport(PAYLOAD_B64, privateKey);
console.log("decrypted:", got);
console.log("expected: ", EXPECTED);

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const ok =
  close(got.lat, EXPECTED.lat) &&
  close(got.lng, EXPECTED.lng) &&
  got.confidence === EXPECTED.confidence &&
  got.status === EXPECTED.status &&
  got.timestamp === EXPECTED.timestamp;

if (!ok) {
  console.error("\n❌ MISMATCH");
  process.exit(2);
}
console.log("\n✓ decryptReport matches Python reference output.");
