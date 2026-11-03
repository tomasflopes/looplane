"use client";
import { useActionState } from "react";

import { deleteStudentAction } from "@/app/admin/actions";

const initial = { ok: false, message: "" };

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [state, action, pending] = useActionState(deleteStudentAction, initial);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Permanently delete ${studentName}? Their submissions and progress are erased and this cannot be undone.`,
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <button
        disabled={pending}
        className="text-xs font-medium text-slate-500 transition hover:text-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.message && !state.ok && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
