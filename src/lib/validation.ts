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

export const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Student name is required."),
  institution: z.string().trim().min(2, "Institution name is required."),
  className: z.string().trim().min(1, "Class is required."),
  birthCertificateNumber: z
    .string()
    .trim()
    .min(8, "Birth certificate number is too short.")
    .max(30, "Birth certificate number is too long."),
  email: z.string().trim().email("Enter a valid student email."),
  phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, "Enter a valid Bangladesh phone number, for example 01XXXXXXXXX."),
  roomId: z.string().min(1, "Please select a room."),
  note: z.string().trim().optional()
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
export type RoomInput = z.infer<typeof roomSchema>;
export type QuizTotalMarksInput = z.infer<typeof quizTotalMarksSchema>;
export type QuizMarkInput = z.infer<typeof quizMarkSchema>;
