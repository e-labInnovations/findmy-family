/**
 * Headers and "cpd" (client-provided-data) block that Apple's GSA
 * expects on every request, modeled after pypush_gsa_icloud.py.
 *
 * The two stable per-device UUIDs (USER_ID, DEVICE_ID in pypush) are
 * generated once per process here. For a server-side flow that needs
 * to persist across restarts we'd stash them in the DB; for V1, fresh
 * UUIDs per process work fine because Apple binds them to the
 * provisioning session in the anisette server, not to our app.
 */
import { randomUUID } from "crypto";
import { getAnisetteHeaders, type AnisetteHeaders } from "./anisette";

const USER_ID = randomUUID().toUpperCase();
const DEVICE_ID = randomUUID().toUpperCase();

function metaHeaders(): Record<string, string> {
  const now = new Date();
  now.setMilliseconds(0);
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const tz = `GMT${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;

  return {
    "X-Apple-I-Client-Time": now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    "X-Apple-I-TimeZone": tz,
    loc: "en_US",
    "X-Apple-Locale": "en_US",
    "X-Apple-I-MD-RINFO": "17106176",
    "X-Apple-I-MD-LU": Buffer.from(USER_ID, "utf-8").toString("base64"),
    "X-Mme-Device-Id": DEVICE_ID,
    "X-Apple-I-SRL-NO": "0",
  };
}

/**
 * Anisette OTP + machine-id headers from the local anisette server,
 * merged with meta headers. Used as both top-level HTTP headers AND
 * inside the cpd dict in the request body.
 */
export async function buildAnisetteEnvelope(): Promise<AnisetteHeaders> {
  const ani = await getAnisetteHeaders();
  return {
    "X-Apple-I-MD": ani["X-Apple-I-MD"],
    "X-Apple-I-MD-M": ani["X-Apple-I-MD-M"],
    ...metaHeaders(),
  };
}

/**
 * "cpd" block placed inside every GSA Request body.
 *   bootstrap=true, icscrec=true, pbe=false, prkgen=true, svct=iCloud
 * plus all anisette/meta headers as dict values.
 */
export async function buildCpd(): Promise<Record<string, unknown>> {
  const env = await buildAnisetteEnvelope();
  return {
    bootstrap: true,
    icscrec: true,
    pbe: false,
    prkgen: true,
    svct: "iCloud",
    ...env,
  };
}

export const META = {
  USER_ID,
  DEVICE_ID,
};
