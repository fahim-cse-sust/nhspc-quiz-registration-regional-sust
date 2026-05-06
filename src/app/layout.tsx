import type { Metadata } from "next";
import "./globals.css";
import { AppToaster } from "@/components/app-toaster";

export const metadata: Metadata = {
  title: "NHSPC Quiz Registration",
  description: "Student quiz registration system for NHSPC by BCC Govt Regional, Sylhet"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
