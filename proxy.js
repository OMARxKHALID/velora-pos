import { NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export const proxy = (request) => {
  if (getSessionCookie(request)) return NextResponse.next()
  return NextResponse.redirect(new URL("/", request.url))
}

export const config = {
  matcher: ["/dashboard/:path*", "/pos/:path*", "/sales/:path*", "/refunds/:path*", "/products/:path*", "/stock/:path*", "/movements/:path*", "/staff/:path*", "/settings/:path*"],
}
