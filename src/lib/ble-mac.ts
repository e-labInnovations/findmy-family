/**
 * Derive the BLE MAC address an accessory advertises with from its
 * advertisement key (the 28-byte X coordinate of its P-224 public
 * key).
 *
 * On-air, the MAC's high two bits are `11` (random static address
 * per the BLE Core spec). nRF Connect and most scanners display
 * MACs in colon-separated big-endian (`XX:XX:XX:XX:XX:XX`), where
 * the displayed byte 0 corresponds to `advKey[0] | 0xC0`.
 *
 *   display(MAC) = upper2(advKey[0]):advKey[1]:..:advKey[5]
 */
export function bleMacFromAdvKey(advKeyBase64: string): string | null {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(advKeyBase64, "base64");
  } catch {
    return null;
  }
  if (bytes.length < 6) return null;

  const b0 = bytes[0] | 0xc0;
  const parts = [b0, bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]];
  return parts.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
