import { Role } from "@prisma/client";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { StudentImportForm } from "@/components/forms/student-import-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ImportStudentsPage() {
  await requireRole(Role.SUPER_ADMIN);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Import Students</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Upload the official Excel sheet first, then Admin/Super Admin can search and confirm registration. Serial Number is the unique key; mobile numbers can be duplicate.
          </p>
        </div>
        <Link
          href="/students"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          View students
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Excel / CSV</CardTitle>
          <CardDescription>
            Existing students are matched by Mobile and updated. Registration fields like room, registered by, registered at,
            and status are preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentImportForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected columns</CardTitle>
          <CardDescription>The import accepts common spelling variations and different letter cases.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              "No.",
              "Name (EN)",
              "Upazila",
              "Division",
              "District",
              "Serial Number",
              "Email",
              "Mobile",
              "Contest",
              "Category",
              "Venue Name",
              "Institute Name(EN)"
            ].map((column) => (
              <div key={column} className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 font-medium">
                {column}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
