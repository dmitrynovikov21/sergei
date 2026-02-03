"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function checkEmailVerified(): Promise<boolean> {
    const session = await auth();

    if (!session?.user?.id) {
        return true; // No user = don't show banner
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailVerified: true }
    });

    return !!user?.emailVerified;
}
