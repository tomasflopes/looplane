"use client";
import { useActionState } from "react";

import { deleteClassAction } from "@/app/admin/actions";

const initial = { ok: false, message: "" };

export function DeleteClassButton({
  classId,
  className,
}: {
  classId: string;
  className: string;
}) {
  const [state, action, pending] = useActionState(deleteClassAction, initial);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${className}? The students stay, they just lose this class.`,
          )
        )
          event.preventDefault();
      }}
      className="mt-8"
    >
      <input type="hidden" name="classId" value={classId} />
      <button
        disabled={pending}
        className="text-sm font-medium text-slate-500 transition hover:text-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : `Delete ${className}`}
      </button>
      {state.message && !state.ok && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
