
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = "dmitrynovikov21@gmail.com";
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log(`User ${email} not found.`);
    } else {
        console.log(`User found:`, user.email);
        console.log(`Name:`, user.name);
        console.log(`Password Hash length:`, user.password ? user.password.length : "NULL");
        console.log(`Password Hash start:`, user.password ? user.password.substring(0, 10) : "NULL");
        console.log(`Email Verified:`, user.emailVerified);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
