"use client";

import { useActionState } from "react";
import { updateUploadedStudentAction } from "@/actions/students";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = {};

type UploadedStudentFormData = {
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

export function UploadedStudentForm({ student }: { student: UploadedStudentFormData }) {
  const [state, formAction, pending] = useActionState(updateUploadedStudentAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="id" value={student.id} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Mobile" id="mobile">
          <Input id="mobile" name="mobile" defaultValue={student.mobile} required />
        </Field>
        <Field label="Name (EN)" id="nameEn">
          <Input id="nameEn" name="nameEn" defaultValue={student.nameEn || ""} />
        </Field>
        <Field label="Serial Number" id="serialNumber">
          <Input id="serialNumber" name="serialNumber" defaultValue={student.serialNumber || ""} required />
        </Field>
        <Field label="Email" id="email">
          <Input id="email" name="email" type="email" defaultValue={student.email || ""} />
        </Field>
        <Field label="Contest" id="contest">
          <Input id="contest" name="contest" defaultValue={student.contest} required />
        </Field>
        <Field label="Category" id="category">
          <Input id="category" name="category" defaultValue={student.category} required />
        </Field>
        <Field label="Venue Name" id="venue">
          <Input id="venue" name="venue" defaultValue={student.venue} required />
        </Field>
        <Field label="Institute Name(EN)" id="instituteNameEn">
          <Input id="instituteNameEn" name="instituteNameEn" defaultValue={student.instituteNameEn} required />
        </Field>
        <Field label="Upazila" id="upazila">
          <Input id="upazila" name="upazila" defaultValue={student.upazila || ""} />
        </Field>
        <Field label="District" id="district">
          <Input id="district" name="district" defaultValue={student.district || ""} />
        </Field>
        <Field label="Division" id="division">
          <Input id="division" name="division" defaultValue={student.division || ""} />
        </Field>
      </div>

      <Field label="Optional note" id="note">
        <Textarea id="note" name="note" defaultValue={student.note || ""} placeholder="Any optional note" />
      </Field>

      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Update Student"}</Button>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
