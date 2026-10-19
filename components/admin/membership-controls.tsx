"use client";
import { useActionState } from "react";

import {
  addStudentToClassAction,
  removeStudentFromClassAction,
} from "@/app/admin/actions";

const initial = { ok: false, message: "" };

export function MembershipControls({
  classId,
  className,
  members,
  candidates,
}: {
  classId: string;
  className: string;
  members: { id: string; name: string }[];
  candidates: { id: string; name: string }[];
}) {
  const [addState, addAction, addPending] = useActionState(
    addStudentToClassAction,
    initial,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeStudentFromClassAction,
    initial,
  );
  const memberIds = new Set(members.map((m) => m.id));
  const available = candidates.filter((c) => !memberIds.has(c.id));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Members</h2>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No students in {className} yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="font-medium text-slate-900">
                  {member.name}
                </span>
                <form action={removeAction}>
                  <input type="hidden" name="classId" value={classId} />
                  <input type="hidden" name="studentId" value={member.id} />
                  <button
                    disabled={removePending}
                    className="text-sm font-medium text-slate-500 transition hover:text-red-700 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {removeState.message && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            {removeState.message}
          </p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Add a student</h2>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Every student is already in {className}.
          </p>
        ) : (
          <form action={addAction} className="mt-4 space-y-3">
            <input type="hidden" name="classId" value={classId} />
            <select
              name="studentId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              <option value="" disabled>
                Choose a student
              </option>
              {available.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <button
              disabled={addPending}
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addPending ? "Adding…" : "Add to class"}
            </button>
          </form>
        )}
        {addState.message && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            {addState.message}
          </p>
        )}
      </section>
    </div>
  );
}
