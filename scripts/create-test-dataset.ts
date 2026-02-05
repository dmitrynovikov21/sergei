import { prisma } from './lib/db';
import { randomUUID } from 'crypto';

async function main() {
    // Get first user for ownership
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No users found');

    // Create test dataset
    const datasetId = randomUUID();
    const dataset = await prisma.dataset.create({
        data: {
            id: datasetId,
            name: 'Parser Test',
            description: 'Тестовый датасет для проверки парсера',
            userId: user.id
        }
    });
    console.log('Created dataset:', dataset.id, dataset.name);

    // Add source 1: ythemark - POSTS only (Sidecar, Image), 2 days
    const source1 = await prisma.trackingSource.create({
        data: {
            id: randomUUID(),
            url: 'https://www.instagram.com/ythemark/',
            username: 'ythemark',
            datasetId: dataset.id,
            contentTypes: 'Sidecar,Image',
            daysLimit: 2,
            fetchLimit: 50,
            minViewsFilter: 0,
            minLikesFilter: 0,
            isActive: true
        }
    });
    console.log('Created source 1:', source1.username, '- POSTS (2 days)');

    // Add source 2: kostenkovru - REELS only (Video), 2 days
    const source2 = await prisma.trackingSource.create({
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
    console.log('Created source 2:', source2.username, '- REELS (2 days)');

    console.log('\n✅ Dataset ready:', dataset.id);
    console.log('Sources:', source1.id, source2.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
