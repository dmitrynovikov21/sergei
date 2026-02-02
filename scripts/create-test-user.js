const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
    const email = 'test_blocked@test.com';
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete if exists
    await prisma.user.deleteMany({ where: { email } });

    // Create user with negative credits
    const user = await prisma.user.create({
        data: {
            email,
            name: 'Test Blocked User',
            password: hashedPassword,
            credits: -1500, // BLOCKED state
            emailVerified: new Date() // Skip email verification
        }
    });

    console.log('✅ Created test user:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Credits:', user.credits);
    console.log('   ID:', user.id);

    await prisma.$disconnect();
}

createTestUser().catch(console.error);
