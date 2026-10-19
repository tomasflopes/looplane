import "server-only";
import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createInviteCode, hashInviteCode } from "@/lib/invites";

const COOKIE = "challenge_session";
const DAYS = 14;
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
export { createInviteCode };
export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url"),
    expiresAt = new Date(Date.now() + DAYS * 86400000);
  await db.session.create({
    data: {
      userId,
      tokenHash: hash(`${env().SESSION_SECRET}:${token}`),
      expiresAt,
    },
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(`${env().SESSION_SECRET}:${token}`) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  // Only touch the row occasionally: every page render would otherwise mean a
  // write on every request.
  const idle = Date.now() - session.lastUsedAt.getTime();
  if (idle > 5 * 60 * 1000)
    await db.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  return session.user;
});
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
export async function logout() {
  const store = await cookies(),
    token = store.get(COOKIE)?.value;
  if (token)
    await db.session.deleteMany({
      where: { tokenHash: hash(`${env().SESSION_SECRET}:${token}`) },
    });
  store.delete(COOKIE);
}
export async function activateInvite(code: string) {
  const codeHash = hashInviteCode(code);
  const user = await db.$transaction(async (tx) => {
    const invite = await tx.inviteCode.findUnique({
      where: { codeHash },
      include: { student: true },
    });
    if (!invite || (invite.expiresAt && invite.expiresAt <= new Date()))
      throw new Error("That invite code is invalid or expired.");
    // Claim the invite with a conditional update. The `usedAt: null` predicate
    // is re-checked after the row lock is taken, so two simultaneous
    // redemptions cannot both succeed.
    const claimed = await tx.inviteCode.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new Error("That invite code has already been used.");
    return invite.student;
  });
  await createSession(user.id);
  return user;
}
export async function loginAdmin(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (
    !user ||
    user.role !== "ADMIN" ||
    !user.passwordHash ||
    !(await bcrypt.compare(password, user.passwordHash))
  )
    throw new Error("Invalid administrator credentials.");
  await createSession(user.id);
}
