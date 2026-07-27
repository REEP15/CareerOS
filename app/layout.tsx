import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS",
  description: "Personal AI career assistant foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>
          <ProtectedRoute>
            <AppShell>{children}</AppShell>
          </ProtectedRoute>
        </Providers>
      </body>
    </html>
  );
}
