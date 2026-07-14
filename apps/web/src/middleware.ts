import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for the session indicator cookie
  const hasSession = request.cookies.has("syncspace_has_session");

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboardPage = pathname.startsWith("/dashboard");

  if (isDashboardPage && !hasSession) {
    // Redirect to login page if attempting to access dashboard without a session
    const loginUrl = new URL("/login", request.url);
    // Remember where the user was trying to go
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    // Redirect authenticated users away from login/register to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to auth and dashboard routes
  matcher: ["/login", "/register", "/dashboard/:path*"],
};
