import { v4 as uuidv4 } from "uuid";
import { prisma as db } from "@/lib/db";

export const generateVerificationToken = async (email: string) => {
    const token = uuidv4();
    // Expires in 1 hour
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await db.verificationToken.findFirst({
        where: { identifier: email }
    });

    if (existingToken) {
        await db.verificationToken.deleteMany({
            where: { identifier: email }
        });
    }

    const verificationToken = await db.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires
        }
    });

    return verificationToken;
};

export const generatePasswordResetToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

    const existingToken = await db.password_reset_tokens.findFirst({
        where: { email }
    });

    if (existingToken) {
        await db.password_reset_tokens.delete({
            where: { id: existingToken.id }
        });
    }

    const passwordResetToken = await db.password_reset_tokens.create({
        data: {
            id: uuidv4(),
            email,
            token,
            expires
        }
    });

    return passwordResetToken;
};
