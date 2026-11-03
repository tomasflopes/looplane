import bcrypt from "bcryptjs";

import { database } from "@/lib/container";
import { hashInviteCode } from "@/lib/invites";
import { normalizeEmail, passwordProblem } from "@/lib/password";
import { clearFailures, isThrottled, recordFailure } from "@/lib/throttle";

/**
 * Credential checks, deliberately free of cookies and Next.js so they can be
 * tested against a database. `lib/auth.ts` turns a successful check into a
 * session.
 */
export class AuthError extends Error {}

// Compared against when the email is unknown so that "no such user" and
// "wrong password" cost the same and cannot be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function authenticate(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (await isThrottled(normalized))
    throw new AuthError(
      "Too many failed attempts. Wait 15 minutes and try again, or ask your teacher for a new invite code.",
    );
  const user = await database.users.findByEmail(normalized);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    await recordFailure(normalized);
    throw new AuthError("Incorrect email or password.");
  }
  await clearFailures(normalized);
  return user;
}

/**
 * Consume an invite code. Redeeming one is also a credential reset: any
 * password the student had is cleared and their other sessions are revoked, so
 * "issue a new code" is how a teacher recovers a lost password.
 */
export async function redeemInvite(code: string) {
  const codeHash = hashInviteCode(code);
  return database.transaction(async (r) => {
    const invite = await r.invites.findByCodeHash(codeHash);
    if (!invite || (invite.expiresAt && invite.expiresAt <= new Date()))
      throw new AuthError("That invite code is invalid or expired.");
    if (!(await r.invites.claim(invite.id, new Date())))
      throw new AuthError("That invite code has already been used.");
    await r.sessions.deleteForUser(invite.studentId);
    await r.users.setPasswordHash(invite.studentId, null);
    return { ...invite.student, passwordHash: null };
  });
}

export async function setUserPassword(userId: string, password: string) {
  const problem = passwordProblem(password);
  if (problem) throw new AuthError(problem);
  await database.users.setPasswordHash(userId, await bcrypt.hash(password, 12));
}
