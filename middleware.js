export const runtime = "nodejs";

import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");

    if (authHeader) {
      const encoded = authHeader.split(" ")[1];
      const decoded = atob(encoded);
      const [username, password] = decoded.split(":");

      if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
      ) {
        return NextResponse.next();
      }
    }

    return new NextResponse("Accès refusé", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin — Camp Karaté"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};