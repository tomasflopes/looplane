"use client";
import { useActionState } from "react";

import { setPasswordAction } from "@/app/actions";

const input =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPasswordAction, {
    error: "",
  });
  return (
    <form action={action} className="card mt-8 space-y-4 p-6">
      <div>
        <label htmlFor="password" className="block font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className={input}
        />
        <p className="mt-1 text-xs text-slate-500">At least 10 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="block font-medium">
          Repeat password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={input}
        />
      </div>
      <button
        disabled={pending}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save and continue"}
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
  );
}
