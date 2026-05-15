import Link from "next/link";
import { Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildRoomAllocationOptions, getRoomStatisticsMap } from "@/lib/rooms";
import { RegisterUploadedStudentForm } from "@/components/forms/register-uploaded-student-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const TAKE_LIMIT = 50;

type NewStudentPageSearchParams = {
  q?: string;
  category?: string;
  studentId?: string;
};

function searchLink(studentId: string, q: string, category: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  params.set("studentId", studentId);
  return `/students/new?${params.toString()}`;
}

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<NewStudentPageSearchParams> }) {
  await requireUser();
  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const category = params?.category?.trim() || "";
  const selectedStudentId = params?.studentId || "";

  const where: Prisma.StudentWhereInput = {
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(q
      ? {
          OR: [
            { mobile: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { serialNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { contest: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { venue: { contains: q, mode: "insensitive" } },
            { instituteNameEn: { contains: q, mode: "insensitive" } },
            { upazila: { contains: q, mode: "insensitive" } },
            { district: { contains: q, mode: "insensitive" } },
            { division: { contains: q, mode: "insensitive" } },
            { room: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [students, rooms, categories, selectedStudent] = await Promise.all([
    prisma.student.findMany({
      where,
      take: TAKE_LIMIT,
      orderBy: [{ isRegistered: "asc" }, { updatedAt: "desc" }],
      include: { room: true }
    }),
    prisma.room.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] }),
    prisma.student.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    selectedStudentId
      ? prisma.student.findUnique({ where: { id: selectedStudentId }, include: { room: true } })
      : null
  ]);

  const statsMap = await getRoomStatisticsMap(rooms.map((room) => room.id));
  const roomsWithLiveCounts = rooms.map((room) => ({
    ...room,
    allocatedSeats: statsMap.get(room.id)?.totalRegisteredInRoom ?? room.allocatedSeats
  }));
  const roomOptions = buildRoomAllocationOptions(roomsWithLiveCounts, undefined, selectedStudent?.category, statsMap).map((room) => ({
    ...room,
    stats: statsMap.get(room.id) ?? {
      roomId: room.id,
      capacity: room.capacity,
      totalRegisteredInRoom: 0,
      higherSecondaryCount: 0,
      juniorCount: 0,
      halfCapacity: Math.floor(room.capacity / 2)
    }
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/students" className="text-sm font-semibold text-[var(--primary)]">← Back to students</Link>
          <h1 className="mt-3 text-2xl font-black tracking-tight">Register Student</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Search uploaded student records, select a room, and confirm registration.
          </p>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-[var(--primary)]" /> Find Uploaded Student</CardTitle>
          <CardDescription>Search by serial number, student name, or mobile. Search is case-insensitive. You can also filter by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
            <Input name="q" defaultValue={q} placeholder="Search serial number, name, or mobile, e.g. SN-001 or FAHim" />
            <Select name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.category} value={item.category}>{item.category}</option>
              ))}
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[minmax(760px,1fr)_minmax(560px,0.75fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Matching Uploaded Students</CardTitle>
            <CardDescription>
              Showing compact information only. Click Register/View to see the complete uploaded record.
            </CardDescription>
            <CardDescription>
              {students.length} student(s) shown{students.length === TAKE_LIMIT ? `, limited to first ${TAKE_LIMIT}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)]">No uploaded student found. Super Admin can import students first.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[1120px] table-fixed">
                  <colgroup>
                    <col className="w-[190px]" />
                    <col className="w-[155px]" />
                    <col className="w-[300px]" />
                    <col className="w-[140px]" />
                    <col className="w-[125px]" />
                    <col className="w-[130px]" />
                    <col className="w-[80px]" />
                  </colgroup>
                  <THead>
                    <TR>
                      <TH>Name (EN)</TH>
                      <TH>Serial Number</TH>
                      <TH>Institute</TH>
                      <TH>Mobile</TH>
                      <TH>Category</TH>
                      <TH>Status</TH>
                      <TH className="no-print text-right">Action</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {students.map((student) => (
                      <TR key={student.id}>
                        <TD className="break-words font-semibold">{student.nameEn || <span className="text-sm text-[var(--muted-foreground)]">—</span>}</TD>
                        <TD className="break-words font-semibold">{student.serialNumber || <span className="text-sm text-[var(--muted-foreground)]">—</span>}</TD>
                        <TD className="break-words">{student.instituteNameEn}</TD>
                        <TD className="break-words font-semibold">{student.mobile}</TD>
                        <TD className="break-words align-top leading-5">{student.category}</TD>
                        <TD className="align-top">
                          <div className="flex flex-col items-start gap-1">
                            <Badge className={student.isRegistered ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}>
                              {student.isRegistered ? "Registered" : "Pending"}
                            </Badge>
                            {student.room ? <span className="text-xs font-semibold leading-4 text-[var(--muted-foreground)]">{student.room.name}</span> : null}
                          </div>
                        </TD>
                        <TD className="no-print text-right align-top">
                          <Link href={searchLink(student.id, q, category)} className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--muted)]">
                            {student.isRegistered ? "View" : "Register"}
                          </Link>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 2xl:sticky 2xl:top-6 2xl:self-start">
          <CardHeader>
            <CardTitle>Confirmation</CardTitle>
            <CardDescription>Select a student to view full details and confirm registration.</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <p className="text-sm text-[var(--muted-foreground)]">No student selected.</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Selected Student</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Complete uploaded information is shown here.</p>
                    </div>
                    <Badge className={selectedStudent.isRegistered ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}>
                      {selectedStudent.isRegistered ? "Registered" : "Pending"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-4">
                    <section>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Student identity</p>
                      <div className="grid gap-2">
                        {selectedStudent.nameEn ? <Info label="Name (EN)" value={selectedStudent.nameEn} /> : null}
                        {selectedStudent.serialNumber ? <Info label="Serial Number" value={selectedStudent.serialNumber} /> : null}
                        <Info label="Mobile" value={selectedStudent.mobile} />
                        {selectedStudent.email ? <Info label="Email" value={selectedStudent.email} /> : null}
                      </div>
                    </section>

                    <section>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Contest and institute</p>
                      <div className="grid gap-2">
                        <Info label="Contest" value={selectedStudent.contest} />
                        <Info label="Category" value={selectedStudent.category} />
                        <Info label="Venue" value={selectedStudent.venue} />
                        <Info label="Institute" value={selectedStudent.instituteNameEn} />
                      </div>
                    </section>

                    <section>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Location and registration</p>
                      <div className="grid gap-2">
                        {selectedStudent.upazila ? <Info label="Upazila" value={selectedStudent.upazila} /> : null}
                        {selectedStudent.district ? <Info label="District" value={selectedStudent.district} /> : null}
                        {selectedStudent.division ? <Info label="Division" value={selectedStudent.division} /> : null}
                        <Info label="Status" value={selectedStudent.isRegistered ? "Registered" : "Pending"} />
                        {selectedStudent.room ? <Info label="Room" value={selectedStudent.room.name} /> : null}
                      </div>
                    </section>
                  </div>
                </div>

                {roomOptions.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    No rooms are available. Super Admin must create rooms before student registration.
                  </div>
                ) : (
                  <RegisterUploadedStudentForm student={selectedStudent} rooms={roomOptions} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="break-words font-semibold text-[var(--foreground)]">{value}</span>
    </div>
  );
}
