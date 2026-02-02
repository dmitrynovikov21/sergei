"use server"

import { v4 as uuidv4 } from "uuid"
import { prisma as db } from "@/lib/db"
import { userAuthSchema } from "@/lib/validations/auth"
import * as z from "zod"

export async function registerUser(data: z.infer<typeof userAuthSchema>) {
    const result = userAuthSchema.safeParse(data)

    if (!result.success) {
        return { error: "Неверный формат данных" }
    }

    const { email, name, password } = result.data

    if (!email) {
        return { error: "Email обязателен" }
    }

    if (!password) {
        return { error: "Пароль обязателен" }
    }

    try {
        // Import dynamically to ensure server-side execution context is valid
        const { hashPassword } = await import("@/lib/password")
        const { generateVerificationToken } = await import("@/lib/tokens")
        const { sendVerificationEmail } = await import("@/lib/email")

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        })

        if (existingUser) {
            // User already has an account - they should use login
            return { exists: true }
        }

        const hashedPassword = await hashPassword(password)
        const userId = uuidv4()

        // Create new user with name and password (unverified)
        await db.user.create({
            data: {
                id: userId,
                email: email.toLowerCase(),
                name: name || "User", // Fallback name
                password: hashedPassword,
            }
        })

            // Send verification email in background (fire-and-forget)
            // User gets logged in regardless of email status
            ; (async () => {
                try {
                    const verificationToken = await generateVerificationToken(email.toLowerCase())
                    await sendVerificationEmail(
                        verificationToken.identifier,
                        verificationToken.token,
                        name
                    )
                    console.log(`[Register] Verification email sent to ${email}`)
                } catch (emailError) {
                    // Email failed but user is already created - they can resend later
                    console.error(`[Register] Failed to send verification email to ${email}:`, emailError)
                }
            })()

        return { success: true, verificationRequired: true }
    } catch (error) {
        console.error("Failed to register user:", error)
        return { error: "Не удалось создать аккаунт. Попробуйте позже." }
    }
}

export async function checkUserExists(email: string): Promise<boolean> {
    try {
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        })
        return !!user
    } catch (error) {
        console.error("Failed to check user:", error)
        return false // Fail open - allow login attempt
    }
}
