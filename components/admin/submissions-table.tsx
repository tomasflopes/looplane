"use client";
import { useMemo, useState } from "react";

export type SubmissionRowView = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  classNames: string[];
  challengeId: string;
  challengeTitle: string;
  themeName: string;
  difficulty: string;
  status: "solved" | "attempted" | "not-started";
  attempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  solvedAt: string | null;
  firstAttemptLabel: string;
  lastAttemptLabel: string;
  solvedLabel: string;
};

type SortKey =
  | "studentName"
  | "classNames"
  | "themeName"
  | "challengeTitle"
  | "status"
  | "attempts"
  | "firstAttemptAt"
  | "lastAttemptAt"
  | "solvedAt";

const statusLabel: Record<SubmissionRowView["status"], string> = {
  solved: "Solved",
  attempted: "Attempted",
  "not-started": "Not started",
};

const statusStyle: Record<SubmissionRowView["status"], string> = {
  solved: "bg-emerald-50 text-emerald-700",
  attempted: "bg-amber-50 text-amber-700",
  "not-started": "bg-slate-100 text-slate-500",
};

function Header({
  label,
  sortKey,
  active,
  ascending,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  ascending: boolean;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (ascending ? "ascending" : "descending") : "none"}
      className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition hover:text-slate-800 ${
          isActive ? "text-slate-900" : ""
        }`}
      >
        {label}
        <span aria-hidden className={isActive ? "opacity-100" : "opacity-0"}>
          {ascending ? "\u2191" : "\u2193"}
        </span>
      </button>
    </th>
  );
}

export function SubmissionsTable({ rows }: { rows: SubmissionRowView[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("studentName");
  const [ascending, setAscending] = useState(true);
  const [hideInactive, setHideInactive] = useState(true);

  function onSort(key: SortKey) {
    if (key === sortKey) setAscending((value) => !value);
    else {
      setSortKey(key);
      setAscending(true);
    }
  }

  const visible = useMemo(() => {
    const filtered = hideInactive
      ? rows.filter((row) => row.status !== "not-started")
      : rows;
    const direction = ascending ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "attempts") comparison = a.attempts - b.attempts;
      else if (sortKey === "firstAttemptAt")
        comparison =
          (a.firstAttemptAt ? Date.parse(a.firstAttemptAt) : 0) -
          (b.firstAttemptAt ? Date.parse(b.firstAttemptAt) : 0);
      else if (sortKey === "lastAttemptAt")
        comparison =
          (a.lastAttemptAt ? Date.parse(a.lastAttemptAt) : 0) -
          (b.lastAttemptAt ? Date.parse(b.lastAttemptAt) : 0);
      else if (sortKey === "solvedAt")
        comparison =
          (a.solvedAt ? Date.parse(a.solvedAt) : 0) -
          (b.solvedAt ? Date.parse(b.solvedAt) : 0);
      else if (sortKey === "status")
        comparison = a.status.localeCompare(b.status);
      else if (sortKey === "classNames")
        comparison = a.classNames
          .join(", ")
          .localeCompare(b.classNames.join(", "));
      else comparison = String(a[sortKey]).localeCompare(String(b[sortKey]));
      if (comparison === 0)
        comparison = a.challengeTitle.localeCompare(b.challengeTitle);
      return comparison * direction;
    });
  }, [rows, sortKey, ascending, hideInactive]);

  const solvedCount = rows.filter((r) => r.status === "solved").length;
  const attemptedCount = rows.filter((r) => r.status === "attempted").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{solvedCount}</span>{" "}
          solved
          {" · "}
          <span className="font-medium text-slate-900">
            {attemptedCount}
          </span>{" "}
          in progress
          {" · "}
          {rows.length - solvedCount - attemptedCount} not started
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(event) => setHideInactive(event.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Only show students who have started
        </label>
      </div>

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr className="text-xs tracking-wide text-slate-500 uppercase">
              <Header
                label="Student"
                sortKey="studentName"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Class"
                sortKey="classNames"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Challenge"
                sortKey="challengeTitle"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Theme"
                sortKey="themeName"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Status"
                sortKey="status"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Tries"
                sortKey="attempts"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
                align="right"
              />
              <Header
                label="First try"
                sortKey="firstAttemptAt"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Last try"
                sortKey="lastAttemptAt"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
              <Header
                label="Solved at"
                sortKey="solvedAt"
                active={sortKey}
                ascending={ascending}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={`${row.studentId}-${row.challengeId}`}
                className="border-b border-slate-100 last:border-0 hover:bg-stone-50"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-900">
                    {row.studentName}
                  </p>
                  <p className="max-w-44 truncate text-xs text-slate-500">
                    {row.studentEmail}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {row.classNames.length ? row.classNames.join(", ") : "—"}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-800">
                  {row.challengeTitle}
                </td>
                <td className="px-3 py-2.5 text-slate-600">{row.themeName}</td>
                <td className="px-3 py-2.5">
                  <span className={`badge ${statusStyle[row.status]}`}>
                    {statusLabel[row.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                  {row.attempts || "—"}
                </td>
                <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                  {row.firstAttemptLabel}
                </td>
                <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                  {row.lastAttemptLabel}
                </td>
                <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                  {row.solvedLabel}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No activity yet. Untick the filter to see every student.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
