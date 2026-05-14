import { z } from "zod";

const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Room name is required."),
  capacity: z.coerce.number().int().positive("Capacity must be greater than 0."),
  priority: z.coerce.number().int().positive("Priority must be greater than 0.")
});

export const uploadedStudentSchema = z.object({
  id: z.string().optional(),
  mobile: z.string().trim().min(6, "Mobile number is required.").max(30, "Mobile number is too long."),
  contest: z.string().trim().min(1, "Contest is required."),
  category: z.string().trim().min(1, "Category is required."),
  venue: z.string().trim().min(1, "Venue is required."),
  instituteNameEn: z.string().trim().min(1, "Institute Name (EN) is required."),
  nameEn: z.string().trim().optional(),
  upazila: z.string().trim().optional(),
  division: z.string().trim().optional(),
  district: z.string().trim().optional(),
  serialNumber: z.string().trim().min(1, "Serial Number is required."),
  email: z.preprocess(
    (value) => {
      const text = String(value ?? "").trim();
      return text === "" ? undefined : text;
    },
    z.string().email("Enter a valid email address.").optional()
  ),
  note: z.string().trim().optional()
});

export const registerUploadedStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is missing."),
  roomId: z.string().min(1, "Please select a room."),
  confirmHalfOverride: z.string().optional()
});

// Kept for any legacy imports; new student records use uploadedStudentSchema.
export const studentSchema = uploadedStudentSchema.extend({
  roomId: z.string().optional()
});

export const quizTotalMarksSchema = z.object({
  totalMarks: z.coerce.number().int().positive("Total quiz mark must be greater than 0.").max(1000, "Total quiz mark is too large.")
});

export const quizMarkSchema = z.object({
  studentId: z.string().min(1, "Student ID is missing."),
  quizMark: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return null;
      return value;
    },
    z.coerce.number().int().min(0, "Quiz mark cannot be negative.").nullable()
  )
});

export type StudentInput = z.infer<typeof studentSchema>;
export type UploadedStudentInput = z.infer<typeof uploadedStudentSchema>;
export type RegisterUploadedStudentInput = z.infer<typeof registerUploadedStudentSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type QuizTotalMarksInput = z.infer<typeof quizTotalMarksSchema>;
export type QuizMarkInput = z.infer<typeof quizMarkSchema>;
