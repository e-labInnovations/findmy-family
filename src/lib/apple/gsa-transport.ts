/**
 * Low-level plist-over-HTTPS wrapper for Apple's GSA endpoint.
 *
 *   POST https://gsa.apple.com/grandslam/GsService2
 *   Content-Type: text/x-xml-plist
 *
 * Body shape:
 *   { Header: { Version: "1.0.1" },
 *     Request: { cpd: {...}, ...params } }
 *
 * Response:
 *   { Response: { Status: {...}, ...fields } }
 */
import { Agent, fetch as undiciFetch } from "undici";
import { build as plistBuild, parse as plistParse, type PlistValue } from "plist";
import { buildAnisetteEnvelope, buildCpd } from "./gsa-headers";

const GSA_URL = "https://gsa.apple.com/grandslam/GsService2";

// Apple's GSA endpoint presents a cert chain signed by Apple's internal CA,
// which isn't in Node's default trust store. pypush passes verify=False;
// we use a dedicated dispatcher so the relaxation is scoped to this client
// alone (NOT process-global like NODE_TLS_REJECT_UNAUTHORIZED=0).
//
// We import fetch from `undici` directly (not the Node global) because the
// global fetch is wired to Node's bundled undici and rejects dispatcher
// instances from a different undici version with "invalid onRequestStart".
export const appleInsecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});
export { undiciFetch as appleFetch };

const STATIC_HEADERS = {
  "Content-Type": "text/x-xml-plist",
  Accept: "*/*",
  "User-Agent": "akd/1.0 CFNetwork/978.0.7 Darwin/18.7.0",
  "X-MMe-Client-Info":
    "<MacBookPro18,3> <Mac OS X;13.4.1;22F8> <com.apple.AOSKit/282 (com.apple.dt.Xcode/3594.4.19)>",
};

export interface GsaResponse {
  Status: { ec?: number; em?: string; au?: string };
  [key: string]: unknown;
}

export async function gsaAuthenticatedRequest(
  params: Record<string, unknown>,
): Promise<GsaResponse> {
  const cpd = await buildCpd();
  const env = await buildAnisetteEnvelope();

  const body = {
    Header: { Version: "1.0.1" },
    Request: { cpd, ...params },
  };
  // plist v5 needs Buffer fields to be PlistValue.Data — it accepts
  // Node Buffers natively and serializes them as <data> base64.
  const xml = plistBuild(body as PlistValue);

  if (process.env.DUMP_GSA) {
    const op = String((params as Record<string, unknown>).o ?? "x");
    const fs = await import("node:fs");
    fs.writeFileSync(`/tmp/ts_${op}_body.xml`, xml);
    fs.writeFileSync(
      `/tmp/ts_${op}_headers.txt`,
      Object.entries({ ...STATIC_HEADERS, ...env })
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    );
  }

  let resp: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    resp = await undiciFetch(GSA_URL, {
      method: "POST",
      headers: {
        ...STATIC_HEADERS,
        ...env,
      },
      body: xml,
      dispatcher: appleInsecureDispatcher,
    });
  } catch (e) {
    const cause = (e as { cause?: unknown }).cause;
    throw new Error(
      `GSA unreachable: ${(e as Error).message}` +
        (cause ? ` (${String(cause)})` : ""),
    );
  }

  if (!resp.ok) {
    throw new Error(`GSA returned ${resp.status} ${resp.statusText}`);
  }
  const text = await resp.text();
  const parsed = plistParse(text) as unknown as { Response: GsaResponse };
  return parsed.Response;
}
