/**
 * Apple Grand Slam Authentication (GSA).
 *
 * Status: SCAFFOLD — implementation pending.
 *
 * This file will hold the SRP-6a exchange with Apple's GSA endpoint,
 * which is the hardest part of the whole port. Reference Python:
 *   reference/FindMy/pypush_gsa_icloud.py (biemster) — ~280 lines
 *   reference/macless-haystack/endpoint/register/  — production tweaks
 *
 * Public surface this file will eventually expose:
 *
 *   loginStep1(appleId, password): Promise<GsaState>
 *     → starts SRP, returns intermediate state. If Apple demands 2FA,
 *       state.requires2FA = true and the UI prompts for the SMS code.
 *
 *   loginStep2(state, smsCode): Promise<{ dsid: string, spToken: string, expiresAt: Date }>
 *     → finishes 2FA, returns iCloud mobileme tokens.
 *
 *   refreshToken(dsid, oldSpToken): Promise<{ spToken: string, expiresAt: Date }>
 *     → refresh the searchPartyToken before it expires.
 *
 * Implementation order (see TODO.md):
 *   1. SRP init round-trip — send (username, A, ps=[s2k, s2k_fo]), parse spd
 *   2. derive session key, M1 / M2 verification
 *   3. SPD-encrypted authenticated request wrapper
 *   4. trustFactor/2FA SMS branch
 *   5. mobileme iCloud login -> searchPartyToken
 */

export interface GsaState {
  appleId: string;
  /** SRP A scalar (private), kept in memory between step 1 and step 2 */
  a: Uint8Array;
  /** SRP A public, sent to Apple */
  A: Uint8Array;
  /** Anisette headers used in step 1 — replayed in step 2 */
  anisette: Record<string, string>;
  /** True if Apple returned a 2FA challenge (SMS or trusted device) */
  requires2FA: boolean;
  /** Server B point from Apple, for finishing SRP after 2FA */
  B?: Uint8Array;
  /** Apple's salt for password-to-key derivation */
  salt?: Uint8Array;
  /** "s2k" or "s2k_fo" — Apple's chosen variant from the ps list */
  protocol?: "s2k" | "s2k_fo";
  /** PBKDF2 iteration count Apple wants */
  iter?: number;
}

export async function loginStep1(_appleId: string, _password: string): Promise<GsaState> {
  throw new Error("gsa.loginStep1: not implemented yet");
}

export async function loginStep2(
  _state: GsaState,
  _smsCode: string,
): Promise<{ dsid: string; spToken: string; expiresAt: Date }> {
  throw new Error("gsa.loginStep2: not implemented yet");
}

export async function refreshToken(
  _dsid: string,
  _oldSpToken: string,
): Promise<{ spToken: string; expiresAt: Date }> {
  throw new Error("gsa.refreshToken: not implemented yet");
}
