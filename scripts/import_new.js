const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function importFile(filename, label) {
    const datasetId = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';
    const posts = JSON.parse(fs.readFileSync(filename));
    console.log(`\n=== ${label} ===`);
    console.log('Файл:', posts.length, 'постов');

    let add = 0, skip = 0;
    for (const p of posts) {
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
    console.log('ИТОГО в датасете:', total);
}

async function main() {
    await importFile('/tmp/romanpopular.json', '@romanpopular');
    await importFile('/tmp/wowviking.json', '@wowviking');
    await prisma.$disconnect();
}

main().catch(console.error);
