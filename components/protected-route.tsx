"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }
    
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (!isFirebaseConfigured()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
