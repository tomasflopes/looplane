import Link from "next/link";

import {
  ArrowRightIcon,
  CheckIcon,
  FlameIcon,
  LockIcon,
  SparkIcon,
} from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChallengeStatuses } from "@/lib/progress";

function streakDays(solvedDates: Date[], now = new Date()) {
  if (!solvedDates.length) return 0;
  const days = new Set(
    solvedDates.map((date) =>
      new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      ).getTime(),
    ),
  );
  let streak = 0;
  const cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // A streak survives until the end of yesterday, so an unsolved today does
  // not immediately reset it.
  if (!days.has(cursor.getTime())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.getTime())) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export default async function Dashboard() {
  const user = await requireUser();
  const themes = await db.theme.findMany({
    include: {
      challenges: {
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        orderBy: { sequence: "asc" },
      },
      interests: { where: { studentId: user.id } },
    },
  });
  const ordered = [...themes].sort(
    (a, b) =>
      Number(Boolean(b.interests.length)) - Number(Boolean(a.interests.length)),
  );

  const versionIds = ordered.flatMap((theme) =>
    theme.challenges
      .map((c) => c.versions[0]?.id)
      .filter((id): id is string => !!id),
  );
  const statuses = await getChallengeStatuses(db, user.id, versionIds);

  const solvedRows = await db.challengeProgress.findMany({
    where: { studentId: user.id, solvedAt: { not: null } },
    select: { challengeVersionId: true, solvedAt: true },
  });
  const solved = solvedRows.length;
  const attempted = await db.challengeProgress.count({
    where: { studentId: user.id },
  });
  const streak = streakDays(
    solvedRows.map((r) => r.solvedAt!).filter(Boolean) as Date[],
  );

  let next: { slug: string; title: string; theme: string } | null = null;
  for (const theme of ordered)
    for (const c of theme.challenges) {
      const v = c.versions[0];
      if (v && statuses.get(v.id)?.kind === "AVAILABLE" && !next)
        next = { slug: c.slug, title: v.title, theme: theme.name };
    }

  const themeStats = ordered.map((theme) => {
    const ids = theme.challenges.map((c) => c.versions[0]?.id).filter(Boolean);
    const done = ids.filter(
      (id) => statuses.get(id as string)?.kind === "SOLVED",
    ).length;
    const total = theme.challenges.length;
    return { theme, done, total };
  });
  const totalChallenges = themeStats.reduce((sum, t) => sum + t.total, 0);
  const overall = totalChallenges
    ? Math.round((solved / totalChallenges) * 100)
    : 0;

  return (
    <>
      <p className="eyebrow">Dashboard</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome back, {user.name}
        </h1>
        <p className="text-sm text-slate-500">
          {solved} of {totalChallenges} challenges solved
        </p>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Solved
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{solved}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Attempted
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{attempted}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Day streak
          </p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums">
            {streak}
            {streak > 0 && <FlameIcon className="h-6 w-6 text-orange-500" />}
          </p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm sm:p-8">
        {next ? (
          <>
            <p className="font-mono text-xs tracking-[0.18em] text-brand-300 uppercase">
              Up next
            </p>
            <p className="mt-3 text-sm text-slate-300">{next.theme}</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
              {next.title}
            </h2>
            <Link
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 no-underline transition hover:bg-brand-100"
              href={`/challenges/${next.slug}`}
            >
              Start challenge
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <>
            <p className="font-mono text-xs tracking-[0.18em] text-brand-300 uppercase">
              All caught up
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              You have completed every available challenge
            </h2>
            <p className="mt-2 max-w-lg text-sm text-slate-300">
              New challenges are published over time. Check back soon, or
              explore a theme to revisit the solutions you have already
              unlocked.
            </p>
            <Link
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 no-underline transition hover:bg-brand-100"
              href="/themes"
            >
              Browse themes
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        )}
      </section>

      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Themes</h2>
        <span className="font-mono text-sm text-slate-500">
          {overall}% done
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {themeStats.map(({ theme, done, total }) => (
          <Link
            key={theme.id}
            href={`/themes/${theme.slug}`}
            className="card group p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{theme.name}</h3>
              {done > 0 ? (
                <span className="badge bg-emerald-50 text-emerald-700">
                  <CheckIcon className="h-3 w-3" />
                  {done}/{total}
                </span>
              ) : total === 0 ? (
                <span className="badge bg-slate-100 text-slate-500">
                  <LockIcon className="h-3 w-3" />
                  Soon
                </span>
              ) : (
                <span className="badge bg-brand-50 text-brand-700">
                  <SparkIcon className="h-3 w-3" />
                  New
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{theme.description}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
