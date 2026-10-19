import { CheckIcon, ClockIcon, LockIcon } from "@/components/icons";
import type { ChallengeStatus } from "@/lib/progress";

export function StatusBadge({ status }: { status?: ChallengeStatus }) {
  if (!status) return null;
  if (status.kind === "SOLVED")
    return (
      <span className="badge bg-emerald-50 text-emerald-700">
        <CheckIcon className="h-3 w-3" />
        Solved
      </span>
    );
  if (status.kind === "AVAILABLE")
    return <span className="badge bg-brand-50 text-brand-700">Available</span>;
  if (status.kind === "LOCKED_NOT_PUBLISHED")
    return (
      <span className="badge bg-amber-50 text-amber-700">
        <ClockIcon className="h-3 w-3" />
        {status.publishedAt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </span>
    );
  return (
    <span className="badge bg-slate-100 text-slate-500">
      <LockIcon className="h-3 w-3" />
      Locked
    </span>
  );
}
