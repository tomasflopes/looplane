import {
  SubmissionsTable,
  type SubmissionRowView,
} from "@/components/admin/submissions-table";
import { listSubmissionRows } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

function formatTimestamp(value: Date | null) {
  if (!value) return "—";
  const sameYear = value.getFullYear() === new Date().getFullYear();
  return value.toLocaleString(undefined, {
    year: sameYear ? undefined : "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function AdminSubmissions() {
  await requireAdmin();
  const rows = await listSubmissionRows();

  const view: SubmissionRowView[] = rows.map((row) => ({
    studentId: row.studentId,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    classNames: row.classNames,
    challengeId: row.challengeId,
    challengeTitle: row.challengeTitle,
    themeName: row.themeName,
    difficulty: row.difficulty,
    status: row.status,
    attempts: row.attempts,
    firstAttemptAt: row.firstAttemptAt?.toISOString() ?? null,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    solvedAt: row.solvedAt?.toISOString() ?? null,
    firstAttemptLabel: formatTimestamp(row.firstAttemptAt),
    lastAttemptLabel: formatTimestamp(row.lastAttemptAt),
    solvedLabel: formatTimestamp(row.solvedAt),
  }));

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Submissions</h2>
        <p className="mt-1 text-sm text-slate-600">
          One row per student per challenge, showing how many tries they had and
          when. Sort by any column.
        </p>
      </div>
      <SubmissionsTable rows={view} />
    </div>
  );
}
