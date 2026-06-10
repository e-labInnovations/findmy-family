/**
 * Apple Grand Slam Authentication.
 *
 * Two-step SRP-6a + optional 2FA + spd decrypt + mobileme delegation,
 * porting biemster's pypush_gsa_icloud.py to native Node.
 *
 * Surface:
 *   loginInit(appleId, password) -> { kind: "needs-2fa"|"ok", session }
 *   submit2FA(session, code) -> { kind: "ok", session }
 *   finalize(session) -> { dsid, spToken, expiresAt }
 *
 * The opaque `session` is a serializable object the route handler
 * holds in a server-side cookie or short-lived KV between calls.
 */
import { createCipheriv, createDecipheriv } from "crypto";
import { build as plistBuild, parse as plistParse, type PlistValue } from "plist";
import {
  SrpClient,
  encryptPassword,
  deriveSessionSubkey,
} from "./srp";
import {
  gsaAuthenticatedRequest,
  appleInsecureDispatcher,
  appleFetch,
} from "./gsa-transport";
import { buildAnisetteEnvelope } from "./gsa-headers";

// Apple's SPD payload is a bare <dict>...</dict> with no XML/plist wrapper.
// Python's plistlib is lenient and accepts it after just prepending the XML
// declaration + doctype, but the JS `plist` v5 parser requires a top-level
// <plist version="1.0"> element, so we wrap on both sides.
const PLIST_PROLOGUE =
  `<?xml version='1.0' encoding='UTF-8'?>\n` +
  `<!DOCTYPE plist PUBLIC '-//Apple//DTD PLIST 1.0//EN' 'http://www.apple.com/DTDs/PropertyList-1.0.dtd'>\n` +
  `<plist version="1.0">`;
const PLIST_EPILOGUE = `</plist>`;

export type GsaSession =
  | { kind: "needs-2fa"; mode: "trusted-device" | "sms"; adsid: string; idmsToken: string; appleId: string; password: string }
  | { kind: "ok"; spd: Record<string, unknown>; appleId: string };

export interface GsaInitResult {
  status: "ok" | "needs-2fa";
  session: GsaSession;
}

export interface GsaTokens {
  dsid: string;
  spToken: string;
  expiresAt: Date;
}

/**
 * Run SRP through to spd-decrypt. If Apple signals 2FA, returns a
 * session of kind:"needs-2fa" — call submit2FA() then loginInit again
 * (pypush's recursive call). Else returns kind:"ok" with the decrypted
 * spd, ready for finalize().
 */
export async function loginInit(
  appleId: string,
  password: string,
): Promise<GsaInitResult> {
  // SRP_A_HEX forces a deterministic SRP scalar — debug-only, dev only.
  // Refuse in production so a misconfigured env can't strip session randomness.
  const aOverride =
    process.env.NODE_ENV !== "production" && process.env.SRP_A_HEX
      ? BigInt("0x" + process.env.SRP_A_HEX)
      : undefined;
  const srp = new SrpClient(appleId, aOverride);

  const r1 = await gsaAuthenticatedRequest({
    A2k: srp.getA(),
    ps: ["s2k", "s2k_fo"],
    u: appleId,
    o: "init",
  });
  expectOk(r1, "GSA init");

  const sp = r1.sp as string;
  if (sp !== "s2k" && sp !== "s2k_fo") {
    throw new Error(`Unsupported SRP protocol: ${sp}`);
  }

  const salt = toBuffer(r1.s);
  const Bbytes = toBuffer(r1.B);
  const B = bytesToBigInt(Bbytes);
  const iter = r1.i as number;
  // `c` is an opaque session cookie. Apple returns it as <string>, NOT <data>
  // (e.g. "i-68b-d6ea...:NC"). Echo it back as-is — don't try to decode.
  const cookie = r1.c;

  const encryptedPw = encryptPassword(password, salt, iter, sp);
  const { M1, K } = srp.processChallenge(salt, B, encryptedPw);

  if (process.env.GSA_DEBUG) {
    console.log("[gsa] sp=%s iter=%d", sp, iter);
    console.log("[gsa] salt(%dB)=%s", salt.length, salt.toString("hex"));
    console.log("[gsa] B(%dB)=%s", Bbytes.length, Bbytes.toString("hex"));
    console.log("[gsa] A(%dB)=%s", srp.getA().length, srp.getA().toString("hex"));
    console.log("[gsa] a_priv=%s", srp.dumpA());
    console.log("[gsa] encPw(%dB)=%s", encryptedPw.length, encryptedPw.toString("hex"));
    console.log("[gsa] M1=%s", M1.toString("hex"));
    console.log("[gsa] K=%s", K.toString("hex"));
  }

  const r2 = await gsaAuthenticatedRequest({
    c: cookie,
    M1,
    u: appleId,
    o: "complete",
  });
  expectOk(r2, "GSA complete");

  if (!srp.verifyM2(toBuffer(r2.M2))) {
    throw new Error("GSA: M2 verification failed (server impersonation?)");
  }

  const spdBytes = decryptSpd(K, toBuffer(r2.spd));
  if (process.env.GSA_DEBUG) {
    console.log("[gsa] spd(%dB) first120=%s", spdBytes.length, spdBytes.subarray(0, 120).toString("utf-8"));
    console.log("[gsa] spd hex first120=%s", spdBytes.subarray(0, 120).toString("hex"));
  }
  const spd = plistParse(
    PLIST_PROLOGUE + spdBytes.toString("utf-8") + PLIST_EPILOGUE,
  ) as unknown as Record<string, unknown>;

  const au = (r2.Status as { au?: string } | undefined)?.au;
  if (au === "trustedDeviceSecondaryAuth" || au === "secondaryAuth") {
    const mode = au === "secondaryAuth" ? "sms" : "trusted-device";
    return {
      status: "needs-2fa",
      session: {
        kind: "needs-2fa",
        mode,
        adsid: spd.adsid as string,
        idmsToken: spd.GsIdmsToken as string,
        appleId,
        password,
      },
    };
  }
  if (au) {
    throw new Error(`GSA: unknown auth requirement '${au}'`);
  }

  return {
    status: "ok",
    session: { kind: "ok", spd, appleId },
  };
}

/**
 * Submit a 2FA code for either the trusted-device or SMS branch.
 * After this resolves, call loginInit(appleId, password) again — Apple
 * will issue a fresh SRP exchange that no longer demands 2FA.
 */
export async function submit2FA(
  session: Extract<GsaSession, { kind: "needs-2fa" }>,
  code: string,
): Promise<void> {
  const identityToken = Buffer.from(`${session.adsid}:${session.idmsToken}`).toString("base64");
  const env = await buildAnisetteEnvelope();

  if (session.mode === "trusted-device") {
    const baseHeaders = {
      "Content-Type": "text/x-xml-plist",
      "User-Agent": "Xcode",
      Accept: "text/x-xml-plist",
      "Accept-Language": "en-us",
      "X-Apple-Identity-Token": identityToken,
      "X-Apple-App-Info": "com.apple.gs.xcode.auth",
      "X-Xcode-Version": "11.2 (11B41)",
      "X-Mme-Client-Info":
        "<MacBookPro18,3> <Mac OS X;13.4.1;22F8> <com.apple.AOSKit/282 (com.apple.dt.Xcode/3594.4.19)>",
      ...env,
    };
    // prime the trusted-device prompt (response body unused)
    await appleFetch("https://gsa.apple.com/auth/verify/trusteddevice", {
      headers: baseHeaders,
      dispatcher: appleInsecureDispatcher,
    });
    const resp = await appleFetch("https://gsa.apple.com/grandslam/GsService2/validate", {
      headers: { ...baseHeaders, "security-code": code },
      dispatcher: appleInsecureDispatcher,
    });
    if (!resp.ok) throw new Error(`2FA validate failed: ${resp.status} ${resp.statusText}`);
    return;
  }

  // SMS: PUT /auth/verify/phone/ to request, POST /auth/verify/phone/securitycode to submit.
  // pypush hard-codes phoneNumber.id = 1, which is usually right.
  const smsHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "Xcode",
    "Accept-Language": "en-us",
    "X-Apple-Identity-Token": identityToken,
    "X-Apple-App-Info": "com.apple.gs.xcode.auth",
    "X-Xcode-Version": "11.2 (11B41)",
    "X-Mme-Client-Info":
      "<MacBookPro18,3> <Mac OS X;13.4.1;22F8> <com.apple.AOSKit/282 (com.apple.dt.Xcode/3594.4.19)>",
    ...env,
  };
  await appleFetch("https://gsa.apple.com/auth/verify/phone/", {
    method: "PUT",
    headers: smsHeaders,
    body: JSON.stringify({ phoneNumber: { id: 1 }, mode: "sms" }),
    dispatcher: appleInsecureDispatcher,
  });
  const resp = await appleFetch("https://gsa.apple.com/auth/verify/phone/securitycode", {
    method: "POST",
    headers: smsHeaders,
    body: JSON.stringify({
      phoneNumber: { id: 1 },
      mode: "sms",
      securityCode: { code },
    }),
    dispatcher: appleInsecureDispatcher,
  });
  if (!resp.ok) throw new Error(`2FA securitycode failed: ${resp.status} ${resp.statusText}`);
}

/**
 * After loginInit returns kind:"ok", trade the SPD PET for a
 * /acsnservice/fetch-capable searchPartyToken via the iCloud
 * mobileme delegation endpoint.
 */
export async function finalize(
  session: Extract<GsaSession, { kind: "ok" }>,
): Promise<GsaTokens> {
  const spd = session.spd;
  const tBlock = spd.t as { "com.apple.gs.idms.pet"?: { token?: string } } | undefined;
  const pet = tBlock?.["com.apple.gs.idms.pet"]?.token;
  const adsid = spd.adsid as string;
  if (!pet || !adsid) throw new Error("GSA: spd missing PET or adsid");

  const env = await buildAnisetteEnvelope();
  const body = plistBuild({
    "apple-id": session.appleId,
    delegates: { "com.apple.mobileme": {} },
    password: pet,
    "client-id": adsid,
  } as PlistValue);

  const basic = Buffer.from(`${session.appleId}:${pet}`).toString("base64");
  const resp = await appleFetch("https://setup.icloud.com/setup/iosbuddy/loginDelegates", {
    method: "POST",
    headers: {
      "Content-Type": "text/x-xml-plist",
      "X-Apple-ADSID": adsid,
      Authorization: `Basic ${basic}`,
      "User-Agent": "com.apple.iCloudHelper/282 CFNetwork/1408.0.4 Darwin/22.5.0",
      "X-Mme-Client-Info":
        "<MacBookPro18,3> <Mac OS X;13.4.1;22F8> <com.apple.AOSKit/282 (com.apple.accountsd/113)>",
      ...env,
    },
    body,
    dispatcher: appleInsecureDispatcher,
  });
  if (!resp.ok) throw new Error(`mobileme login failed: ${resp.status} ${resp.statusText}`);

  const text = await resp.text();
  const parsed = plistParse(text) as unknown as {
    dsid?: string | number;
    delegates?: {
      "com.apple.mobileme"?: {
        "service-data"?: {
          tokens?: { searchPartyToken?: string };
        };
      };
    };
  };

  const sd = parsed.delegates?.["com.apple.mobileme"]?.["service-data"];
  const spToken = sd?.tokens?.searchPartyToken;
  // biemster's request_reports.py reads mobileme['dsid'] at the top level.
  const dsidRaw = parsed.dsid;
  const dsid = dsidRaw == null ? undefined : String(dsidRaw);
  if (!spToken || !dsid) throw new Error("mobileme response missing searchPartyToken/dsid");

  // Apple doesn't document a TTL; pypush re-auths on 401. We expire
  // after 30 days to force a periodic refresh.
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return { dsid, spToken, expiresAt };
}

function decryptSpd(K: Uint8Array, ciphertext: Uint8Array): Buffer {
  const aesKey = deriveSessionSubkey(K, "extra data key:");
  const aesIv = deriveSessionSubkey(K, "extra data iv:").subarray(0, 16);
  const decipher = createDecipheriv("aes-256-cbc", aesKey, aesIv);
  decipher.setAutoPadding(true);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function expectOk(r: { Status?: { ec?: number; em?: string } }, where: string): void {
  const ec = r.Status?.ec;
  if (ec !== undefined && ec !== 0) {
    throw new Error(`${where}: Apple returned ec=${ec} em=${r.Status?.em ?? "(none)"}`);
  }
}

function toBuffer(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (typeof v === "string") return Buffer.from(v, "base64");
  throw new Error(`expected Buffer/Uint8Array/string, got ${typeof v}`);
}

function bytesToBigInt(b: Uint8Array): bigint {
  if (b.length === 0) return 0n;
  return BigInt("0x" + Buffer.from(b).toString("hex"));
}

// Silence unused-import warning — only kept here because the encrypt
// helper for re-encrypting tokens may live in this module later.
void createCipheriv;
