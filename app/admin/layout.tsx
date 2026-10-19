import Link from "next/link";

import { requireAdmin } from "@/lib/admin-auth";

const tabs = [
  { href: "/admin/students", label: "Students" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/submissions", label: "Submissions" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Teacher tools
          </h1>
        </div>
        <Link
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
          href="/dashboard"
        >
          Back to the student view
        </Link>
      </div>
      <nav className="mt-5 flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 no-underline transition hover:border-slate-300 hover:text-slate-800"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
