"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "@/components/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="careeros-theme">
        <AuthProvider>
          <ErrorBoundary>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "text-sm",
                duration: 4000,
              }}
            />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
