"use server";

import * as z from "zod";
import { prisma as db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendPasswordChangedEmail } from "@/lib/email";

const ChangePasswordSchema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, {
        message: "Минимум 8 символов",
    }),
    confirmPassword: z.string().min(8, {
        message: "Минимум 8 символов",
    }),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
});

export const changePassword = async (values: z.infer<typeof ChangePasswordSchema>) => {
    try {
        const user = await getCurrentUser();

        if (!user?.id) {
            return { error: "Необходимо авторизоваться!" };
        }

        const validatedFields = ChangePasswordSchema.safeParse(values);

        if (!validatedFields.success) {
            return { error: "Неверные данные!" };
        }

        const { currentPassword, newPassword } = validatedFields.data;

        // Get user with password from DB
        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { id: true, password: true, email: true, name: true }
        });

        if (!dbUser) {
            return { error: "Пользователь не найден!" };
        }

        // If user has existing password, verify current password
        if (dbUser.password) {
            if (!currentPassword) {
                return { error: "Введите текущий пароль!" };
            }

            const isPasswordValid = await verifyPassword(currentPassword, dbUser.password);

            if (!isPasswordValid) {
                return { error: "Неверный текущий пароль!" };
            }
        }

        // Hash and save new password
        const hashedPassword = await hashPassword(newPassword);

        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Send notification email
        if (dbUser.email) {
            await sendPasswordChangedEmail(dbUser.email, dbUser.name || undefined);
        }

        return { success: "Пароль успешно изменён!" };
    } catch (error) {
        console.error('[ChangePassword] Error:', error);
        return { error: "Произошла ошибка при смене пароля" };
    }
};
