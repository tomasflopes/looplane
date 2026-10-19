import crypto from "node:crypto";

/**
 * Invite codes are 96 bits of randomness rendered as 24 uppercase hex
 * characters. The database only ever stores the SHA-256 of the code, so the
 * plaintext is shown to the teacher exactly once.
 */
export function createInviteCode() {
  return crypto.randomBytes(12).toString("hex").toUpperCase();
}

/**
 * The code is normalised before hashing so that a student who types it with
 * surrounding whitespace or in lower case still redeems it.
 */
export function hashInviteCode(code: string) {
  return crypto
    .createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}
