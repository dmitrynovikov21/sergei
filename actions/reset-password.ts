"use server";

import * as z from "zod";
import { prisma as db } from "@/lib/db";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";

const ResetSchema = z.object({
    email: z.string().email({
        message: "Email обязателен",
    }),
});

const NewPasswordSchema = z.object({
    password: z.string().min(8, {
        message: "Минимум 8 символов",
    }),
});

export const resetPassword = async (values: z.infer<typeof ResetSchema>) => {
    const validatedFields = ResetSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Неверный email!" };
    }

    const { email } = validatedFields.data;

    const existingUser = await db.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        return { error: "Мы не нашли аккаунт с таким email. Проверьте адрес или зарегистрируйтесь" };
    }

    const passwordResetToken = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(
        passwordResetToken.email,
        passwordResetToken.token,
    );

    return { success: "Письмо отправлено!" };
};

export const newPassword = async (
    values: z.infer<typeof NewPasswordSchema>,
    token: string | null
) => {
    if (!token) {
        return { error: "Токен не найден!" };
    }

    const validatedFields = NewPasswordSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Неверные данные!" };
    }

    const { password } = validatedFields.data;

    const existingToken = await db.password_reset_tokens.findUnique({
        where: { token },
    });

    if (!existingToken) {
        return { error: "Неверный токен!" };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: "Токен истек!" };
    }

    const existingUser = await db.user.findUnique({
        where: { email: existingToken.email },
    });

    if (!existingUser) {
        return { error: "Пользователь не существует!" };
    }

    const hashedPassword = await hashPassword(password);

    await db.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword },
    });

    await db.password_reset_tokens.delete({
        where: { id: existingToken.id },
    });

    // Send notification email about password change
    if (existingUser.email) {
        await sendPasswordChangedEmail(existingUser.email, existingUser.name || undefined);
    }

    return { success: "Пароль обновлен!" };
};
