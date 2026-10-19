import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import "server-only";

/**
 * Gate for every admin screen. Non-admins are sent back to their dashboard
 * rather than shown a 403, so a stray link is not a dead end.
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
