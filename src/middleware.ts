import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Everything needs a signed-in person except sign-in and the PIN setup link.
const isPublic = (path: string) => path === "/login" || path.startsWith("/setup/");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL(session.role === "ADMIN" ? "/admin" : "/", req.url));
  }
  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals, icons, the app manifest and menu photos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/|menu/).*)"],
};
