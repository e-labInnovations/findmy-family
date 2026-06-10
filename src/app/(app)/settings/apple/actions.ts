"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { encryptAtRest, decryptAtRest } from "@/lib/crypto-at-rest";
import { loginInit, submit2FA, finalize, type GsaSession } from "@/lib/apple/gsa";

const STATE_COOKIE = "fmf_apple_link";
const STATE_TTL_SECONDS = 10 * 60;

export interface LinkState {
  step: "creds" | "2fa";
  mode?: "trusted-device" | "sms";
  error?: string;
}

const CredsSchema = z.object({
  appleId: z.string().trim().min(3),
  password: z.string().min(1),
});

const TwoFASchema = z.object({
  code: z.string().trim().min(4).max(10),
});

export async function startAppleLink(
  _prev: LinkState | undefined,
  formData: FormData,
): Promise<LinkState> {
  await requireAdmin();

  const parsed = CredsSchema.safeParse({
    appleId: formData.get("appleId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { step: "creds", error: "Enter your Apple ID and password." };

  let result;
  try {
    result = await loginInit(parsed.data.appleId, parsed.data.password);
  } catch (err) {
    return { step: "creds", error: errorMessage(err) };
  }

  if (result.status === "needs-2fa") {
    await stashState(result.session as Extract<GsaSession, { kind: "needs-2fa" }>);
    return { step: "2fa", mode: result.session.kind === "needs-2fa" ? result.session.mode : undefined };
  }

  try {
    const tokens = await finalize(result.session as Extract<GsaSession, { kind: "ok" }>);
    await persistAppleAccount(parsed.data.appleId, tokens);
  } catch (err) {
    return { step: "creds", error: errorMessage(err) };
  }

  await clearState();
  revalidatePath("/settings");
  redirect("/settings");
}

export async function verifyAppleCode(
  _prev: LinkState | undefined,
  formData: FormData,
): Promise<LinkState> {
  await requireAdmin();

  const parsed = TwoFASchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { step: "2fa", error: "Enter the 6-digit code." };

  let stashed: Extract<GsaSession, { kind: "needs-2fa" }>;
  try {
    stashed = await readState();
  } catch {
    return { step: "creds", error: "Session expired — start over." };
  }

  try {
    await submit2FA(stashed, parsed.data.code);
  } catch (err) {
    return { step: "2fa", mode: stashed.mode, error: errorMessage(err) };
  }

  let result;
  try {
    result = await loginInit(stashed.appleId, stashed.password);
  } catch (err) {
    return { step: "2fa", mode: stashed.mode, error: errorMessage(err) };
  }
  if (result.status !== "ok") {
    return { step: "2fa", mode: stashed.mode, error: "Apple still wants 2FA after the code — try again." };
  }

  try {
    const tokens = await finalize(result.session as Extract<GsaSession, { kind: "ok" }>);
    await persistAppleAccount(stashed.appleId, tokens);
  } catch (err) {
    return { step: "2fa", mode: stashed.mode, error: errorMessage(err) };
  }

  await clearState();
  revalidatePath("/settings");
  redirect("/settings");
}

export async function unlinkAppleAccount(): Promise<void> {
  await requireAdmin();
  await db.appleAccount.deleteMany({});
  revalidatePath("/settings");
  redirect("/settings");
}

async function persistAppleAccount(
  appleId: string,
  tokens: { dsid: string; spToken: string; expiresAt: Date },
) {
  await db.appleAccount.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      appleId,
      dsidEnc: encryptAtRest(tokens.dsid),
      spTokenEnc: encryptAtRest(tokens.spToken),
      expiresAt: tokens.expiresAt,
    },
    update: {
      appleId,
      dsidEnc: encryptAtRest(tokens.dsid),
      spTokenEnc: encryptAtRest(tokens.spToken),
      expiresAt: tokens.expiresAt,
    },
  });
}

async function stashState(s: Extract<GsaSession, { kind: "needs-2fa" }>) {
  const payload = JSON.stringify({
    mode: s.mode,
    adsid: s.adsid,
    idmsToken: s.idmsToken,
    appleId: s.appleId,
    password: s.password,
  });
  const enc = encryptAtRest(payload);
  const jar = await cookies();
  jar.set(STATE_COOKIE, enc, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });
}

async function readState(): Promise<Extract<GsaSession, { kind: "needs-2fa" }>> {
  const jar = await cookies();
  const enc = jar.get(STATE_COOKIE)?.value;
  if (!enc) throw new Error("no state");
  const json = decryptAtRest(enc).toString("utf-8");
  const o = JSON.parse(json) as {
    mode: "trusted-device" | "sms";
    adsid: string;
    idmsToken: string;
    appleId: string;
    password: string;
  };
  return { kind: "needs-2fa", ...o };
}

async function clearState() {
  const jar = await cookies();
  jar.delete(STATE_COOKIE);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Apple login failed.";
}
