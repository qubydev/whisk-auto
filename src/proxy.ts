import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export function proxy(req: NextRequest) {
    const session = getSessionCookie(req)

    if (!session && req.nextUrl.pathname.startsWith("/index")) {
        return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
}