import Link from "next/link";

import { ClassForm } from "@/components/admin/class-form";
import { listClasses, listStudents } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminClasses() {
  await requireAdmin();
  const [classes, students] = await Promise.all([
    listClasses(),
    listStudents(),
  ]);
  const nameOf = (id: string) =>
    students.find((s) => s.id === id)?.name ?? "Unknown";

  return (
    <div className="space-y-8">
      <ClassForm />

      <section>
        <h2 className="text-xl font-semibold">
          Classes{" "}
          <span className="font-mono text-sm font-normal text-slate-500">
            {classes.length}
          </span>
        </h2>
        {classes.length === 0 ? (
          <div className="card mt-3 p-8 text-center">
            <p className="font-medium text-slate-700">No classes yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create one with the form above, then add students to it.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <Link
                key={c.id}
                href={`/admin/classes/${c.id}`}
                className="card group p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">{c.name}</h3>
                  <span className="badge bg-slate-100 text-slate-600">
                    {c.memberIds.length} student
                    {c.memberIds.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-slate-600">
                  {c.memberIds.length
                    ? c.memberIds.map(nameOf).join(", ")
                    : "No students yet"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
