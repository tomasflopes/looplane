import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteClassButton } from "@/components/admin/delete-class-button";
import { MembershipControls } from "@/components/admin/membership-controls";
import { listClasses, listStudents } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminClassDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = (await params).id;
  const [classes, students] = await Promise.all([
    listClasses(),
    listStudents(),
  ]);
  const target = classes.find((c) => c.id === id);
  if (!target) notFound();

  const members = students
    .filter((s) => target.memberIds.includes(s.id))
    .map((s) => ({ id: s.id, name: s.name }));
  const candidates = students
    .filter((s) => !target.memberIds.includes(s.id))
    .map((s) => ({ id: s.id, name: s.name }));

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/classes" className="hover:text-slate-800">
          Classes
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-800">{target.name}</span>
      </nav>
      <h2 className="mt-3 text-2xl font-bold tracking-tight">{target.name}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {members.length} member{members.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6">
        <MembershipControls
          classId={target.id}
          className={target.name}
          members={members}
          candidates={candidates}
        />
      </div>

      <DeleteClassButton classId={target.id} className={target.name} />
    </div>
  );
}
