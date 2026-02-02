"use server";

import { prisma as db } from "@/lib/db";

export const newVerification = async (token: string) => {
    const existingToken = await db.verificationToken.findFirst({
        where: { token },
    });

    if (!existingToken) {
        return { error: "Токен не найден или устарел." };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: "Срок действия токена истек." };
    }

    const existingUser = await db.user.findUnique({
        where: { email: existingToken.identifier },
    });

    if (!existingUser) {
        return { error: "Email не найден." };
    }

    await db.user.update({
        where: { id: existingUser.id },
        data: {
            emailVerified: new Date(),
            email: existingToken.identifier, // Update email if it was a change request
        }
    });

    await db.verificationToken.delete({
        where: { token: existingToken.token }
    });

    return { success: "Email успешно подтвержден!" };
};
