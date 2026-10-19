"use client";
import { useActionState } from "react";

import { createClassAction } from "@/app/admin/actions";

const initial = { ok: false, message: "" };

export function ClassForm() {
  const [state, action, pending] = useActionState(createClassAction, initial);
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">Create a class</h2>
      <p className="mt-1 text-sm text-slate-600">
        Classes group students so you can see one cohort at a time.
      </p>
      <form action={action} className="mt-4 flex flex-wrap gap-3">
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Period 1"
          className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        />
        <button
          disabled={pending}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create class"}
        </button>
      </form>
      {state.message && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
