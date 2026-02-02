
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "dmitrynovikov21@gmail.com";
    const newPassword = "12345678";

    // 1. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 2. Update the user
    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });

    console.log(`Password for ${email} reset to: ${newPassword}`);

    // 3. Verify immediately
    const user = await prisma.user.findUnique({ where: { email } });
    const isMatch = await bcrypt.compare(newPassword, user?.password || "");

    console.log(`Immediate manual verification match: ${isMatch}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
