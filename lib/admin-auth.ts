import "server-only";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

/**
 * Gate for every admin screen. Non-admins are sent back to their dashboard
 * rather than shown a 403, so a stray link is not a dead end.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
