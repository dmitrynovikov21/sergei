import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

/**
 * Anti-redirect-loop middleware.
 * 
 * Problem: After deploys, stale JWT cookies make the authorized() callback
 * think the user is logged in → redirects /login → /dashboard → /login (loop).
 * 
 * Solution: Track redirect count via a short-lived cookie. If we detect a loop,
 * clear ALL auth cookies and let the page render fresh.
 */

const AUTH_COOKIE_NAMES = [
    "__Secure-cz2.session-token",
    "__Host-cz2.csrf-token",
    "__Secure-cz2.callback-url",
]

const LOOP_COOKIE = "cz2-redirect-guard"
const MAX_REDIRECTS = 3

export default async function middleware(request: NextRequest) {
    // 1. Check if we're in a redirect loop
    const guardValue = request.cookies.get(LOOP_COOKIE)?.value
    const redirectCount = guardValue ? parseInt(guardValue, 10) : 0

    if (redirectCount >= MAX_REDIRECTS) {
        // LOOP DETECTED — nuclear option: clear all auth cookies and reset
        console.warn("[Middleware] Redirect loop detected — clearing stale auth cookies")
        const response = NextResponse.next()

        // Delete all auth cookies
        for (const name of AUTH_COOKIE_NAMES) {
            response.cookies.delete(name)
        }
        // Reset the guard
        response.cookies.delete(LOOP_COOKIE)

        return response
    }

    // 2. Run the normal auth middleware
    const authMiddleware = auth((req) => {
        const { nextUrl } = req
        const isLoggedIn = !!req.auth?.user
        const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
        const isOnAuth = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register")

        if (isOnDashboard && !isLoggedIn) {
            // Not logged in → send to login
            const loginUrl = new URL("/login", nextUrl)
            const response = NextResponse.redirect(loginUrl)
            response.cookies.set(LOOP_COOKIE, String(redirectCount + 1), {
                maxAge: 10, // Expires in 10 seconds — only catches rapid loops
                path: "/",
            })
            return response
        }

        if (isOnAuth && isLoggedIn) {
            // Already logged in → send to dashboard
            const dashUrl = new URL("/dashboard", nextUrl)
            const response = NextResponse.redirect(dashUrl)
            response.cookies.set(LOOP_COOKIE, String(redirectCount + 1), {
                maxAge: 10,
                path: "/",
            })
            return response
        }

        // No redirect needed — clear the guard cookie if it exists
        const response = NextResponse.next()
        if (redirectCount > 0) {
            response.cookies.delete(LOOP_COOKIE)
        }
        return response
    })

    return authMiddleware(request, {} as any)
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}