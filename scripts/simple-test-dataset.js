const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No users');
    
    const datasetId = randomUUID();
    const dataset = await prisma.dataset.create({
        data: { id: datasetId, name: 'Parser Test', description: 'Тест парсера', userId: user.id }
    });
    console.log('Dataset:', dataset.id, dataset.name);
    
    const s1 = await prisma.trackingSource.create({
        data: {
            id: randomUUID(),
            url: 'https://www.instagram.com/ythemark/',
            username: 'ythemark',
            datasetId: dataset.id,
            contentTypes: 'Sidecar,Image',
            daysLimit: 2,
            fetchLimit: 50,
            minViewsFilter: 0,
            isActive: true
        }
    });
    console.log('Source 1:', s1.username, '- POSTS (Sidecar,Image)');
    
    const s2 = await prisma.trackingSource.create({
        data: {
            id: randomUUID(),
            url: 'https://www.instagram.com/kostenkovru/',
            username: 'kostenkovru',
            datasetId: dataset.id,
            contentTypes: 'Video',
            daysLimit: 2,
            fetchLimit: 50,
            minViewsFilter: 0,
            isActive: true
        }
    });
    console.log('Source 2:', s2.username, '- REELS (Video)');
    console.log('Done! Dataset ID:', dataset.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
