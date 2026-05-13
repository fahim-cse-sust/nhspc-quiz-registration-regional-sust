"use client";

import type { RoomAllocationOption } from "@/lib/rooms";
import { UploadedStudentForm } from "@/components/forms/uploaded-student-form";

type StudentFormData = {
  id: string;
  mobile: string;
  contest: string;
  category: string;
  venue: string;
  instituteNameEn: string;
  nameEn: string | null;
  upazila: string | null;
  division: string | null;
  district: string | null;
  serialNumber: string | null;
  email: string | null;
  note: string | null;
};

export function StudentForm({ student }: { mode: "create" | "edit"; rooms: RoomAllocationOption[]; student?: StudentFormData }) {
  if (!student) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Manual student registration has been replaced by Excel import and search-based confirmation.
      </div>
    );
  }

  return <UploadedStudentForm student={student} />;
}
