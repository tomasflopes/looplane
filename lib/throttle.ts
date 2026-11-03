import crypto from "node:crypto";

import { database } from "@/lib/container";

export const MAX_FAILURES = 8;
export const WINDOW_MS = 15 * 60 * 1000;

const keyOf = (raw: string) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/** True while the key has used up its failures inside the current window. */
export async function isThrottled(raw: string, now = new Date()) {
  const row = await database.throttle.get(keyOf(raw));
  if (!row) return false;
  return (
    row.attempts >= MAX_FAILURES &&
    row.windowStart.getTime() > now.getTime() - WINDOW_MS
  );
}

export const recordFailure = (raw: string, now = new Date()) =>
  database.throttle.registerFailure(keyOf(raw), now, WINDOW_MS);

export const clearFailures = (raw: string) =>
  database.throttle.clear(keyOf(raw));
