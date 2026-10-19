"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { activateInvite, loginAdmin, logout, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitAnswer } from "@/lib/submissions";

/**
 * `redirect()` works by throwing a NEXT_REDIRECT error that the framework
 * catches. Throwing it from inside a try/catch would swallow the redirect and
 * leave the user on the page they came from, so every redirect below is
 * deliberately outside the try block.
 */
function errorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return "Enter a valid value and try again.";
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function loginAction(_: { error: string }, form: FormData) {
  let error = "";
  try {
    await activateInvite(z.string().min(8).parse(form.get("inviteCode")));
  } catch (e) {
    error = errorMessage(e, "Unable to sign in.");
  }
  if (!error) redirect("/dashboard");
  return { error };
}
export async function adminLoginAction(_: { error: string }, form: FormData) {
  let error = "";
  try {
    await loginAdmin(
      z.string().email().parse(form.get("email")),
      z.string().min(1).parse(form.get("password")),
    );
  } catch (e) {
    error = errorMessage(e, "Unable to sign in.");
  }
  if (!error) redirect("/dashboard");
  return { error };
}
export async function logoutAction() {
  await logout();
  redirect("/login");
}
export async function submitAction(_: unknown, form: FormData) {
  const user = await requireUser();
  try {
    const challengeVersionId = z
      .string()
      .min(1)
      .parse(form.get("challengeVersionId"));
    const answer = z.string().max(10000).parse(form.get("answer"));
    const result = await submitAnswer(user.id, challengeVersionId, answer);
    revalidatePath("/dashboard");
    revalidatePath("/themes");
    revalidatePath("/progress");
    return result;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof z.ZodError
          ? "Enter a valid answer."
          : "Unable to process this submission. Please try again.",
    };
  }
}
export async function updateInterests(form: FormData) {
  const user = await requireUser();
  const ids = z.array(z.string()).parse(form.getAll("themes"));
  const themes = await db.theme.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const known = new Set(themes.map((t) => t.id));
  const wanted = ids.filter((id) => known.has(id));
  await db.$transaction([
    db.studentInterest.deleteMany({ where: { studentId: user.id } }),
    db.studentInterest.createMany({
      data: wanted.map((themeId) => ({ studentId: user.id, themeId })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/themes");
  redirect("/settings");
}
