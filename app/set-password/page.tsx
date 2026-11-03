import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/set-password-form";
import { getSessionUser } from "@/lib/auth";

export default async function SetPasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.passwordHash) redirect("/dashboard");
  return (
    <section className="mx-auto mt-8 max-w-md sm:mt-16">
      <p className="eyebrow">One last step</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Choose a password, {user.name}
      </h1>
      <p className="mt-3 text-slate-600">
        You will use your email and this password to sign in from now on.
      </p>
      <SetPasswordForm />
    </section>
  );
}
