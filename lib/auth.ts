import "server-only";
import crypto from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { database } from "@/lib/container";
import { authenticate, redeemInvite } from "@/lib/credentials";
import { env } from "@/lib/env";
import { createInviteCode } from "@/lib/invites";

const COOKIE = "challenge_session";
const DAYS = 14;
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
export { createInviteCode };

function cookieSecure() {
  const override = env().COOKIE_SECURE;
  return override ? override === "true" : process.env.NODE_ENV === "production";
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url"),
    expiresAt = new Date(Date.now() + DAYS * 86400000);
  await database.sessions.create({
    userId,
    tokenHash: hash(`${env().SESSION_SECRET}:${token}`),
    expiresAt,
  });
  // Expired rows are useless; sweeping on sign-in keeps the table bounded
  // without needing a scheduler.
  await database.sessions.deleteExpired(new Date());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const found = await database.sessions.findByTokenHash(
    hash(`${env().SESSION_SECRET}:${token}`),
  );
  if (!found || found.session.expiresAt <= new Date()) return null;
  // Only touch the row occasionally: every page render would otherwise mean a
  // write on every request.
  const idle = Date.now() - found.session.lastUsedAt.getTime();
  if (idle > 5 * 60 * 1000)
    await database.sessions.touch(found.session.id, new Date());
  return found.user;
});
/**
 * Signed-in user, fully set up. A student who redeemed an invite but has not
 * chosen a password yet is sent to do that first: without one they could not
 * get back in once the session ends.
 */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.passwordHash) redirect("/set-password");
  return user;
}
export async function logout() {
  const store = await cookies(),
    token = store.get(COOKIE)?.value;
  if (token)
    await database.sessions.deleteByTokenHash(
      hash(`${env().SESSION_SECRET}:${token}`),
    );
  store.delete(COOKIE);
}
export async function activateInvite(code: string) {
  const user = await redeemInvite(code);
  await createSession(user.id);
  return user;
}
export async function loginWithPassword(email: string, password: string) {
  const user = await authenticate(email, password);
  await createSession(user.id);
  return user;
}
