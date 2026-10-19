"use client";
import { useActionState } from "react";

import { adminLoginAction, loginAction } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const [admin, adminAction, adminPending] = useActionState(adminLoginAction, {
    error: "",
  });
  return (
    <section className="mx-auto mt-8 max-w-md sm:mt-16">
      <p className="eyebrow">Learn by solving</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        Welcome to Looplane
      </h1>
      <p className="mt-3 text-slate-600">
        Enter the one-time invite code given to you by your teacher or
        administrator. The code signs you in for fourteen days.
      </p>

      <form action={action} className="card mt-8 space-y-4 p-6">
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
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono tracking-wider uppercase shadow-sm transition placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
        </div>
        <button
          disabled={pending}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Continuing…" : "Continue"}
        </button>
        {state.error && (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            {state.error}
          </p>
        )}
      </form>

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-800">
          Administrator sign in
        </summary>
        <form action={adminAction} className="card mt-3 space-y-3 p-4">
          <input
            aria-label="Administrator email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
          <input
            aria-label="Administrator password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
          <button
            disabled={adminPending}
            className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign in
          </button>
          {admin.error && (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {admin.error}
            </p>
          )}
        </form>
      </details>
    </section>
  );
}
