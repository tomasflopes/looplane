"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  activateInvite,
  getSessionUser,
  loginWithPassword,
  logout,
  requireUser,
} from "@/lib/auth";
import { database } from "@/lib/container";
import { AuthError, setUserPassword } from "@/lib/credentials";
import { submitAnswer } from "@/lib/submissions";

/**
 * `redirect()` works by throwing a NEXT_REDIRECT error that the framework
 * catches. Throwing it from inside a try/catch would swallow the redirect and
 * leave the user on the page they came from, so every redirect below is
 * deliberately outside the try block.
 */
function errorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return "Enter a valid value and try again.";
  // Only our own AuthErrors are written for end users; anything else (a
  // database error, say) must not leak its message into the page.
  if (error instanceof AuthError) return error.message;
  console.error(fallback, error);
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
export async function passwordLoginAction(
  _: { error: string },
  form: FormData,
) {
  let error = "";
  try {
    await loginWithPassword(
      z.string().email().parse(form.get("email")),
      z.string().min(1).max(200).parse(form.get("password")),
    );
  } catch (e) {
    error = errorMessage(e, "Unable to sign in.");
  }
  if (!error) redirect("/dashboard");
  return { error };
}
export async function setPasswordAction(_: { error: string }, form: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  let error = "";
  try {
    const password = z.string().max(200).parse(form.get("password"));
    if (password !== form.get("confirm"))
      throw new AuthError("The two passwords do not match.");
    await setUserPassword(user.id, password);
  } catch (e) {
    error = errorMessage(e, "Unable to save the password.");
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
  await database.themes.replaceInterests(user.id, ids);
  revalidatePath("/dashboard");
  revalidatePath("/themes");
  redirect("/settings");
}
