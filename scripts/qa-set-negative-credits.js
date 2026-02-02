const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setNegativeBalance() {
    // Find any user for testing
    const users = await prisma.user.findMany({
        take: 3,
        select: { id: true, email: true, credits: true }
    });

    console.log('Available users:', users);

    if (users.length === 0) {
        console.log('No users found');
        await prisma.$disconnect();
        return;
    }

    // Use first user
    const user = users[0];
    console.log('Using user:', user.email, 'Current credits:', user.credits);

    // Set to -1500 credits (below -1000 threshold)
    await prisma.user.update({
        where: { id: user.id },
        data: { credits: -1500 }
    });

    console.log('✅ Updated credits to -1500 (BLOCKED state)');
    console.log('User ID:', user.id);
    await prisma.$disconnect();
}

setNegativeBalance().catch(e => {
    console.error(e);
    prisma.$disconnect();
});
