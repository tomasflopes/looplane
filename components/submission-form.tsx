"use client";
import { useActionState, useEffect, useState } from "react";

import { submitAction } from "@/app/actions";

const initial = { ok: false, message: "", solved: false, cooldownSeconds: 0 };

export function SubmissionForm({
  challengeId,
  challengeVersionId,
  attempts = 0,
}: {
  challengeId: string;
  challengeVersionId: string;
  attempts?: number;
}) {
  const [state, action, pending] = useActionState(submitAction, initial);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!state.cooldownSeconds) return;
    setCooldown(state.cooldownSeconds);
    const timer = window.setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.cooldownSeconds, state.message]);

  const blocked = pending || cooldown > 0;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="challengeId" value={challengeId} />
      <input
        type="hidden"
        name="challengeVersionId"
        value={challengeVersionId}
      />
      <label className="block font-medium" htmlFor="answer">
        Your output
      </label>
      <textarea
        required
        id="answer"
        name="answer"
        spellCheck={false}
        placeholder={"Write exactly what your program would print."}
        className="min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={blocked}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Checking…"
            : cooldown > 0
              ? `Wait ${cooldown}s`
              : "Submit answer"}
        </button>
        {attempts > 0 && (
          <span className="font-mono text-xs text-slate-500">
            {attempts} attempt{attempts === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {state.message && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.solved
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : state.ok
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {state.message}
        </p>
      )}
      {attempts < 3 && !state.solved && (
        <p className="text-xs text-slate-500">
          After three attempts you also get a hint about whether your number is
          too high or too low.
        </p>
      )}
    </form>
  );
}
