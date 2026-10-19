import { ReissueInviteButton } from "@/components/admin/reissue-invite-button";
import { StudentForm } from "@/components/admin/student-form";
import { listClasses, listStudents } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return value.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminStudents() {
  await requireAdmin();
  const [students, classes] = await Promise.all([
    listStudents(),
    listClasses(),
  ]);
  const className = (id: string) => classes.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-8">
      <StudentForm classes={classes.map(({ id, name }) => ({ id, name }))} />

      <section>
        <h2 className="text-xl font-semibold">
          Students{" "}
          <span className="font-mono text-sm font-normal text-slate-500">
            {students.length}
          </span>
        </h2>
        {students.length === 0 ? (
          <div className="card mt-3 p-8 text-center">
            <p className="font-medium text-slate-700">No students yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add the first one with the form above.
            </p>
          </div>
        ) : (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Invite</th>
                  <th className="px-4 py-3 font-medium">Last seen</th>
                  <th className="px-4 py-3 font-medium">Solved</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Invite code</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.classIds.length
                        ? student.classIds
                            .map(className)
                            .filter(Boolean)
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {!student.invitedAt ? (
                        <span className="badge bg-slate-100 text-slate-500">
                          Not issued
                        </span>
                      ) : student.inviteUsedAt ? (
                        <span className="badge bg-emerald-50 text-emerald-700">
                          Redeemed
                        </span>
                      ) : (
                        <span className="badge bg-amber-50 text-amber-700">
                          Not used
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {formatDate(student.lastActiveAt)}
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {student.solvedCount}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {student.attemptsCount}
                    </td>
                    <td className="px-4 py-3">
                      <ReissueInviteButton
                        studentId={student.id}
                        studentName={student.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
