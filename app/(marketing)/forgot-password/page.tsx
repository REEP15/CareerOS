"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isFirebaseConfigured()) {
        toast.success("Password reset email sent (demo mode - Firebase not configured).");
        setIsSuccess(true);
        return;
      }
      
      await resetPassword(email);
      toast.success("Password reset email sent. Check your inbox.");
      setIsSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reset email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-primary uppercase mx-auto">
            CareerOS
          </div>
          <CardTitle className="text-2xl font-semibold">Reset your password</CardTitle>
          <CardDescription>
            {isSuccess 
              ? "Check your email for the reset link"
              : "Enter your email to receive a password reset link"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
              {!isFirebaseConfigured() && (
                <p className="text-xs text-center text-muted-foreground">
                  Demo mode - Firebase not configured
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                We&apos;ve sent a password reset link to your email. Please check your inbox and follow the instructions.
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
              >
                Send another email
              </Button>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
