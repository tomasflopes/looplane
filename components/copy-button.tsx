"use client";
import { useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";

export function CopyButton({
  value,
  label = "Copy",
  variant = "dark",
}: {
  value: string;
  label?: string;
  variant?: "dark" | "light";
}) {
  const [copied, setCopied] = useState(false);
  const tone =
    variant === "dark"
      ? "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none ${tone}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
