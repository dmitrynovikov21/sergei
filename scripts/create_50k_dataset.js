const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function create50kDataset() {
    const mainDatasetId = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';

    const main = await prisma.dataset.findUnique({ where: { id: mainDatasetId } });
    console.log('Основной датасет:', main.name);

    const count50k = await prisma.contentItem.count({
        where: { datasetId: mainDatasetId, views: { gte: 50000 } }
    });
    console.log('Постов >= 50K просмотров:', count50k);

    // Get stats per source
    const allItems = await prisma.contentItem.findMany({
        where: { datasetId: mainDatasetId },
        select: { sourceUrl: true, views: true }
    });

    const stats = {};
    allItems.forEach(item => {
        let username = 'unknown';
        if (item.sourceUrl) {
            const m = item.sourceUrl.match(/instagram\.com\/([^\/]+)/);
            if (m) username = m[1];
        }
        if (!stats[username]) stats[username] = { total: 0, over50k: 0 };
        stats[username].total++;
        if (item.views >= 50000) stats[username].over50k++;
    });

    console.log('\nСтатистика по конкурентам:');
    Object.entries(stats).sort((a, b) => b[1].total - a[1].total).forEach(([u, s]) => {
        console.log('@' + u + ': всего=' + s.total + ', 50K+=' + s.over50k);
    });

    // Create new dataset
    const newDatasetId = crypto.randomUUID();
    await prisma.dataset.create({
        data: {
            id: newDatasetId,
            name: 'Вирусы 50K+',
            description: 'Отфильтрованный датасет: только контент с 50K+ просмотров. Только эти посты отправляются на AI анализ.',
            userId: main.userId
        }
    });
    console.log('\nСоздан датасет:', newDatasetId);

    // Copy items >= 50k
    const items50k = await prisma.contentItem.findMany({
        where: { datasetId: mainDatasetId, views: { gte: 50000 } }
    });

    let added = 0;
    for (const item of items50k) {
        try {
            await prisma.contentItem.create({
                data: {
                    id: crypto.randomUUID(),
                    instagramId: item.instagramId + '_50k',
                    datasetId: newDatasetId,
                    contentType: item.contentType,
                    sourceUrl: item.sourceUrl,
                    originalUrl: item.originalUrl,
                    coverUrl: item.coverUrl,
                    videoUrl: item.videoUrl,
                    views: item.views,
                    likes: item.likes,
                    comments: item.comments,
                    publishedAt: item.publishedAt,
                    description: item.description,
                    headline: item.headline,
                    transcript: item.transcript,
                    viralityScore: item.viralityScore,
                    isProcessed: item.isProcessed,
                    isApproved: item.isApproved,
                    aiTopic: item.aiTopic,
                    aiSubtopic: item.aiSubtopic,
                    aiHookType: item.aiHookType,
                    aiContentFormula: item.aiContentFormula,
                    aiTags: item.aiTags,
                    aiSuccessReason: item.aiSuccessReason,
                    aiEmotionalTrigger: item.aiEmotionalTrigger,
                    aiTargetAudience: item.aiTargetAudience,
                    aiAnalyzedAt: item.aiAnalyzedAt
                }
            });
            added++;
        } catch (e) {
            if (e.code !== 'P2002') console.error('Error:', e.message);
        }
    }
    console.log('Скопировано постов:', added);

    // Add tracking sources to NEW dataset with 50K filter
    const competitors = [
        { username: 'romanpopular', url: 'https://www.instagram.com/romanpopular/' },
        { username: 'wowviking', url: 'https://www.instagram.com/wowviking/' },
        { username: 'dobfox', url: 'https://www.instagram.com/dobfox/' },
        { username: 'psy.gleb', url: 'https://www.instagram.com/psy.gleb/' },
        { username: 'neiro_gleb', url: 'https://www.instagram.com/neiro_gleb/' },
        { username: 'nina_khodakovskaya', url: 'https://www.instagram.com/nina_khodakovskaya/' },
        { username: 'polishuk01', url: 'https://www.instagram.com/polishuk01/' },
        { username: 'vladimir__hack', url: 'https://www.instagram.com/vladimir__hack/' }
    ];

    for (const c of competitors) {
        const s = stats[c.username] || { total: 0, over50k: 0 };
        await prisma.trackingSource.create({
            data: {
                id: crypto.randomUUID(),
                url: c.url,
                username: c.username,
                datasetId: newDatasetId,
                isActive: true,
                minViewsFilter: 50000,
                fetchLimit: 500,
                daysLimit: 14
            }
        });
        console.log('Источник: @' + c.username + ' (всего: ' + s.total + ', 50K+: ' + s.over50k + ')');
    }

    // Also add sources to MAIN dataset if missing
    for (const c of competitors) {
        const existing = await prisma.trackingSource.findFirst({
            where: { datasetId: mainDatasetId, username: c.username }
        });
        if (!existing) {
            await prisma.trackingSource.create({
                data: {
                    id: crypto.randomUUID(),
                    url: c.url,
                    username: c.username,
                    datasetId: mainDatasetId,
                    isActive: true,
                    minViewsFilter: 0,
                    fetchLimit: 500,
                    daysLimit: 14
                }
            });
            console.log('Добавлен в основной: @' + c.username);
        } else {
            console.log('Уже в основном: @' + c.username);
        }
    }

    console.log('\n=== ГОТОВО ===');
    console.log('Датасет "Вирусы 50K+":', newDatasetId);
    console.log('Постов скопировано:', added, 'из', count50k);

    await prisma.$disconnect();
}

create50kDataset().catch(console.error);
