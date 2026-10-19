"use client";
import { useActionState } from "react";

import { reissueInviteAction } from "@/app/admin/actions";
import { CopyButton } from "@/components/copy-button";

const initial = { ok: false, message: "", inviteCode: "" };

export function ReissueInviteButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [state, action, pending] = useActionState(reissueInviteAction, initial);

  if (state.inviteCode)
    return (
      <div className="text-right">
        <code className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs tracking-wider select-all">
          {state.inviteCode}
        </code>
        <div className="mt-1 flex justify-end">
          <CopyButton value={state.inviteCode} variant="light" label="Copy" />
        </div>
      </div>
    );

  return (
    <form action={action} className="text-right">
      <input type="hidden" name="studentId" value={studentId} />
      <button
        disabled={pending}
        className="text-xs font-medium text-brand-700 transition hover:text-brand-900 disabled:opacity-60"
      >
        {pending ? "Working…" : "New code"}
      </button>
      {state.message && !state.ok && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.message}
        </p>
      )}
      <span className="sr-only">Issue a new invite code for {studentName}</span>
    </form>
  );
}
