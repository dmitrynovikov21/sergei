import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Anti-redirect-loop middleware.
 * 
 * Root Cause: After deploys, stale JWT cookies make NextAuth's internal
 * logic think user is logged in → loop between /login ↔ /dashboard.
 * 
 * Strategy: 
 * 1. NEVER redirect from /login → anywhere in middleware. Login page handles it.
 * 2. Only redirect /dashboard → /login if no session cookie.
 * 3. If loop detected (guard cookie), nuke ALL auth cookies.
 * 
 * This makes loops IMPOSSIBLE because middleware never redirects FROM /login.
 */

const SESSION_COOKIE = "__Secure-cz2.session-token"
const CSRF_COOKIE = "__Host-cz2.csrf-token"
const CALLBACK_COOKIE = "__Secure-cz2.callback-url"
const GUARD_COOKIE = "cz2-loop-guard"

function clearAuthCookies(response: NextResponse) {
    // Must use set() with maxAge:0 and exact flags to clear __Host-/__Secure- cookies
    response.cookies.set(SESSION_COOKIE, "", {
        maxAge: 0, path: "/", httpOnly: true, secure: true, sameSite: "lax"
    })
    response.cookies.set(CSRF_COOKIE, "", {
        maxAge: 0, path: "/", httpOnly: true, secure: true, sameSite: "lax"
    })
    response.cookies.set(CALLBACK_COOKIE, "", {
        maxAge: 0, path: "/", httpOnly: true, secure: true, sameSite: "lax"
    })
    response.cookies.set(GUARD_COOKIE, "", { maxAge: 0, path: "/" })
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const hasSession = request.cookies.has(SESSION_COOKIE)
    const guardVal = request.cookies.get(GUARD_COOKIE)?.value
    const count = guardVal ? parseInt(guardVal, 10) || 0 : 0

    // LOOP DETECTED — clear everything, render /login
    if (count >= 2) {
        console.warn(`[MW] LOOP x${count} on ${pathname} — nuking auth cookies`)

        // If already on login, just render it with cleared cookies
        if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
            const response = NextResponse.next()
            clearAuthCookies(response)
            return response
        }
        // Otherwise redirect to login with cleared cookies
        const response = NextResponse.redirect(new URL("/login", request.url))
        clearAuthCookies(response)
        return response
    }

    // PROTECTED ROUTES: /dashboard/* requires session
    if (pathname.startsWith("/dashboard") && !hasSession) {
        const response = NextResponse.redirect(new URL("/login", request.url))
        response.cookies.set(GUARD_COOKIE, String(count + 1), {
            maxAge: 10, path: "/"
        })
        return response
    }

    // AUTH PAGES: /login, /register — NEVER redirect in middleware!
    // Let the page component handle redirect if user is logged in.
    // This breaks the redirect loop because only ONE direction is handled by middleware.
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
        // Just render the page, clear guard if any
        if (count > 0) {
            const response = NextResponse.next()
            response.cookies.set(GUARD_COOKIE, "", { maxAge: 0, path: "/" })
            return response
        }
        return NextResponse.next()
    }

    // All other routes — pass through, clear guard
    if (count > 0) {
        const response = NextResponse.next()
        response.cookies.set(GUARD_COOKIE, "", { maxAge: 0, path: "/" })
        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
}