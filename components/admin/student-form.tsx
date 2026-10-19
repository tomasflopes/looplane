"use client";
import { useActionState, useEffect, useRef } from "react";

import { createStudentAction } from "@/app/admin/actions";
import { CopyButton } from "@/components/copy-button";
import { CheckIcon } from "@/components/icons";

const initial = { ok: false, message: "", inviteCode: "", studentId: "" };

export function StudentForm({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createStudentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.studentId]);

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">Add a student</h2>
      <p className="mt-1 text-sm text-slate-600">
        A one-time invite code is generated straight away. Only a hash of it is
        stored, so it is shown here once and cannot be looked up later.
      </p>

      <form ref={formRef} action={action} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              placeholder="Alice Smith"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="alice@example.com"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label htmlFor="classId" className="block text-sm font-medium">
            Class <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <select
            id="classId"
            name="classId"
            defaultValue=""
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          >
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={pending}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add student and generate code"}
        </button>
      </form>

      {state.inviteCode && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckIcon className="h-4 w-4" />
            {state.message}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm tracking-wider select-all">
              {state.inviteCode}
            </code>
            <CopyButton value={state.inviteCode} variant="light" />
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            This code is shown once. If it is lost, issue a replacement from the
            student list.
          </p>
        </div>
      )}

      {state.message && !state.inviteCode && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
