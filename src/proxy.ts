import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "pulse_uid";

// Cookies can only be *set* from middleware, a Server Action, or a Route
// Handler — never from a Server Component render. We assign the anonymous
// user id here, once, so every downstream Server Component and Route
// Handler can just read it (see lib/user.ts).
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  if (existing) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(COOKIE_NAME, crypto.randomUUID(), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
