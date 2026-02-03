"use server";

import { prisma as db } from "@/lib/db";

export const newVerification = async (token: string) => {
    console.log("[Verification] Starting verification for token:", token.substring(0, 8) + "...");

    const existingToken = await db.verificationToken.findFirst({
        where: { token },
    });

    if (!existingToken) {
        console.log("[Verification] Token not found in DB");
        return { error: "Ссылка устарела. Используйте последнее письмо или запросите новое." };
    }

    console.log("[Verification] Token found for:", existingToken.identifier);

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        console.log("[Verification] Token expired at:", existingToken.expires);
        return { error: "Срок действия токена истек." };
    }

    const existingUser = await db.user.findUnique({
        where: { email: existingToken.identifier },
    });

    if (!existingUser) {
        console.log("[Verification] User not found for email:", existingToken.identifier);
        return { error: "Email не найден." };
    }

    console.log("[Verification] User found:", existingUser.id, existingUser.email);

    try {
        const updatedUser = await db.user.update({
            where: { id: existingUser.id },
            data: {
                emailVerified: new Date(),
                email: existingToken.identifier,
            }
        });
        console.log("[Verification] User updated, emailVerified:", updatedUser.emailVerified);
    } catch (err) {
        console.error("[Verification] ERROR updating user:", err);
        return { error: "Ошибка при подтверждении email. Попробуйте позже." };
    }

    try {
        await db.verificationToken.delete({
            where: { token: existingToken.token }
        });
        console.log("[Verification] Token deleted successfully");
    } catch (err) {
        console.error("[Verification] ERROR deleting token:", err);
        // Don't return error - user is already verified
    }

    return { success: "Email успешно подтвержден!" };
};
