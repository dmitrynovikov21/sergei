import { NextResponse } from "next/server"

/**
 * Emergency session clear endpoint.
 * When browsers get stuck in a redirect loop (cached state),
 * this endpoint clears ALL auth cookies and redirects to /login.
 * 
 * Usage: https://contentzavod.biz/api/clear-session
 */
export async function GET() {
    const response = NextResponse.redirect(
        new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://contentzavod.biz"),
        { status: 302 }
    )

    // Clear ALL auth cookies with exact flags
    const cookiesToClear = [
        "__Secure-cz2.session-token",
        "__Host-cz2.csrf-token",
        "__Secure-cz2.callback-url",
        "cz2-loop-guard",
    ]

    for (const name of cookiesToClear) {
        response.cookies.set(name, "", {
            maxAge: 0,
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
        })
    }

    // Anti-cache headers
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"')

    return response
}
