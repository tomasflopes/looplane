"use client";
import { useActionState } from "react";

import { loginAction, passwordLoginAction } from "@/app/actions";

const input =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none";

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
    >
      {message}
    </p>
  );
}

export default function LoginPage() {
  const [signIn, signInAction, signInPending] = useActionState(
    passwordLoginAction,
    { error: "" },
  );
  const [invite, inviteAction, invitePending] = useActionState(loginAction, {
    error: "",
  });
  return (
    <section className="mx-auto mt-8 max-w-md sm:mt-16">
      <p className="eyebrow">Learn by solving</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        Welcome to Looplane
      </h1>

      <form action={signInAction} className="card mt-8 space-y-4 p-6">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <div>
          <label htmlFor="email" className="block font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="password" className="block font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={input}
          />
        </div>
        <button
          disabled={signInPending}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signInPending ? "Signing in…" : "Sign in"}
        </button>
        <ErrorNote message={signIn.error} />
      </form>

      <form action={inviteAction} className="card mt-4 space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">First time here?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter the invite code from your teacher, then choose a password.
            Lost your password? Ask for a new code: using it lets you pick a new
            one.
          </p>
        </div>
        <div>
          <label htmlFor="inviteCode" className="block font-medium">
            Invite code
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            required
            autoComplete="one-time-code"
            spellCheck={false}
            placeholder="0000000000000000"
            className={`${input} font-mono tracking-wider uppercase placeholder:tracking-normal placeholder:text-slate-400`}
          />
        </div>
        <button
          disabled={invitePending}
          className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {invitePending ? "Continuing…" : "Use invite code"}
        </button>
        <ErrorNote message={invite.error} />
      </form>
    </section>
  );
}
