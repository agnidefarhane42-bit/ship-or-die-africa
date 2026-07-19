import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware Edge-safe — ne charge PAS @/lib/auth (PrismaAdapter / bcrypt).
 *
 * Stratégie JWT NextAuth v5 : la présence d'un cookie de session suffit
 * pour un gate léger. La vraie vérification (signature JWT, expiration)
 * reste côté Server Components / route handlers via auth().
 *
 * Cookies Auth.js v5 (JWT) :
 *   - authjs.session-token          (dev / non-secure)
 *   - __Secure-authjs.session-token (prod HTTPS)
 *   - variantes chunkées .0, .1, ...
 *   - legacy next-auth.session-token (compat)
 */
function hasSessionCookie(req: NextRequest): boolean {
  const names = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "__Host-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  for (const name of names) {
    if (req.cookies.has(name)) return true;
  }

  // Cookies chunkés (JWT long) : authjs.session-token.0, .1, ...
  for (const cookie of req.cookies.getAll()) {
    if (
      cookie.name.startsWith("authjs.session-token") ||
      cookie.name.startsWith("__Secure-authjs.session-token") ||
      cookie.name.startsWith("next-auth.session-token")
    ) {
      return true;
    }
  }

  return false;
}

export function middleware(req: NextRequest) {
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !hasSessionCookie(req)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
