import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/forgot-password"];
const protectedPaths = ["/dashboard", "/jobs", "/missions", "/resume", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  // Check if it's a protected path
  const isProtectedPath = protectedPaths.some(path => pathname === path || pathname.startsWith(path + "/"));

  if (isProtectedPath) {
    // For protected paths, let the client-side ProtectedRoute handle the auth check
    // This allows us to show loading states and handle auth state properly
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
