/**
 * Anisette client.
 *
 * Anisette server (dadoum/anisette-v3-server) runs in Docker on
 * port 6969 and exposes Apple Mac fingerprint headers required for
 * GSA authentication. We just GET /, parse JSON, and pass the
 * headers through on Apple-side requests.
 *
 * The headers it returns include:
 *   X-Apple-I-MD, X-Apple-I-MD-M, X-Apple-I-MD-RINFO,
 *   X-Apple-I-MD-LU, X-Apple-I-SRL-NO,
 *   X-Apple-I-Client-Time, X-Apple-I-TimeZone, X-Apple-Locale,
 *   X-MMe-Client-Info, X-Mme-Device-Id
 *
 * See https://github.com/Dadoum/anisette-v3-server
 */
export type AnisetteHeaders = Record<string, string>;

export async function getAnisetteHeaders(): Promise<AnisetteHeaders> {
  // Prefer 127.0.0.1 over "localhost" — Node resolves localhost via DNS and
  // may try IPv6 ::1 first, which Docker-bound containers usually don't listen on.
  const url = process.env.ANISETTE_URL || "http://127.0.0.1:6969";
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    const cause = (e as { cause?: unknown }).cause;
    throw new Error(
      `anisette ${url} unreachable: ${(e as Error).message}` +
        (cause ? ` (${String(cause)})` : ""),
    );
  }
  if (!resp.ok) {
    throw new Error(`anisette ${url} returned ${resp.status} ${resp.statusText}`);
  }
  return (await resp.json()) as AnisetteHeaders;
}
