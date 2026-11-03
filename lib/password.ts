export const MIN_PASSWORD_LENGTH = 10;
// bcrypt only looks at the first 72 bytes. Rejecting longer input is honest;
// silently truncating it would let two different passwords collide.
export const MAX_PASSWORD_BYTES = 72;

/** Returns a message for the first problem found, or null if acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES)
    return "That password is too long (72 bytes at most).";
  if (/^(.)\1+$/.test(password)) return "Choose a less repetitive password.";
  return null;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
