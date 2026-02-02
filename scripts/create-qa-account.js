/**
 * QA Test Account Creation Script
 * Creates a verified test account for automated QA testing
 * 
 * Usage: node scripts/create-qa-account.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// === QA TEST CREDENTIALS ===
const QA_ACCOUNT = {
    email: 'qa@test.local',
    password: 'qatest123',
    name: 'QA Test User'
};

async function createQAAccount() {
    console.log('🔧 Creating QA Test Account...\n');

    const hashedPassword = await bcrypt.hash(QA_ACCOUNT.password, 10);

    // Delete if exists
    const deleted = await prisma.user.deleteMany({
        where: { email: QA_ACCOUNT.email }
    });
    if (deleted.count > 0) {
        console.log('🗑️  Deleted existing QA account');
    }

    // Create verified user with negative credits (BLOCKED state)
    const user = await prisma.user.create({
        data: {
            email: QA_ACCOUNT.email,
            name: QA_ACCOUNT.name,
            password: hashedPassword,
            credits: -1500, // BLOCKED state (threshold is -1000)
            emailVerified: new Date(), // Verified - skip email confirmation
            role: 'USER'
        }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ QA ACCOUNT CREATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', QA_ACCOUNT.email);
    console.log('🔑 Password: ', QA_ACCOUNT.password);
    console.log('💰 Credits:  ', user.credits, '(BLOCKED)');
    console.log('🆔 User ID:  ', user.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await prisma.$disconnect();
    return user;
}

createQAAccount().catch(e => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
    process.exit(1);
});
