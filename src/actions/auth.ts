"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { clearSession, createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema, signupSchema } from "@/lib/validation";
import { normaliseEmail } from "@/lib/utils";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid login details." };
  }

  const email = normaliseEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return { error: "Invalid email or password." };

  const passwordMatches = await verifyPassword(parsed.data.password, user.password);
  if (!passwordMatches) return { error: "Invalid email or password." };

  await createSession(user);
  redirect("/dashboard");
}

export async function signupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid sign-up details." };
  }

  const email = normaliseEmail(parsed.data.email);
  const password = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        password,
        role: "ADMIN"
      }
    });

    await createSession(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This email is already registered." };
    }
    return { error: "Could not create account. Please try again." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
