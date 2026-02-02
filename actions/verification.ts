"use server";

import { prisma as db } from "@/lib/db";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

export async function resendVerificationEmail(email: string) {
    try {
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return { error: "Пользователь не найден" };
        }

        if (user.emailVerified) {
            return { error: "Email уже подтверждён" };
        }

        // Generate new verification token
        const verificationToken = await generateVerificationToken(email.toLowerCase());

        // Send verification email
        await sendVerificationEmail(
            verificationToken.identifier,
            verificationToken.token,
            user.name || undefined
        );

        return { success: true };
    } catch (error) {
        console.error("Failed to resend verification email:", error);
        return { error: "Не удалось отправить письмо. Попробуйте позже." };
    }
}
