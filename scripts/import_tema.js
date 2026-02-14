const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function go() {
    const datasetId = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';
    const posts = JSON.parse(fs.readFileSync('/tmp/tema_reels.json'));
    console.log('Файл:', posts.length, 'постов');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const filtered = posts.filter(p => p.timestamp && new Date(p.timestamp) >= cutoff);
    console.log('14 дней:', filtered.length);

    let add = 0, skip = 0;
    for (const p of filtered) {
        const sc = p.shortCode || p.id;
        if (!sc) continue;
        try {
            await prisma.contentItem.create({
                data: {
                    id: crypto.randomUUID(),
                    instagramId: p.id || sc,
                    datasetId,
                    contentType: 'Video',
                    sourceUrl: 'https://www.instagram.com/p/' + sc + '/',
                    originalUrl: 'https://www.instagram.com/p/' + sc + '/',
                    coverUrl: p.displayUrl || '',
                    videoUrl: p.videoUrl || '',
                    views: p.videoPlayCount || 0,
                    likes: p.likesCount || 0,
                    comments: p.commentsCount || 0,
                    publishedAt: new Date(p.timestamp),
                    description: (p.caption || '').slice(0, 500)
                }
            });
            add++;
        } catch (e) {
            if (e.code === 'P2002') skip++;
        }
    }
    console.log('Добавлено:', add, 'Пропущено:', skip);
    const total = await prisma.contentItem.count({ where: { datasetId } });
    console.log('ИТОГО:', total);
    await prisma.$disconnect();
}

go().catch(console.error);
