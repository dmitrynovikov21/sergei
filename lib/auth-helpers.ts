/**
 * Auth Helpers for Server Actions
 * 
 * DRY: Centralized authentication check for all server actions.
 * Use requireAuth() instead of manually checking session in every action.
 */

import { auth } from "@/auth"

export interface AuthenticatedUser {
    id: string
    email?: string | null
    name?: string | null
}

/**
 * Require authentication for a server action.
 * Throws an error if user is not authenticated.
 * 
 * @example
 * export async function myAction() {
 *   const user = await requireAuth()
 *   // user.id is guaranteed to exist
 * }
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
    }
}

/**
 * Get current user without throwing.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return null
        }

        return {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
        }
    } catch {
        return null
    }
}
