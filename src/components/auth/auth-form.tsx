"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </div>
      ) : null}

      {mode === "signup" ? (
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Admin name" required />
        </div>
      ) : null}

      <div>
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait..." : mode === "login" ? "Log in" : "Create admin account"}
      </Button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? "Need an admin account?" : "Already have an account?"} {" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-semibold text-[var(--primary)]">
          {mode === "login" ? "Sign up" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
